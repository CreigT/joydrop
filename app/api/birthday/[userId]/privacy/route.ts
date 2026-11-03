import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { seeOther } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

const ACTIONS = ["allow-search", "hide-search", "pause", "resume", "delete"] as const;
type PrivacyAction = (typeof ACTIONS)[number];

/** Page privacy controls. Only the page owner may use them. */
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const firebaseUser = await getCurrentFirebaseUser();

  if (!firebaseUser) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const page = await prisma.birthdayPage.findUnique({
    where: {
      userId: params.userId
    },
    include: {
      user: true
    }
  });

  if (!page || page.user.soft_delete) {
    return Response.json({ error: "Birthday page not found." }, { status: 404 });
  }

  if (page.user.firebaseUid !== firebaseUser.uid) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const action = String(formData?.get("action") ?? "") as PrivacyAction;

  if (!ACTIONS.includes(action)) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  const userId = page.userId;

  if (action === "allow-search" || action === "hide-search") {
    await prisma.birthdayPage.update({
      where: { userId },
      data: { isPublic: action === "allow-search" }
    });
  }

  if (action === "pause" || action === "resume") {
    // "Pause" hides the page from visitors; the owner can still open it and resume.
    await prisma.birthdayPage.update({
      where: { userId },
      data: { soft_delete: action === "pause", ...(action === "pause" ? { isPublic: false } : {}) }
    });
  }

  if (action === "delete") {
    // Soft delete: content is hidden everywhere in the app but the rows stay in the database.
    await prisma.$transaction([
      prisma.contribution.updateMany({ where: { user_id: userId }, data: { soft_delete: true } }),
      prisma.surprise.updateMany({ where: { user_id: userId }, data: { soft_delete: true } }),
      prisma.guestbookEntry.updateMany({ where: { user_id: userId }, data: { soft_delete: true } }),
      prisma.gift.updateMany({ where: { user_id: userId }, data: { soft_delete: true } }),
      prisma.birthdayPage.update({
        where: { userId },
        data: { soft_delete: true, isPublic: false, surpriseId: null }
      })
    ]);
  }

  await prisma.auditLog.create({
    data: { action: `birthday_page_${action.replace("-", "_")}`, user_id: userId }
  });

  return seeOther(request, `/birthday/${userId}`);
}
