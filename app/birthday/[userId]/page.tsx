import { notFound } from "next/navigation";
import { hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";
import { BirthdayBridge } from "./BirthdayBridge";

export default async function BirthdayPage({
  params
}: {
  params: { userId: string };
}) {
  if (!hasDatabaseUrl()) {
    notFound();
  }

  const page = await prisma.birthdayPage.update({
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
  }).catch(() => null);

  if (!page || page.soft_delete || page.user.soft_delete) {
    notFound();
  }

  const firebaseUser = await getCurrentFirebaseUser();
  const isOwner = Boolean(
    firebaseUser?.uid && page.user.firebaseUid === firebaseUser.uid
  );

  const [contributions, guestbook, gifts] = await Promise.all([
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
  ]);

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
        isLocked: page.isLocked,
        isPublic: page.isPublic,
        viewCount: page.viewCount,
        isOwner
      }}
      surprise={
        page.surprise
          ? {
              script_text: page.surprise.script_text,
              audio_url: page.surprise.audio_url,
              video_url: page.surprise.video_url,
              status: page.surprise.status
            }
          : null
      }
      user={{
        name: page.user.name,
        birthday_mm_dd: page.user.birthday_mm_dd
      }}
    />
  );
}
