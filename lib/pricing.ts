/**
 * JoyDrop Video Cards - pricing.
 *
 * EVERYTHING you might want to change lives in the PRICING object below.
 * All money amounts are in CENTS (1499 = $14.99).
 *
 * The same file calculates the price on the website (for the breakdown shown
 * to the customer) and on the server (the amount actually charged). The
 * server never trusts a price sent from the browser.
 */

export type ProductId = "video" | "card" | "bundle";
export type AddOnId = "removeWatermark" | "hd" | "extraLength" | "rush";

export type ProductConfig = {
  label: string;
  description: string;
  priceCents: number;
  /** What the customer receives. */
  includesVideo: boolean;
  includesCard: boolean;
};

export type AddOnConfig = {
  /** Set to false to hide the add-on everywhere. */
  enabled: boolean;
  label: string;
  description: string;
  /** Price per product. A missing product means "not offered for it". */
  priceCents: Partial<Record<ProductId, number>>;
  /** true = given free with every purchase (and hidden as a paid option). */
  includedInBase?: boolean;
};

/* ================================================================== */
/*  EDIT PRICES HERE                                                   */
/* ================================================================== */
export const PRICING = {
  currency: "usd",

  products: {
    video: {
      label: "Video card",
      description: "A celebratory vertical video with music (about 14 seconds).",
      priceCents: 1499,
      includesVideo: true,
      includesCard: false
    },
    card: {
      label: "Card (picture)",
      description: "A still picture card, 1080 x 1350 PNG.",
      priceCents: 999,
      includesVideo: false,
      includesCard: true
    },
    bundle: {
      label: "Gift bundle",
      description: "The video card AND the picture card, at a discount.",
      priceCents: 1999,
      includesVideo: true,
      includesCard: true
    }
  } satisfies Record<ProductId, ProductConfig>,

  addOns: {
    removeWatermark: {
      enabled: true,
      label: "Remove watermark",
      description:
        "Takes off the small \"Made with JoyDrop\" badge. (Free previews always have a big watermark.)",
      priceCents: { video: 499, card: 499, bundle: 699 }
    },
    hd: {
      enabled: true,
      label: "HD (1080p)",
      description: "Full 1080p quality. Standard quality is 720p.",
      priceCents: { video: 199, card: 99, bundle: 249 }
    },
    extraLength: {
      enabled: true,
      label: "Extra length (25 seconds)",
      description: "A longer video with more time for your message. Standard is 14 seconds.",
      // Only videos can be longer.
      priceCents: { video: 299, bundle: 299 }
    },
    rush: {
      enabled: false, // OFF by default. Nothing is automated for it yet.
      label: "Rush / priority",
      description: "Priority help if something goes wrong.",
      priceCents: { video: 499, card: 499, bundle: 699 }
    }
  } satisfies Record<AddOnId, AddOnConfig>,

  /** Your own fee, added on top. 0 = no fee. Shown as its own line. */
  serviceFee: {
    percent: 0,
    flatCents: 0,
    label: "Service fee"
  },

  /**
   * Pass Stripe's card fee (about 2.9% + 30c in the US) on to the customer.
   * The amount is grossed up so you receive the full price after Stripe's cut.
   * OFF by default. Check Stripe's current rates and local rules first.
   */
  passThroughStripeFee: {
    enabled: false,
    percent: 2.9,
    flatCents: 30,
    label: "Card processing fee"
  },

  /**
   * Sales tax through Stripe Tax. Needs Stripe Tax turned on and a business
   * address saved in the Stripe Dashboard. When true, tax is calculated by
   * Stripe at checkout and the page says "tax calculated at checkout".
   */
  automaticTax: false,

  /** Stripe cannot charge less than this. */
  minimumChargeCents: 50,

  /** Video lengths in seconds. */
  standardLengthSeconds: 14,
  extraLengthSeconds: 25,

  /** Shown in the refund note. Leave "" to hide. */
  supportEmail: ""
};
/* ================================================================== */

export const PRODUCT_IDS = Object.keys(PRICING.products) as ProductId[];
export const ADD_ON_IDS = Object.keys(PRICING.addOns) as AddOnId[];

export type Selection = {
  product: ProductId;
  addOns: AddOnId[];
};

export type PriceLine = {
  id: string;
  kind: "product" | "addon" | "serviceFee" | "processingFee";
  label: string;
  amountCents: number;
};

export type PriceBreakdown = {
  currency: string;
  selection: Selection;
  lines: PriceLine[];
  /** The product price. */
  subtotalCents: number;
  /** All paid add-ons together. */
  addOnsCents: number;
  serviceFeeCents: number;
  processingFeeCents: number;
  /** Everything above, before tax. */
  totalBeforeTaxCents: number;
  /** null when Stripe calculates it at checkout. */
  taxCents: number | null;
  taxCalculatedAtCheckout: boolean;
  /** Amount charged now when tax is off; otherwise the amount before tax. */
  totalCents: number;
};

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && (PRODUCT_IDS as string[]).includes(value);
}

export function isAddOnId(value: unknown): value is AddOnId {
  return typeof value === "string" && (ADD_ON_IDS as string[]).includes(value);
}

