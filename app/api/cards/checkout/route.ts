import { NextResponse } from "next/server";
import { z } from "zod";
import { calculatePrice } from "@/lib/pricing";
import {
  StripeApiError,
  StripeConfigError,
  cardFingerprint,
  createCheckoutSession,
  getAppUrl
} from "@/lib/stripe";
import { CARD_TYPES } from "@/lib/videoCard/types";
import { isCardReady, resolveCard } from "@/lib/videoCard/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  card: z.object({
    type: z.enum(CARD_TYPES),
    recipientName: z.string().max(200).optional(),
    headline: z.string().max(200).optional(),
    subtitle: z.string().max(400).optional(),
    message: z.string().max(1000).optional(),
    senderName: z.string().max(200).optional(),
    themeColor: z.string().max(20).optional()
  }),
  selection: z.object({
    product: z.string().max(40),
    addOns: z.array(z.string().max(40)).max(10)
  }),
  acceptedTerms: z.literal(true)
});

/**
 * Creates a hosted Stripe Checkout session. The price is ALWAYS calculated
 * here from lib/pricing.ts. Nothing about money is read from the request.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in the card and agree to the terms first." },
      { status: 400 }
    );
  }
  const { card: input, selection: rawSelection } = parsed.data;
  if (!isCardReady(input)) {
    return NextResponse.json(
      { error: "Please enter who the card is for." },
      { status: 400 }
    );
  }

  try {
    const breakdown = calculatePrice(rawSelection);
    const card = resolveCard(input);
    const session = await createCheckoutSession(breakdown, {
      appUrl: getAppUrl(request.url),
      fingerprint: cardFingerprint(card, breakdown.selection)
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json(
        { error: "Payments are not switched on yet. You can still preview your card for free." },
        { status: 503 }
      );
    }
    if (error instanceof StripeApiError) {
      return NextResponse.json(
        { error: "We could not start checkout. Please try again in a moment." },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
