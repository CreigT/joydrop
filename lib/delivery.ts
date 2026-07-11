import { prisma } from "@/lib/prisma";

export async function sendBirthdaySurprise(userId: string, videoUrl: string | null) {
  await prisma.auditLog.create({
    data: {
      action: "send_birthday_surprise",
      user_id: userId,
      meta_json: {
        channel: "email",
        video_url: videoUrl,
        pause_link: `/api/pause?user_id=${userId}`
      }
    }
  });
}
