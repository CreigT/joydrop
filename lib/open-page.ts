import { isPageOpen } from "@/lib/birthday-page";
import { prisma } from "@/lib/prisma";

/**
 * Loads a Birthday Bridge page that visitors may write to: it must exist,
 * not be hidden/deleted, belong to an active account, and be unlocked.
 */
export async function findWritableBirthdayPage(userId: string) {
  if (!userId) return null;
  const page = await prisma.birthdayPage.findUnique({
    where: { userId },
    include: { user: true }
  });
  if (!page || page.soft_delete || page.user.soft_delete || page.user.paused_bool) {
    return null;
  }
  if (!isPageOpen(page)) return null;
  return page;
}