/** Price of an add-on for a product, or null if it is not offered / is free-included. */
export function addOnPriceCents(addOn: AddOnId, product: ProductId): number | null {
  const config: AddOnConfig = PRICING.addOns[addOn];
  if (!config.enabled) return null;
  const price = config.priceCents[product];
  return typeof price === "number" ? price : null;
}

/** Add-ons that can be shown/bought for a product. */
export function availableAddOns(product: ProductId): AddOnId[] {
  return ADD_ON_IDS.filter((id) => {
    const config: AddOnConfig = PRICING.addOns[id];
    return !config.includedInBase && addOnPriceCents(id, product) !== null;
  });
}

/**
 * Cleans anything that came from outside (form, query string, request body).
 * Unknown products fall back to "video"; unknown / unavailable add-ons are dropped.
 */
export function normalizeSelection(raw: {
  product?: unknown;
  addOns?: unknown;
}): Selection {
  const product: ProductId = isProductId(raw.product) ? raw.product : "video";
  const allowed = new Set(availableAddOns(product));
  const requested = Array.isArray(raw.addOns) ? raw.addOns : [];
  const addOns = ADD_ON_IDS.filter(
    (id) => allowed.has(id) && requested.includes(id)
  );
  return { product, addOns };
}

function percentOf(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

export function calculatePrice(input: {
  product?: unknown;
  addOns?: unknown;
}): PriceBreakdown {
  const selection = normalizeSelection(input);
  const product: ProductConfig = PRICING.products[selection.product];
  const lines: PriceLine[] = [
    {
      id: `product:${selection.product}`,
      kind: "product",
      label: product.label,
      amountCents: product.priceCents
    }
  ];

  let addOnsCents = 0;
  for (const id of selection.addOns) {
    const price = addOnPriceCents(id, selection.product) ?? 0;
    addOnsCents += price;
    lines.push({
      id: `addon:${id}`,
      kind: "addon",
      label: PRICING.addOns[id].label,
      amountCents: price
    });
  }

  const subtotalCents = product.priceCents;
  const beforeFees = subtotalCents + addOnsCents;

  const { serviceFee, passThroughStripeFee } = PRICING;
  let serviceFeeCents = 0;
  if (serviceFee.percent > 0 || serviceFee.flatCents > 0) {
    serviceFeeCents = percentOf(beforeFees, serviceFee.percent) + serviceFee.flatCents;
    if (serviceFeeCents > 0) {
      lines.push({
        id: "fee:service",
        kind: "serviceFee",
        label: serviceFee.label,
        amountCents: serviceFeeCents
      });
    }
  }

  const net = beforeFees + serviceFeeCents;
  let processingFeeCents = 0;
  if (passThroughStripeFee.enabled) {
    const rate = passThroughStripeFee.percent / 100;
    const gross = Math.ceil((net + passThroughStripeFee.flatCents) / (1 - rate));
    processingFeeCents = gross - net;
    if (processingFeeCents > 0) {
      lines.push({
        id: "fee:processing",
        kind: "processingFee",
        label: passThroughStripeFee.label,
        amountCents: processingFeeCents
      });
    }
  }

  const totalBeforeTaxCents = net + processingFeeCents;
  if (totalBeforeTaxCents < PRICING.minimumChargeCents) {
    throw new Error("Pricing config error: total is below the minimum charge.");
  }

  const taxCalculatedAtCheckout = PRICING.automaticTax;
  return {
    currency: PRICING.currency,
    selection,
    lines,
    subtotalCents,
    addOnsCents,
    serviceFeeCents,
    processingFeeCents,
    totalBeforeTaxCents,
    taxCents: taxCalculatedAtCheckout ? null : 0,
    taxCalculatedAtCheckout,
    totalCents: totalBeforeTaxCents
  };
}

export type Entitlements = {
  product: ProductId;
  includesVideo: boolean;
  includesCard: boolean;
  /** "badge" = small corner badge, "none" = clean. */
  watermark: "badge" | "none";
  quality: "standard" | "hd";
  videoSeconds: number;
  rush: boolean;
};

/** What a paid selection unlocks. Computed on the server after payment. */
export function entitlementsFor(selection: Selection): Entitlements {
  const product: ProductConfig = PRICING.products[selection.product];
  const has = (id: AddOnId) => {
    const config: AddOnConfig = PRICING.addOns[id];
    return (
      selection.addOns.includes(id) ||
      (config.enabled && Boolean(config.includedInBase))
    );
  };
  return {
    product: selection.product,
    includesVideo: product.includesVideo,
    includesCard: product.includesCard,
    watermark: has("removeWatermark") ? "none" : "badge",
    quality: has("hd") ? "hd" : "standard",
    videoSeconds: has("extraLength")
      ? PRICING.extraLengthSeconds
      : PRICING.standardLengthSeconds,
    rush: selection.addOns.includes("rush")
  };
}

export function formatCents(cents: number, currency: string = PRICING.currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(cents / 100);
}

/** One plain sentence for the refund note. */
export const REFUND_NOTE =
  "Video and picture cards are digital items made on your device. Because the file is delivered right away, all sales are final once a card is unlocked. If the file will not download or play, contact us for a fix or a refund.";
