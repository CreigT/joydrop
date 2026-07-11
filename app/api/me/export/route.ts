import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function GET() {
  const session = await getCurrentFirebaseUser();
  const email = session?.email?.toLowerCase();

  if (!session || !email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ firebaseUid: session.uid }, { email }]
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
