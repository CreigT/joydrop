import { CARD_LIMITS, cardMediaKind, hashManageToken, newCardToken, newManageToken } from "@/lib/cards";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther } from "@/lib/http";
import { tooLong } from "@/lib/input";
import { prisma } from "@/lib/prisma";
import { uploadContributionFile } from "@/lib/storage";
import { checkRateLimit, validateContributionFile } from "@/lib/validation";

/**
 * Sender-first flow: anyone can make a birthday card for someone who has not
 * signed up. Returns the sender to a private share page; JoyDrop itself sends
 * no email or text message.
 */
export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  if (!checkRateLimit(`card:${clientIp(request)}`)) {
    return Response.json({ error: "Too many cards. Please try again in a minute." }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return Response.json({ error: "Invalid form." }, { status: 400 });
  }

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const senderName = String(formData.get("sender_name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const consent = formData.get("permission_checkbox") === "on";
  const media = formData.get("media");
  const file = media instanceof File && media.size > 0 ? media : null;

  if (!recipientName || !senderName || !message || !consent) {
    return Response.json(
      { error: "Birthday person's name, your name, a message, and the permission box are required." },
      { status: 400 }
    );
  }

  if (
    tooLong(recipientName, CARD_LIMITS.name) ||
    tooLong(senderName, CARD_LIMITS.name) ||
    tooLong(message, CARD_LIMITS.message)
  ) {
    return Response.json(
      { error: `Names can be up to ${CARD_LIMITS.name} characters and the message up to ${CARD_LIMITS.message}.` },
      { status: 400 }
    );
  }

  let mediaKind: string | null = null;
  if (file) {
    mediaKind = cardMediaKind(file.type);
    const error = mediaKind ? validateContributionFile(file, mediaKind) : "Attach a photo, GIF, video, or voice file.";
    if (error) {
      return Response.json({ error }, { status: 400 });
    }
  }

  const token = newCardToken();
  const manageToken = newManageToken();
  const mediaUrl = file ? await uploadContributionFile(file, `cards/${token}`, mediaKind ?? "file") : null;

  await prisma.card.create({
    data: {
      token,
      manageTokenHash: hashManageToken(manageToken),
      recipientName,
      senderName,
      message,
      mediaUrl,
      mediaType: mediaUrl ? mediaKind : null
    }
  });

  await prisma.auditLog.create({
    data: { action: "card_created", meta_json: { has_media: Boolean(mediaUrl) } }
  });

  return seeOther(request, `/send/${manageToken}`);
}
