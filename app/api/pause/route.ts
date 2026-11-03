import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

/**
 * Pause or resume JoyDrop for the signed-in user's own account.
 * - Requires a valid session (401 otherwise).
 * - A user can only change their own account: if a user_id is sent and it
 *   is not the caller's own id, the request is refused (403).
 * - POST only, so a link or image tag cannot trigger it.
 */
export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData().catch(() => null);
  const requestedUserId = String(formData?.get("user_id") ?? "").trim();
  const resume = String(formData?.get("action") ?? "") === "resume";

  const user = await prisma.user.findFirst({
    where: {
      firebaseUid: session.uid,
      soft_delete: false
    }
  });

  if (!user) {
    return Response.json({ error: "No JoyDrop account found for this login." }, { status: 404 });
  }

  if (requestedUserId && requestedUserId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      paused_bool: !resume
    }
  });

  await prisma.auditLog.create({
    data: {
      action: resume ? "user_resumed" : "user_paused",
      user_id: user.id
    }
  });

  if (wantsHtml(request)) {
    return seeOther(request, "/dashboard");
  }

  return Response.json({ paused: !resume });
}

export function GET() {
  return Response.json(
    { error: "Method not allowed. Pause from your dashboard while signed in." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
