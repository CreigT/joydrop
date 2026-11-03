import { hashManageToken, isWellFormedToken } from "@/lib/cards";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";
import { checkRateLimit } from "@/lib/validation";

/**
 * Actions that need the sender's private manage token (from their "Send it" page):
 * - "delete": delete the card.
 * - "attach": a signed-in sender adds a card they made earlier to their dashboard.
 *   Holding the manage token proves they made it. A card already linked to a
 *   different login is refused (409).
 */
export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  if (!checkRateLimit(`card-manage:${clientIp(request)}`)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const manageToken = String(formData?.get("manage_token") ?? "");
  const action = String(formData?.get("action") ?? "");

  if (action !== "delete" && action !== "attach") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  const session = action === "attach" ? await getCurrentFirebaseUser() : null;
  if (action === "attach" && !session) {
    return Response.json({ error: "Sign in to add this card to your dashboard." }, { status: 401 });
  }

  if (!isWellFormedToken(manageToken, 40)) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  const card = await prisma.card.findUnique({ where: { manageTokenHash: hashManageToken(manageToken) } });
  if (!card || card.status === "deleted") {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  if (action === "attach" && session) {
    if (card.senderUid && card.senderUid !== session.uid) {
      return Response.json({ error: "This card is already on another account's dashboard." }, { status: 409 });
    }
    if (!card.senderUid) {
      await prisma.card.update({ where: { id: card.id }, data: { senderUid: session.uid } });
      await prisma.auditLog.create({ data: { action: "card_attached_to_sender", meta_json: { card_id: card.id } } });
    }
    return wantsHtml(request) ? seeOther(request, "/dashboard?notice=card_added") : Response.json({ ok: true });
  }

  await prisma.card.update({
    where: { id: card.id },
    data: { status: "deleted", message: "", mediaUrl: null, mediaType: null }
  });
  await prisma.auditLog.create({ data: { action: "card_deleted_by_sender", meta_json: { card_id: card.id } } });

  return wantsHtml(request) ? seeOther(request, "/card/removed") : Response.json({ ok: true });
}
