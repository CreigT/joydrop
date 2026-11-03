import { prisma } from "@/lib/prisma";

/**
 * Records that an approved surprise was published on the recipient's
 * Birthday Bridge page. JoyDrop does not send email or SMS; delivery means
 * the page unlocks and shows the approved speech.
 */
export async function sendBirthdaySurprise(userId: string, surpriseId: string) {
  await prisma.auditLog.create({
    data: {
      action: "birthday_surprise_published",
      user_id: userId,
      meta_json: {
        channel: "birthday_page",
        surprise_id: surpriseId
      }
    }
  });
}
