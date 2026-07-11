import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } }
) {
  const page = await prisma.birthdayPage
    .update({
      where: {
        userId: params.userId
      },
      data: {
        viewCount: {
          increment: 1
        }
      },
      include: {
        user: true,
        surprise: true
      }
    })
    .catch(() => null);

  if (!page || page.soft_delete || page.user.soft_delete) {
    return Response.json({ error: "Birthday page not found." }, { status: 404 });
  }

  const [contributions, guestbook, gifts] = await Promise.all([
    prisma.contribution.findMany({
      where: {
        user_id: page.userId,
        isApproved: true,
        soft_delete: false
      }
    }),
    prisma.guestbookEntry.findMany({
      where: {
        user_id: page.userId,
        soft_delete: false
      }
    }),
    prisma.gift.findMany({
      where: {
        user_id: page.userId,
        soft_delete: false
      }
    })
  ]);

  return Response.json({
    page,
    contributions,
    guestbook,
    gifts
  });
}
