import { NextResponse } from "next/server";
import { z } from "zod";
import {
  StripeApiError,
  StripeConfigError,
  cardFingerprint,
  checkSession,
  retrieveSession
} from "@/lib/stripe";
import { CARD_TYPES } from "@/lib/videoCard/types";
import { resolveCard } from "@/lib/videoCard/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  sessionId: z.string().max(300),
  card: z.object({
    type: z.enum(CARD_TYPES),
    recipientName: z.string().max(200).optional(),
    headline: z.string().max(200).optional(),
    subtitle: z.string().max(400).optional(),
    message: z.string().max(1000).optional(),
    senderName: z.string().max(200).optional(),
    themeColor: z.string().max(20).optional()
  })
});

/**
 * Looks the Checkout session up at Stripe and says what it unlocks.
 * A paid session only unlocks the exact card it was bought for.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  try {
    const session = await retrieveSession(parsed.data.sessionId);
    const result = checkSession(session);
    if (!result.paid) {
      return NextResponse.json({ paid: false, reason: result.reason }, { status: 402 });
    }
    const card = resolveCard(parsed.data.card);
    const matches = cardFingerprint(card, result.selection) === result.fingerprint;
    if (!matches) {
      return NextResponse.json({ paid: true, matches: false }, { status: 409 });
    }
    return NextResponse.json({
      paid: true,
      matches: true,
      entitlements: result.entitlements
    });
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
    }
    if (error instanceof StripeApiError) {
      const status = error.status === 400 || error.status === 404 ? 400 : 502;
      return NextResponse.json(
        { error: "We could not check that payment." },
        { status }
      );
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
