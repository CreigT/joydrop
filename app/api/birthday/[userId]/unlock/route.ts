import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const page = await prisma.birthdayPage.findUnique({
    where: {
      userId: params.userId
    },
    include: {
      surprise: true
    }
  });

  if (!page || page.unlockAt > new Date() || page.surprise?.status !== "approved") {
    return Response.json({ unlocked: false });
  }

  await prisma.birthdayPage.update({
    where: {
      userId: params.userId
    },
    data: {
      isLocked: false
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "birthday_page_unlocked",
      user_id: params.userId
    }
  });

  return Response.json({ unlocked: true });
}
