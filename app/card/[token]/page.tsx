import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MediaView } from "@/components/MediaView";
import { isWellFormedToken } from "@/lib/cards";
import { hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A birthday card | JoyDrop",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer"
};

const smallButton = "rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#30273A] shadow";

/** The birthday person's view of a card. Viewable as soon as the link is opened. */
export default async function CardPage({ params }: { params: { token: string } }) {
  if (!hasDatabaseUrl() || !isWellFormedToken(params.token)) {
    notFound();
  }

  const card = await prisma.card.findUnique({ where: { token: params.token } }).catch(() => null);
  if (!card || card.status === "deleted" || card.status === "reported") {
    notFound();
  }

  const session = await getCurrentFirebaseUser();
  const isClaimer = Boolean(session && card.claimedByUid === session.uid);
  const canManage = !card.claimedByUid || isClaimer;
  const hidden = card.status === "hidden";
  // A hidden card shows its content only to the signed-in person who claimed it.
  const showContent = !hidden || isClaimer;

  if (!hidden) {
    await prisma.card
      .update({ where: { id: card.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);
  }

  const action = `/api/cards/${card.token}`;

  return (
    <main className="confetti-dots min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-2xl">
        <article className="rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-white/80 sm:p-8">
          <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">JoyDrop</p>
          {!showContent ? (
            <>
              <h1 className="mt-4 font-heading text-3xl font-black text-[#30273A]">This card is hidden</h1>
              {canManage ? (
                <p className="mt-3 text-sm font-semibold text-[#463B52]">
                  Use &quot;Show card&quot; below to show it again.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="mt-4 font-heading text-4xl font-black text-[#30273A]">
                Happy Birthday, {card.recipientName}!
              </h1>
              {hidden ? (
                <p className="mt-3 rounded-2xl bg-accent/60 p-3 text-sm font-semibold text-[#30273A]">
                  This card is hidden. Only you can see it, because you claimed it.
                </p>
              ) : null}
              <p className="mt-6 whitespace-pre-wrap text-lg font-semibold leading-8 text-[#30273A]">{card.message}</p>
              <MediaView src={card.mediaUrl} type={card.mediaType ?? ""} />
              <p className="mt-6 text-sm font-black text-[#463B52]">From {card.senderName}</p>
            </>
          )}
        </article>

        <div className="mt-5 rounded-2xl bg-white/80 p-5 text-sm font-semibold leading-7 text-[#463B52] shadow ring-1 ring-white/80">
          <p>
            {card.senderName} made this card on JoyDrop and sent you the link. It can be viewed by anyone
            who has the link, starting as soon as it was created. JoyDrop doesn&apos;t send texts or emails.
          </p>
          {card.claimedByUid ? (
            <p className="mt-2">{isClaimer ? "You claimed this card." : "This card has been claimed."}</p>
          ) : (
            <p className="mt-2">
              Is this card for you? Sign in and claim it to keep it in your JoyDrop account. After you
              claim it, only you can hide or delete it.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {canManage ? (
              <>
                <form action={action} method="post">
                  <input name="action" type="hidden" value={hidden ? "show" : "hide"} />
                  <button className={smallButton} type="submit">
                    {hidden ? "Show card" : "Hide card"}
                  </button>
                </form>
                <form action={action} method="post">
                  <input name="action" type="hidden" value="delete" />
                  <button className={smallButton} type="submit">
                    Delete card
                  </button>
                </form>
              </>
            ) : null}
            {!card.claimedByUid ? (
              session ? (
                <form action={action} method="post">
                  <input name="action" type="hidden" value="claim" />
                  <button className="rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white shadow" type="submit">
                    Claim this card
                  </button>
                </form>
              ) : (
                <a
                  className="rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white shadow"
                  href={`/login?next=/card/${card.token}`}
                >
                  Sign in to claim
                </a>
              )
            ) : null}
            <form action={action} method="post">
              <input name="action" type="hidden" value="report" />
              <button className={smallButton} type="submit">
                Report card
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs">Reporting removes the card for good.</p>
        </div>

        <p className="mt-5 text-center text-sm font-semibold">
          <a className="underline" href="/send">
            Make your own birthday card
          </a>
        </p>
      </section>
    </main>
  );
}
