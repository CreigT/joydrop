import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) {
    return Response.json({ error: "user_id is required." }, { status: 400 });
  }

  await prisma.user.update({
    where: {
      id: userId
    },
    data: {
      paused_bool: true
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "user_paused",
      user_id: userId
    }
  });

  return Response.json({ paused: true });
}
