import { cardActionAllowed, isWellFormedToken } from "@/lib/cards";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/validation";

const NEXT_STATUS: Record<string, string | undefined> = {
  hide: "hidden",
  show: "active",
  delete: "deleted",
  report: "reported"
};

/** Birthday person's controls on a card: hide, show, delete, report, or claim. */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  if (!checkRateLimit(`card-action:${clientIp(request)}`)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  if (!isWellFormedToken(params.token)) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const action = String(formData?.get("action") ?? "");

  const card = await prisma.card.findUnique({ where: { token: params.token } });
  if (!card) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  const session = await getCurrentFirebaseUser();
  const allowed = cardActionAllowed(card, action, session?.uid ?? null);
  if (!allowed.ok) {
    const messages: Record<number, string> = {
      400: "Unknown action.",
      401: "Sign in first.",
      403: "Only the person who claimed this card can change it.",
      404: "Card not found.",
      409: "Someone else already claimed this card."
    };
    return Response.json({ error: messages[allowed.status] }, { status: allowed.status });
  }

  if (action === "claim") {
    await prisma.card.update({ where: { id: card.id }, data: { claimedByUid: session!.uid } });
  } else {
    await prisma.card.update({
      where: { id: card.id },
      data: {
        status: NEXT_STATUS[action],
        // Removed cards keep no message or media.
        ...(action === "delete" || action === "report" ? { message: "", mediaUrl: null, mediaType: null } : {})
      }
    });
  }

  await prisma.auditLog.create({
    data: { action: `card_${action}`, meta_json: { card_id: card.id } }
  });

  if (wantsHtml(request)) {
    return seeOther(request, action === "delete" || action === "report" ? "/card/removed" : `/card/${card.token}`);
  }
  return Response.json({ ok: true });
}
