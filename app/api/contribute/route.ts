import { redirect } from "next/navigation";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { formatBirthday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { uploadContributionFile } from "@/lib/storage";

export async function POST(request: Request) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData();
  const userId = String(formData.get("user_id") ?? "");
  const contributorName = String(formData.get("contributor_name") ?? "").trim();
  const contributorEmail = String(formData.get("contributor_email") ?? "")
    .trim()
    .toLowerCase();
  const messageText = String(formData.get("text_message_field") ?? "").trim();
  const type = String(formData.get("type") ?? "text").trim();
  const consent = formData.get("permission_checkbox") === "on";
  const voiceFile = formData.get("voice_record_button");
  const photoFile = formData.get("upload_photo_optional");
  const videoFile = formData.get("upload_video_optional");
  const gifFile = formData.get("upload_gif_optional");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      soft_delete: false
    }
  });

  if (!user || !contributorName || !contributorEmail || !consent) {
    return Response.json(
      { error: "Missing required contribution fields." },
      { status: 400 }
    );
  }

  const voiceUrl = await uploadContributionFile(
    voiceFile instanceof File ? voiceFile : null,
    user.id,
    "voice"
  );
  const photoUrl = await uploadContributionFile(
    photoFile instanceof File ? photoFile : null,
    user.id,
    "photo"
  );
  const videoUrl = await uploadContributionFile(
    videoFile instanceof File ? videoFile : null,
    user.id,
    "video"
  );
  const gifUrl = await uploadContributionFile(
    gifFile instanceof File ? gifFile : null,
    user.id,
    "gif"
  );
  const fileUrl = videoUrl ?? gifUrl ?? photoUrl ?? voiceUrl;

  await prisma.contribution.create({
    data: {
      user_id: user.id,
      contributor_name: contributorName,
      contributor_email: contributorEmail,
      message_text: messageText || null,
      voice_url: voiceUrl,
      photo_url: photoUrl,
      type,
      fileUrl,
      thumbnailUrl: photoUrl,
      consent_bool: consent
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "contribution_created",
      user_id: user.id,
      meta_json: {
        contributor_email: contributorEmail
      }
    }
  });

  redirect(`/invite/thanks?birthday=${encodeURIComponent(formatBirthday(user.birthday_mm_dd))}`);
}
