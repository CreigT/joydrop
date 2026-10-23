import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  PRICING,
  availableAddOns,
  calculatePrice,
  entitlementsFor,
  formatCents,
  normalizeSelection
} from "../pricing";

type Mutable = {
  serviceFee: { percent: number; flatCents: number; label: string };
  passThroughStripeFee: { enabled: boolean; percent: number; flatCents: number; label: string };
  automaticTax: boolean;
  minimumChargeCents: number;
  addOns: Record<string, { enabled: boolean; includedInBase?: boolean }>;
  products: Record<string, { priceCents: number }>;
};
const config = PRICING as unknown as Mutable;
const original = JSON.parse(JSON.stringify(PRICING)) as Mutable;

afterEach(() => {
  config.serviceFee = { ...original.serviceFee };
  config.passThroughStripeFee = { ...original.passThroughStripeFee };
  config.automaticTax = original.automaticTax;
  config.minimumChargeCents = original.minimumChargeCents;
  for (const id of Object.keys(config.addOns)) {
    config.addOns[id].enabled = original.addOns[id].enabled;
    config.addOns[id].includedInBase = original.addOns[id].includedInBase;
  }
  for (const id of Object.keys(config.products)) {
    config.products[id].priceCents = original.products[id].priceCents;
  }
});

describe("default prices", () => {
  it("video is $14.99, card is $9.99", () => {
    assert.equal(calculatePrice({ product: "video" }).totalCents, 1499);
    assert.equal(calculatePrice({ product: "card" }).totalCents, 999);
  });
  it("the gift bundle is cheaper than buying both", () => {
    const both = calculatePrice({ product: "video" }).totalCents + calculatePrice({ product: "card" }).totalCents;
    const bundle = calculatePrice({ product: "bundle" }).totalCents;
    assert.ok(bundle < both);
  });
  it("by default there are no fees and no tax", () => {
    const price = calculatePrice({ product: "video" });
    assert.equal(price.serviceFeeCents, 0);
    assert.equal(price.processingFeeCents, 0);
    assert.equal(price.taxCents, 0);
    assert.equal(price.taxCalculatedAtCheckout, false);
    assert.deepEqual(price.lines.map((l) => l.kind), ["product"]);
  });
});

describe("subtotal and add-ons", () => {
  it("adds up the selected add-ons", () => {
    const price = calculatePrice({ product: "video", addOns: ["removeWatermark", "hd", "extraLength"] });
    assert.equal(price.subtotalCents, 1499);
    assert.equal(price.addOnsCents, 499 + 199 + 299);
    assert.equal(price.totalCents, 1499 + 499 + 199 + 299);
    assert.equal(price.lines.length, 4);
  });
  it("uses the add-on price for that product", () => {
    assert.equal(calculatePrice({ product: "card", addOns: ["removeWatermark"] }).addOnsCents, 499);
    assert.equal(calculatePrice({ product: "bundle", addOns: ["removeWatermark"] }).addOnsCents, 699);
  });
  it("drops add-ons that are unknown, disabled, duplicated or not offered", () => {
    // extraLength is video-only; rush is disabled by default
    const price = calculatePrice({
      product: "card",
      addOns: ["extraLength", "rush", "bogus", "hd", "hd"]
    });
    assert.deepEqual(price.selection.addOns, ["hd"]);
    assert.equal(price.addOnsCents, 99);
  });
  it("falls back to the video card for an unknown product", () => {
    assert.equal(normalizeSelection({ product: "gold-plated" }).product, "video");
  });
  it("lets a disabled add-on be switched on in config", () => {
    config.addOns.rush.enabled = true;
    assert.ok(availableAddOns("video").includes("rush"));
    assert.equal(calculatePrice({ product: "video", addOns: ["rush"] }).addOnsCents, 499);
  });
  it("hides add-ons that are included in the base price", () => {
    config.addOns.removeWatermark.includedInBase = true;
    assert.ok(!availableAddOns("video").includes("removeWatermark"));
    assert.equal(calculatePrice({ product: "video", addOns: ["removeWatermark"] }).addOnsCents, 0);
    assert.equal(entitlementsFor(normalizeSelection({ product: "video" })).watermark, "none");
  });
  it("reads the product price from config", () => {
    config.products.video.priceCents = 1999;
    assert.equal(calculatePrice({ product: "video" }).totalCents, 1999);
  });
});

