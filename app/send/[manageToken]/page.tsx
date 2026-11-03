import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hashManageToken, isWellFormedToken } from "@/lib/cards";
import { hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";
import { originFromHeaders } from "@/lib/share";
import { ShareButtons } from "../ShareButtons";

export const metadata: Metadata = {
  title: "Send your card | JoyDrop",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

/** Sender's private page: share the card link and delete the card if needed. */
export default async function SendCardPage({ params }: { params: { manageToken: string } }) {
  if (!hasDatabaseUrl() || !isWellFormedToken(params.manageToken, 40)) {
    notFound();
  }

  const card = await prisma.card
    .findUnique({ where: { manageTokenHash: hashManageToken(params.manageToken) } })
    .catch(() => null);

  if (!card || card.status === "deleted") {
    notFound();
  }

  const removed = card.status === "reported";
  const session = await getCurrentFirebaseUser().catch(() => null);
  const onMyDashboard = Boolean(session && card.senderUid === session.uid);
  const origin = requestOrigin();

  return (
    <main className="confetti-dots min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-xl rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-white/80 sm:p-8">
        <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">JoyDrop</p>
        <h1 className="mt-4 font-heading text-3xl font-black text-[#30273A]">
          {removed ? "This card was removed" : "Send it"}
        </h1>
        {removed ? (
          <p className="mt-3 text-sm font-semibold leading-7 text-[#463B52]">
            The birthday person reported this card, so it is no longer shown.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm font-semibold leading-7 text-[#463B52]">
              Your card for {card.recipientName} is ready. Send the link below to {card.recipientName}{" "}
              only: anyone with the link can view the card, starting now.
            </p>
            <div className="mt-6">
              <ShareButtons
                cardPath={`/card/${card.token}`}
                initialOrigin={origin}
                recipientName={card.recipientName}
                senderName={card.senderName}
              />
            </div>
            <div className="mt-6 rounded-2xl bg-bg/70 p-4 text-sm font-semibold text-[#463B52]">
              {onMyDashboard ? (
                <p>
                  This card is on your{" "}
                  <a className="font-black underline" href="/dashboard">
                    dashboard
                  </a>
                  .
                </p>
              ) : session && !card.senderUid ? (
                <form action="/api/cards/manage" method="post">
                  <input name="manage_token" type="hidden" value={params.manageToken} />
                  <input name="action" type="hidden" value="attach" />
                  <p>Keep this card on your dashboard so you can find its link later.</p>
                  <button
                    className="mt-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-black text-[#173B3A] shadow"
                    type="submit"
                  >
                    Add to my dashboard
                  </button>
                </form>
              ) : !session ? (
                <p>
                  <a className="font-black underline" href={`/login?next=/send/${params.manageToken}`}>
                    Sign in
                  </a>{" "}
                  to keep this card on your dashboard.
                </p>
              ) : (
                <p>This card is on another account&apos;s dashboard.</p>
              )}
            </div>
            <p className="mt-6 text-xs font-semibold text-[#6A6074]">
              Bookmark this page. It is the only way to delete your card later, and it is private to you.
            </p>
          </>
        )}
        <form action="/api/cards/manage" className="mt-4" method="post">
          <input name="manage_token" type="hidden" value={params.manageToken} />
          <input name="action" type="hidden" value="delete" />
          <button className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#30273A] shadow" type="submit">
            Delete this card
          </button>
        </form>
      </section>
    </main>
  );
}

/** Site origin from the request, so the share links are complete before the page's script loads. */
function requestOrigin() {
  const h = headers();
  return originFromHeaders((name) => h.get(name));
}
