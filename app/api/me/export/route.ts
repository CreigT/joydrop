import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function GET() {
  const session = await getCurrentFirebaseUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const user = await prisma.user.findFirst({
    where: {
      // Match on the verified Firebase UID only. Matching on email let a
      // different login that claimed the same email read this account.
      firebaseUid: session.uid
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
