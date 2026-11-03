import { hashManageToken, isWellFormedToken } from "@/lib/cards";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/validation";

/** Sender deletes their own card using the private manage token from their share page. */
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

  if (action !== "delete") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  if (!isWellFormedToken(manageToken, 40)) {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  const card = await prisma.card.findUnique({ where: { manageTokenHash: hashManageToken(manageToken) } });
  if (!card || card.status === "deleted") {
    return Response.json({ error: "Card not found." }, { status: 404 });
  }

  await prisma.card.update({
    where: { id: card.id },
    data: { status: "deleted", message: "", mediaUrl: null, mediaType: null }
  });
  await prisma.auditLog.create({ data: { action: "card_deleted_by_sender", meta_json: { card_id: card.id } } });

  return wantsHtml(request) ? seeOther(request, "/card/removed") : Response.json({ ok: true });
}
