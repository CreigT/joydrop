import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPageOpen } from "@/lib/birthday-page";
import { hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";
import { BirthdayBridge } from "./BirthdayBridge";

export async function generateMetadata({
  params
}: {
  params: { userId: string };
}): Promise<Metadata> {
  // Pages stay out of search engines unless the owner turns on "Allow search engines".
  if (!hasDatabaseUrl()) {
    return { robots: { index: false, follow: false } };
  }
  const page = await prisma.birthdayPage
    .findUnique({ where: { userId: params.userId } })
    .catch(() => null);
  const indexable = Boolean(page?.isPublic && !page.soft_delete);
  return { robots: { index: indexable, follow: indexable } };
}

export default async function BirthdayPage({
  params
}: {
  params: { userId: string };
}) {
  if (!hasDatabaseUrl()) {
    notFound();
  }

  const page = await prisma.birthdayPage
    .findUnique({
      where: {
        userId: params.userId
      },
      include: {
        user: true
      }
    })
    .catch(() => null);

  if (!page || page.user.soft_delete) {
    notFound();
  }

  const firebaseUser = await getCurrentFirebaseUser();
  const isOwner = Boolean(
    firebaseUser?.uid && page.user.firebaseUid === firebaseUser.uid
  );

  // A paused (hidden) page is only visible to its owner.
  if (page.soft_delete && !isOwner) {
    notFound();
  }

  if (!isOwner) {
    await prisma.birthdayPage
      .update({ where: { id: page.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);
  }

  // Before the unlock time, nobody (including the owner) receives the page content.
  const open = isPageOpen(page);

  const [contributions, guestbook, gifts] = open ? await Promise.all([
    prisma.contribution.findMany({
      where: {
        user_id: page.userId,
        isApproved: true,
        soft_delete: false
      },
      orderBy: {
        created_at: "desc"
      }
    }),
    prisma.guestbookEntry.findMany({
      where: {
        user_id: page.userId,
        soft_delete: false
      },
      orderBy: {
        created_at: "desc"
      }
    }),
    prisma.gift.findMany({
      where: {
        user_id: page.userId,
        soft_delete: false
      },
      orderBy: {
        created_at: "desc"
      }
    })
  ]) : [[], [], []];

  return (
    <BirthdayBridge
      contributions={contributions.map((contribution) => ({
        id: contribution.id,
        contributor_name: contribution.contributor_name,
        message_text: contribution.message_text,
        voice_url: contribution.voice_url,
        photo_url: contribution.photo_url,
        type: contribution.type,
        fileUrl: contribution.fileUrl,
        thumbnailUrl: contribution.thumbnailUrl,
        created_at: contribution.created_at.toISOString()
      }))}
      gifts={gifts.map((gift) => ({
        id: gift.id,
        from_name: gift.from_name,
        title: gift.title,
        amount: gift.amount,
        goal: gift.goal
      }))}
      guestbook={guestbook.map((entry) => ({
        id: entry.id,
        name: entry.name,
        message: entry.message,
        created_at: entry.created_at.toISOString()
      }))}
      page={{
        id: page.id,
        userId: page.userId,
        unlockAt: page.unlockAt.toISOString(),
        isLocked: !open,
        isPublic: page.isPublic,
        isHidden: page.soft_delete,
        viewCount: page.viewCount,
        isOwner
      }}
      user={{
        name: page.user.name,
        birthday_mm_dd: page.user.birthday_mm_dd
      }}
    />
  );
}
