import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

/**
 * Signed-in sender deletes a card they sent, from the dashboard.
 * Only cards linked to this login can be found here; anything else is 404.
 */
export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData().catch(() => null);
  const cardId = String(formData?.get("card_id") ?? "");
  const action = String(formData?.get("action") ?? "");

  if (action !== "delete") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  if (String(formData?.get("confirm") ?? "") !== "on") {
    return Response.json({ error: "Tick the box to confirm." }, { status: 400 });
  }
  if (!/^[a-z0-9]{10,40}$/.test(cardId)) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, senderUid: session.uid, status: { not: "deleted" } }
  });
  if (!card) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  await prisma.card.update({
    where: { id: card.id },
    data: { status: "deleted", message: "", mediaUrl: null, mediaType: null }
  });
  await prisma.auditLog.create({ data: { action: "card_deleted_by_sender", meta_json: { card_id: card.id } } });

  return wantsHtml(request) ? seeOther(request, "/dashboard?notice=card_deleted") : Response.json({ ok: true });
}
