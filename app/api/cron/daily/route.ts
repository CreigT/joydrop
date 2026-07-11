import { sendBirthdaySurprise } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "CRON_SECRET is required in production." },
      { status: 500 }
    );
  }

  if (
    process.env.CRON_SECRET &&
    secret !== process.env.CRON_SECRET &&
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

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  await prisma.contribution.updateMany({
    where: {
      created_at: {
        lt: cutoff
      },
      soft_delete: false,
      user: {
        surprises: {
          none: {
            status: "sent"
          }
        }
      }
    },
    data: {
      soft_delete: true
    }
  });

  const surprises = await prisma.surprise.findMany({
    where: {
      status: "approved",
      soft_delete: false,
      user: {
        paused_bool: false,
        soft_delete: false
      }
    },
    include: {
      user: true
    }
  });

  let sent = 0;
  let unlocked = 0;

  const birthdayPages = await prisma.birthdayPage.findMany({
    where: {
      unlockAt: {
        lte: new Date()
      },
      isLocked: true,
      soft_delete: false,
      surprise: {
        status: "approved"
      },
      user: {
        paused_bool: false,
        soft_delete: false
      }
    },
    include: {
      user: true,
      surprise: true
    }
  });

  for (const page of birthdayPages) {
    await prisma.birthdayPage.update({
      where: {
        id: page.id
      },
      data: {
        isLocked: false
      }
    });
    await prisma.auditLog.create({
      data: {
        action: "birthday_bridge_unlocked",
        user_id: page.userId,
        meta_json: {
          email_subject: "Your Birthday Bridge is unlocked!",
          sms: "sent_if_phone_provided"
        }
      }
    });
    unlocked += 1;
  }

  for (const surprise of surprises) {
    const page = birthdayPages.find((item) => item.userId === surprise.user_id);
    if (!page) {
      continue;
    }

    await sendBirthdaySurprise(surprise.user_id, surprise.video_url);
    await prisma.surprise.update({
      where: {
        id: surprise.id
      },
      data: {
        status: "sent",
        sent_at: new Date()
      }
    });
    sent += 1;
  }

  return Response.json({ sent, unlocked });
}