describe("service fee and processing fee", () => {
  it("adds a percent service fee as its own line and rounds to the cent", () => {
    config.serviceFee = { percent: 3.5, flatCents: 0, label: "Service fee" };
    const price = calculatePrice({ product: "video", addOns: ["removeWatermark"] }); // 1998
    assert.equal(price.serviceFeeCents, 70); // 69.93 -> 70
    assert.equal(price.totalCents, 1998 + 70);
    assert.equal(price.lines.at(-1)?.label, "Service fee");
  });
  it("supports a flat service fee", () => {
    config.serviceFee = { percent: 0, flatCents: 50, label: "Handling" };
    const price = calculatePrice({ product: "card" });
    assert.equal(price.serviceFeeCents, 50);
    assert.equal(price.totalCents, 1049);
  });
  it("combines percent and flat service fees", () => {
    config.serviceFee = { percent: 2, flatCents: 25, label: "Service fee" };
    assert.equal(calculatePrice({ product: "video" }).serviceFeeCents, 30 + 25); // 29.98 -> 30
  });
  it("passes Stripe's fee through so the seller nets the full price", () => {
    config.passThroughStripeFee.enabled = true;
    const price = calculatePrice({ product: "video" });
    const net = 1499;
    const stripeTakes = Math.round(price.totalCents * 0.029 + 30);
    assert.ok(price.processingFeeCents > 0);
    assert.ok(price.totalCents - stripeTakes >= net - 1, "seller should receive about the full price");
    assert.equal(price.processingFeeCents, 76); // ceil(1529 / 0.971) = 1575
    assert.equal(price.lines.at(-1)?.label, "Card processing fee");
  });
  it("applies the service fee first, then the processing fee on top of it", () => {
    config.serviceFee = { percent: 0, flatCents: 100, label: "Service fee" };
    config.passThroughStripeFee.enabled = true;
    const price = calculatePrice({ product: "card" }); // net 1099
    assert.equal(price.serviceFeeCents, 100);
    assert.equal(price.totalCents, 1099 + price.processingFeeCents);
    assert.equal(price.processingFeeCents, Math.ceil((1099 + 30) / 0.971) - 1099);
  });
});

describe("tax", () => {
  it("tax off: tax is 0 and the total is final", () => {
    const price = calculatePrice({ product: "video" });
    assert.equal(price.taxCents, 0);
    assert.equal(price.taxCalculatedAtCheckout, false);
    assert.equal(price.totalCents, price.totalBeforeTaxCents);
  });
  it("tax on: tax is left to Stripe and flagged for the UI", () => {
    config.automaticTax = true;
    const price = calculatePrice({ product: "video" });
    assert.equal(price.taxCents, null);
    assert.equal(price.taxCalculatedAtCheckout, true);
    assert.equal(price.totalCents, 1499);
  });
});

describe("safety checks", () => {
  it("refuses to charge less than the Stripe minimum", () => {
    config.products.card.priceCents = 10;
    assert.throws(() => calculatePrice({ product: "card" }), /minimum/);
  });
  it("never trusts weird input", () => {
    const price = calculatePrice({ product: { $gt: "" }, addOns: "hd" });
    assert.equal(price.selection.product, "video");
    assert.deepEqual(price.selection.addOns, []);
  });
});

describe("entitlements", () => {
  it("default paid card has a small badge, standard quality and 14 seconds", () => {
    const e = entitlementsFor(normalizeSelection({ product: "video" }));
    assert.deepEqual(
      { w: e.watermark, q: e.quality, s: e.videoSeconds, v: e.includesVideo, c: e.includesCard },
      { w: "badge", q: "standard", s: 14, v: true, c: false }
    );
  });
  it("add-ons unlock the clean, HD, longer version", () => {
    const e = entitlementsFor(
      normalizeSelection({ product: "bundle", addOns: ["removeWatermark", "hd", "extraLength"] })
    );
    assert.equal(e.watermark, "none");
    assert.equal(e.quality, "hd");
    assert.equal(e.videoSeconds, 25);
    assert.ok(e.includesVideo && e.includesCard);
  });
});

describe("formatCents", () => {
  it("formats dollars", () => {
    assert.equal(formatCents(1499), "$14.99");
    assert.equal(formatCents(5), "$0.05");
  });
});
