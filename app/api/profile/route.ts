import { parseProfileForm } from "@/lib/dashboard";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { birthdayUnlockDate } from "@/lib/dates";
import { seeOther, wantsHtml } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

/** Signed-in user edits their own display name and birthday. */
export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const html = wantsHtml(request);
  const back = (notice: string, status: number) =>
    html ? seeOther(request, `/dashboard?notice=${notice}`) : Response.json({ notice }, { status });

  const formData = await request.formData().catch(() => null);
  const parsed = parseProfileForm({
    name: formData?.get("name") ?? null,
    month: formData?.get("month") ?? null,
    day: formData?.get("day") ?? null
  });
  if (!parsed.ok) {
    return back(`profile_${parsed.error}`, 400);
  }

  // Only the caller's own, not-erased account.
  const user = await prisma.user.findFirst({
    where: { firebaseUid: session.uid, soft_delete: false },
    include: { birthday_page: true }
  });
  if (!user) {
    return back("profile_missing", 404);
  }

  const birthdayChanged = user.birthday_mm_dd !== parsed.value.birthday;
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.value.name, birthday_mm_dd: parsed.value.birthday }
  });

  // Move the unlock date only while the page is still locked; an open page stays open.
  if (birthdayChanged && user.birthday_page && user.birthday_page.isLocked) {
    await prisma.birthdayPage.update({
      where: { id: user.birthday_page.id },
      data: { unlockAt: birthdayUnlockDate(parsed.value.birthday) }
    });
  }

  await prisma.auditLog.create({
    data: { action: "profile_updated", user_id: user.id, meta_json: { birthday_changed: birthdayChanged } }
  });

  return back("profile_saved", 200);
}
