import { isPageOpen } from "@/lib/birthday-page";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";

/**
 * Public read of a Birthday Bridge page. Returns only what a visitor could
 * see on the page itself: no email, login id, or unapproved content, and no
 * messages before the page unlocks.
 */
export async function GET(
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
      user: true
    }
  });

  if (!page || page.soft_delete || page.user.soft_delete) {
    return Response.json({ error: "Birthday page not found." }, { status: 404 });
  }

  const open = isPageOpen(page);
  const summary = {
    name: page.user.name,
    unlockAt: page.unlockAt.toISOString(),
    unlocked: open
  };

  if (!open) {
    return Response.json({ page: summary, contributions: [], guestbook: [], gifts: [] });
  }

  const [contributions, guestbook, gifts] = await Promise.all([
    prisma.contribution.findMany({
      where: { user_id: page.userId, isApproved: true, soft_delete: false },
      select: {
        id: true,
        contributor_name: true,
        message_text: true,
        type: true,
        fileUrl: true,
        photo_url: true,
        voice_url: true,
        created_at: true
      }
    }),
    prisma.guestbookEntry.findMany({
      where: { user_id: page.userId, soft_delete: false },
      select: { id: true, name: true, message: true, created_at: true }
    }),
    prisma.gift.findMany({
      where: { user_id: page.userId, soft_delete: false },
      select: { id: true, from_name: true, title: true, amount: true, goal: true }
    })
  ]);

  return Response.json({ page: summary, contributions, guestbook, gifts });
}
