import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.toLowerCase();

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: {
      email
    },
    include: {
      contributions: true,
      surprises: true,
      audit_logs: true,
      birthday_page: true,
      guestbook: true,
      gifts: true
    }
  });

  if (!user || user.soft_delete) {
    return Response.json({ error: "User not found." }, { status: 404 });
  }

  return Response.json(user);
}
