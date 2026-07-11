import { redirect } from "next/navigation";
import { createBirthdayScript, createVoiceAudio } from "@/lib/ai";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { scheduledBirthdayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData();
  const userId = String(formData.get("user_id") ?? "");

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      soft_delete: false
    },
    include: {
      contributions: {
        where: {
          consent_bool: true,
          isApproved: true,
          soft_delete: false
        }
      }
    }
  });

  if (!user) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  const scriptText = await createBirthdayScript(user.name, user.contributions);
  const audioUrl = await createVoiceAudio(scriptText);

  const surprise = await prisma.surprise.create({
    data: {
      user_id: user.id,
      script_text: scriptText,
      audio_url: audioUrl,
      video_url: null,
      status: "approved",
      scheduled_for: scheduledBirthdayDate(user.birthday_mm_dd)
    }
  });

  await prisma.birthdayPage.updateMany({
    where: {
      userId: user.id
    },
    data: {
      surpriseId: surprise.id
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "surprise_generated",
      user_id: user.id,
      meta_json: {
        contribution_count: user.contributions.length
      }
    }
  });

  redirect("/dashboard");
}
