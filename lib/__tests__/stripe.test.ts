import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRICING, calculatePrice } from "../pricing";
import {
  SESSION_ID_PATTERN,
  buildCheckoutParams,
  cardFingerprint,
  checkSession,
  signWebhookPayload,
  verifyWebhookSignature
} from "../stripe";
import { resolveCard } from "../videoCard/helpers";

const SECRET = "whsec_test_dummy_value";
const NOW = 1_700_000_000;

function header(payload: string, timestamp = NOW, secret = SECRET) {
  return `t=${timestamp},v1=${signWebhookPayload(payload, secret, timestamp)}`;
}

describe("webhook signatures", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  it("accepts a correct signature", () => {
    assert.equal(verifyWebhookSignature({ payload, header: header(payload), secret: SECRET, nowSeconds: NOW }), true);
  });
  it("rejects a wrong secret, tampered body, missing header and stale timestamp", () => {
    assert.equal(verifyWebhookSignature({ payload, header: header(payload, NOW, "whsec_other"), secret: SECRET, nowSeconds: NOW }), false);
    assert.equal(verifyWebhookSignature({ payload: payload + " ", header: header(payload), secret: SECRET, nowSeconds: NOW }), false);
    assert.equal(verifyWebhookSignature({ payload, header: null, secret: SECRET, nowSeconds: NOW }), false);
    assert.equal(verifyWebhookSignature({ payload, header: header(payload, NOW - 1000), secret: SECRET, nowSeconds: NOW }), false);
    assert.equal(verifyWebhookSignature({ payload, header: "garbage", secret: SECRET, nowSeconds: NOW }), false);
  });
  it("accepts when any of several v1 signatures matches", () => {
    const good = signWebhookPayload(payload, SECRET, NOW);
    const h = `t=${NOW},v1=${"0".repeat(64)},v1=${good}`;
    assert.equal(verifyWebhookSignature({ payload, header: h, secret: SECRET, nowSeconds: NOW }), true);
  });
});

describe("checkout session params", () => {
  const fingerprint = "abc123";
  const get = (params: [string, string][], key: string) => params.find(([k]) => k === key)?.[1];

  it("charges exactly the server-calculated line items", () => {
    const breakdown = calculatePrice({ product: "video", addOns: ["hd"] });
    const params = buildCheckoutParams(breakdown, { appUrl: "https://example.test", fingerprint });
    assert.equal(get(params, "mode"), "payment");
    assert.equal(get(params, "line_items[0][price_data][unit_amount]"), "1499");
    assert.equal(get(params, "line_items[1][price_data][unit_amount]"), "199");
    assert.equal(get(params, "line_items[0][price_data][currency]"), "usd");
    assert.equal(get(params, "metadata[product]"), "video");
    assert.equal(get(params, "metadata[addons]"), "hd");
    assert.equal(get(params, "metadata[fingerprint]"), fingerprint);
    assert.equal(get(params, "success_url"), "https://example.test/cards/success?session_id={CHECKOUT_SESSION_ID}");
    assert.equal(get(params, "cancel_url"), "https://example.test/cards/new?canceled=1");
  });
  it("only turns on automatic tax when configured", () => {
    const breakdown = calculatePrice({ product: "card" });
    const off = buildCheckoutParams(breakdown, { appUrl: "https://x.test", fingerprint });
    assert.equal(get(off, "automatic_tax[enabled]"), undefined);
    const config = PRICING as { automaticTax: boolean };
    config.automaticTax = true;
    try {
      const on = buildCheckoutParams(calculatePrice({ product: "card" }), { appUrl: "https://x.test", fingerprint });
      assert.equal(get(on, "automatic_tax[enabled]"), "true");
      assert.equal(get(on, "line_items[0][price_data][tax_behavior]"), "exclusive");
    } finally {
      config.automaticTax = false;
    }
  });
});

describe("session verification", () => {
  const base = {
    id: "cs_test_a1B2c3D4e5F6g7",
    status: "complete",
    payment_status: "paid",
    metadata: { kind: "joydrop_video_card", product: "bundle", addons: "hd,removeWatermark,bogus", fingerprint: "fp" }
  };
  it("unlocks only paid, complete sessions made by this app", () => {
    const result = checkSession(base);
    assert.equal(result.paid, true);
    if (result.paid) {
      assert.equal(result.entitlements.watermark, "none");
      assert.equal(result.entitlements.quality, "hd");
      assert.deepEqual(result.selection.addOns, ["removeWatermark", "hd"]);
    }
  });
  it("does not unlock unpaid or unfinished sessions", () => {
    assert.deepEqual(checkSession({ ...base, payment_status: "unpaid" }), { paid: false, reason: "unpaid" });
    assert.deepEqual(checkSession({ ...base, status: "open" }), { paid: false, reason: "unpaid" });
  });
  it("ignores sessions that are not from JoyDrop cards", () => {
    assert.deepEqual(checkSession({ ...base, metadata: {} }), { paid: false, reason: "not_ours" });
    assert.deepEqual(checkSession({ ...base, metadata: { kind: "other", fingerprint: "x" } }), { paid: false, reason: "not_ours" });
  });
  it("validates session id shape", () => {
    assert.ok(SESSION_ID_PATTERN.test("cs_test_a1B2c3D4e5F6g7"));
    assert.ok(!SESSION_ID_PATTERN.test("../../etc/passwd"));
    assert.ok(!SESSION_ID_PATTERN.test("pi_123"));
  });
});

describe("card fingerprint", () => {
  const selection = { product: "video" as const, addOns: [] };
  const card = resolveCard({ type: "birthday", recipientName: "Ana", senderName: "Bo" });
  it("is stable and changes when any content changes", () => {
    assert.equal(cardFingerprint(card, selection), cardFingerprint(resolveCard({ type: "birthday", recipientName: "ana", senderName: "Bo" }), selection));
    assert.notEqual(cardFingerprint(card, selection), cardFingerprint(resolveCard({ type: "birthday", recipientName: "Ann", senderName: "Bo" }), selection));
    assert.notEqual(cardFingerprint(card, selection), cardFingerprint(card, { product: "card", addOns: [] }));
  });
});
