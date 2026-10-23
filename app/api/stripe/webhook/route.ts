import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };
  };
};

/**
 * Stripe webhook. The signature is checked against the RAW body.
 *
 * Unlocking does NOT depend on this route: /api/cards/verify asks Stripe
 * directly about the session. The webhook is the place Stripe tells us about
 * payments (including delayed ones), and it is where to add saving orders or
 * sending receipts later. Today it only writes a short log line with no
 * customer details.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const payload = await request.text();
  const ok = verifyWebhookSignature({
    payload,
    header: request.headers.get("stripe-signature"),
    secret
  });
  if (!ok) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const object = event.data?.object;
  const ours = object?.metadata?.kind === "joydrop_video_card";
  if (ours && event.type.startsWith("checkout.session.")) {
    console.info(
      `[joydrop] ${event.type} session=…${(object?.id ?? "").slice(-6)} status=${object?.payment_status ?? "n/a"} amount=${object?.amount_total ?? 0} ${object?.currency ?? ""}`
    );
  }

  return NextResponse.json({ received: true });
}
