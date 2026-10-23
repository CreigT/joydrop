/**
 * Minimal Stripe helpers using Stripe's REST API directly (no extra npm
 * packages). SERVER ONLY. Never import this from a client component.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY      sk_test_... (test mode)
 *   STRIPE_WEBHOOK_SECRET  whsec_...   (webhook signing secret)
 *   NEXT_PUBLIC_APP_URL    https://your-site (used for return URLs)
 *
 * Secrets are read from process.env at call time and are never logged.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  PRICING,
  entitlementsFor,
  normalizeSelection,
  type Entitlements,
  type PriceBreakdown,
  type Selection
} from "@/lib/pricing";
import type { ResolvedCard } from "@/lib/videoCard/types";
import { REFUND_NOTE } from "@/lib/pricing";

export const ORDER_KIND = "joydrop_video_card";
const STRIPE_API = "https://api.stripe.com/v1";

export class StripeConfigError extends Error {}
export class StripeApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new StripeConfigError("Payments are not set up yet.");
  }
  // Safety rail: this feature is built for TEST mode until the owner decides otherwise.
  if (key.startsWith("sk_live_") && process.env.STRIPE_ALLOW_LIVE !== "true") {
    throw new StripeConfigError(
      "A live Stripe key was found but live payments are not enabled."
    );
  }
  return key;
}

export function getAppUrl(requestUrl?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (requestUrl) return new URL(requestUrl).origin;
  throw new StripeConfigError("NEXT_PUBLIC_APP_URL is not set.");
}

function form(params: [string, string][]): string {
  return new URLSearchParams(params).toString();
}

async function stripeFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; params?: [string, string][] }
): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      ...(init.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {})
    },
    body: init.method === "POST" ? form(init.params ?? []) : undefined,
    cache: "no-store"
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new StripeApiError(
      data.error?.message ?? "Stripe request failed.",
      response.status
    );
  }
  return data as T;
}

/* ------------------------------------------------------------------ */
/* Card fingerprint: a paid session only unlocks the card it was for   */
/* ------------------------------------------------------------------ */

export function cardFingerprint(card: ResolvedCard, selection: Selection): string {
  const payload = JSON.stringify([
    card.type,
    card.headline,
    card.name,
    card.subtitle,
    card.message,
    card.fromLine,
    card.accentHex,
    selection.product
  ]);
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

/* ------------------------------------------------------------------ */
/* Checkout session                                                    */
/* ------------------------------------------------------------------ */

export function buildCheckoutParams(
  breakdown: PriceBreakdown,
  options: { appUrl: string; fingerprint: string }
): [string, string][] {
  const params: [string, string][] = [
    ["mode", "payment"],
    [
      "success_url",
      `${options.appUrl}/cards/success?session_id={CHECKOUT_SESSION_ID}`
    ],
    ["cancel_url", `${options.appUrl}/cards/new?canceled=1`],
    ["submit_type", "pay"],
    ["metadata[kind]", ORDER_KIND],
    ["metadata[product]", breakdown.selection.product],
    ["metadata[addons]", breakdown.selection.addOns.join(",")],
    ["metadata[fingerprint]", options.fingerprint],
    ["payment_intent_data[description]", "JoyDrop Video Cards"],
    ["payment_intent_data[metadata][kind]", ORDER_KIND],
    ["custom_text[submit][message]", REFUND_NOTE.slice(0, 1000)]
  ];

  breakdown.lines.forEach((line, index) => {
    const prefix = `line_items[${index}]`;
    params.push(
      [`${prefix}[quantity]`, "1"],
      [`${prefix}[price_data][currency]`, breakdown.currency],
      [`${prefix}[price_data][unit_amount]`, String(line.amountCents)],
      [`${prefix}[price_data][product_data][name]`, line.label]
    );
    if (PRICING.automaticTax) {
      params.push([`${prefix}[price_data][tax_behavior]`, "exclusive"]);
    }
  });

  if (PRICING.automaticTax) {
    params.push(["automatic_tax[enabled]", "true"]);
  }
  return params;
}

export async function createCheckoutSession(
  breakdown: PriceBreakdown,
  options: { appUrl: string; fingerprint: string }
): Promise<{ id: string; url: string }> {
  const session = await stripeFetch<{ id: string; url: string | null }>(
    "/checkout/sessions",
    { method: "POST", params: buildCheckoutParams(breakdown, options) }
  );
  if (!session.url) throw new StripeApiError("Stripe did not return a checkout link.", 502);
  return { id: session.id, url: session.url };
}

export type StripeSession = {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  currency?: string | null;
};

export const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export async function retrieveSession(sessionId: string): Promise<StripeSession> {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new StripeApiError("That payment link is not valid.", 400);
  }
  return stripeFetch<StripeSession>(
    `/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { method: "GET" }
  );
}

export type SessionCheck =
  | { paid: false; reason: "unpaid" | "not_ours" }
  | {
      paid: true;
      selection: Selection;
      entitlements: Entitlements;
      fingerprint: string;
    };

/**
 * Decides whether a Stripe session is a real, PAID JoyDrop order and what
 * it unlocks. Everything comes from Stripe, never from the browser.
 */
export function checkSession(session: StripeSession): SessionCheck {
  const meta = session.metadata ?? {};
  if (meta.kind !== ORDER_KIND || !meta.fingerprint) {
    return { paid: false, reason: "not_ours" };
  }
  if (session.status !== "complete" || session.payment_status !== "paid") {
    return { paid: false, reason: "unpaid" };
  }
  const selection = normalizeSelection({
    product: meta.product,
    addOns: (meta.addons ?? "").split(",").filter(Boolean)
  });
  return {
    paid: true,
    selection,
    entitlements: entitlementsFor(selection),
    fingerprint: meta.fingerprint
  };
}

/* ------------------------------------------------------------------ */
/* Webhook signature                                                   */
/* ------------------------------------------------------------------ */

export function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

/** Verifies a `Stripe-Signature` header (t=...,v1=...). */
export function verifyWebhookSignature(options: {
  payload: string;
  header: string | null;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): boolean {
  const { payload, header, secret } = options;
  if (!header || !secret) return false;
  const tolerance = options.toleranceSeconds ?? 300;
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);

  let timestamp = 0;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(now - timestamp) > tolerance) return false;

  const expected = Buffer.from(signWebhookPayload(payload, secret, timestamp), "hex");
  return signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
