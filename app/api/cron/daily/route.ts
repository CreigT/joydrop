import { prisma } from "@/lib/prisma";

/**
 * Daily job (Vercel Cron, Bearer CRON_SECRET only):
 * 1. Unlocks Birthday Bridge pages whose unlock time has passed.
 * 2. Marks friend messages that were never approved and are older than
 *    365 days as deleted (data minimisation).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "CRON_SECRET is required in production." },
      { status: 500 }
    );
  }

  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "DATABASE_URL is required to run the daily cron." },
      { status: 503 }
    );
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 365);

  const expired = await prisma.contribution.updateMany({
    where: {
      created_at: { lt: cutoff },
      isApproved: false,
      soft_delete: false
    },
    data: { soft_delete: true }
  });

  const birthdayPages = await prisma.birthdayPage.findMany({
    where: {
      unlockAt: { lte: now },
      isLocked: true,
      soft_delete: false,
      user: {
        paused_bool: false,
        soft_delete: false
      }
    },
    select: { id: true, userId: true }
  });

  let unlocked = 0;
  for (const page of birthdayPages) {
    await prisma.birthdayPage.update({
      where: { id: page.id },
      data: { isLocked: false }
    });
    await prisma.auditLog.create({
      data: {
        action: "birthday_bridge_unlocked",
        user_id: page.userId,
        meta_json: { channel: "birthday_page" }
      }
    });
    unlocked += 1;
  }

  return Response.json({ ok: true, unlocked, expiredUnapproved: expired.count });
}
