import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CardLinkActions } from "@/components/CardLinkActions";
import { CopyLink } from "@/components/CopyLink";
import { MediaView } from "@/components/MediaView";
import { DASHBOARD_NOTICES, SENT_CARD_LABELS, sentCardState } from "@/lib/dashboard";
import { hasDatabaseUrl } from "@/lib/database";
import { formatBirthday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { displayNameFromToken, getCurrentFirebaseUser } from "@/lib/session";
import { originFromHeaders } from "@/lib/share";

export const dynamic = "force-dynamic";

const panel = "rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:p-6";
const heading = "font-heading text-2xl font-black text-[#30273A]";
const empty = "rounded-2xl bg-bg/70 p-4 text-sm font-semibold leading-6 text-[#463B52]";
const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/20";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { notice?: string };
}) {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  if (!hasDatabaseUrl()) {
    return (
      <main className="min-h-screen bg-bg px-5 py-8">
        <section className={`mx-auto max-w-3xl ${panel}`}>
          <h1 className={heading}>Your dashboard</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-[#463B52]">
            JoyDrop data is temporarily unavailable.
          </p>
        </section>
      </main>
    );
  }

  const [user, sentCards, receivedCards] = await Promise.all([
    prisma.user.findFirst({
      where: { firebaseUid: session.uid, soft_delete: false },
      include: {
        contributions: {
          where: { soft_delete: false, consent_bool: true },
          orderBy: { created_at: "desc" }
        }
      }
    }),
    prisma.card.findMany({
      where: { senderUid: session.uid, status: { not: "deleted" } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.card.findMany({
      where: { claimedByUid: session.uid, status: { in: ["active", "hidden"] } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const h = headers();
  const origin = originFromHeaders((name) => h.get(name));
  const notice = searchParams.notice ? DASHBOARD_NOTICES[searchParams.notice] : undefined;
  const displayName = user?.name ?? displayNameFromToken(session);
  const email = user?.email ?? session.email ?? "";
  const [birthMonth, birthDay] = user ? user.birthday_mm_dd.split("-") : ["", ""];

  return (
    <main className="min-h-screen bg-bg px-4 pb-10 pt-2 sm:px-5">
      <div className="mx-auto max-w-4xl space-y-6">
        {notice ? (
          <p
            className={`rounded-2xl p-4 text-sm font-bold ${
              notice.tone === "ok" ? "bg-secondary/25 text-[#173B3A]" : "bg-primary/10 text-[#8E3154]"
            }`}
            role="status"
          >
            {notice.text}
          </p>
        ) : null}

        {/* Profile */}
        <section aria-labelledby="profile-heading" className={panel}>
          <div className="flex flex-wrap items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-heading text-2xl font-black text-white"
            >
              {displayName.trim().charAt(0).toUpperCase() || "J"}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="break-words font-heading text-3xl font-black text-[#30273A]" id="profile-heading">
                {displayName}
              </h1>
              <p className="break-all text-sm font-semibold text-[#463B52]">{email}</p>
              <p className="text-sm font-semibold text-[#463B52]">
                Birthday: {user ? formatBirthday(user.birthday_mm_dd) : "not set yet"}
              </p>
            </div>
            <span className="rounded-full bg-secondary/30 px-3 py-1 text-xs font-black text-[#173B3A]">
              Signed in
            </span>
          </div>

          {user ? (
            <details className="mt-4 rounded-2xl bg-bg/70 p-4">
              <summary className="cursor-pointer text-sm font-black text-[#30273A]">Edit profile</summary>
              <form action="/api/profile" className="mt-3 space-y-3" method="post">
                <label className="block text-sm font-bold text-[#30273A]">
                  Name
                  <input className={inputClass} defaultValue={user.name} maxLength={100} name="name" required />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-bold text-[#30273A]">
                    Birthday month
                    <select className={inputClass} defaultValue={birthMonth} name="month" required>
                      {MONTHS.map((month, index) => (
                        <option key={month} value={String(index + 1).padStart(2, "0")}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-[#30273A]">
                    Day
                    <select className={inputClass} defaultValue={birthDay} name="day" required>
                      {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => (
                        <option key={day} value={day}>
                          {Number(day)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-xs font-semibold text-[#6A6074]">
                  Your email comes from your sign-in and can&apos;t be changed here. If you change your birthday
                  before your page opens, the unlock date moves with it.
                </p>
                <button className="rounded-2xl bg-secondary px-5 py-2 text-sm font-black text-[#173B3A]" type="submit">
                  Save profile
                </button>
              </form>
            </details>
          ) : (
            <p className={`mt-4 ${empty}`}>
              Add your birthday to get your own birthday page and invite link.{" "}
              <a className="font-black underline" href="/onboarding">
                Set up my birthday page
              </a>
            </p>
          )}

          <a
            className="mt-5 block rounded-2xl bg-primary px-5 py-4 text-center font-heading text-lg font-black text-white shadow-lg shadow-primary/30"
            href="/send"
          >
            Make a card
          </a>
        </section>

        {/* Cards I sent */}
        <section aria-labelledby="sent-heading" className={panel}>
          <h2 className={heading} id="sent-heading">
            Cards I sent
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sentCards.map((card) => {
              const state = sentCardState(card);
              return (
                <article className="rounded-2xl bg-bg/70 p-4" data-testid="sent-card" key={card.id}>
                  <p className="text-sm font-black text-[#30273A]">To {card.recipientName}</p>
                  <p className="text-xs font-bold text-[#6A6074]">
                    {SENT_CARD_LABELS[state]} · {card.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  {state !== "removed" ? (
                    <>
                      <MediaView src={card.mediaUrl} type={card.mediaType ?? ""} />
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm font-semibold text-[#463B52]">
                        {card.message}
                      </p>
                      <CardLinkActions
                        cardPath={`/card/${card.token}`}
                        initialOrigin={origin}
                        recipientName={card.recipientName}
                        senderName={card.senderName}
                      />
                    </>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-[#463B52]">
                      The birthday person removed this card, so its message and file are no longer shown.
                    </p>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-bold text-[#6A6074]">Delete this card</summary>
                    <form action="/api/cards/mine" className="mt-2 space-y-2" method="post">
                      <input name="card_id" type="hidden" value={card.id} />
                      <input name="action" type="hidden" value="delete" />
                      <label className="flex gap-2 text-xs font-semibold text-[#463B52]">
                        <input name="confirm" required type="checkbox" />
                        Delete it for good. The link will stop working.
                      </label>
                      <button className="rounded-xl bg-primary px-3 py-2 text-xs font-black text-white" type="submit">
                        Delete card
                      </button>
                    </form>
                  </details>
                </article>
              );
            })}
          </div>
          {sentCards.length === 0 ? (
            <p className={empty}>
              No cards yet. Cards you make while signed in show up here with their link, so you can copy or send it
              again. Made a card before signing in? Open its private &quot;Send it&quot; link and tap &quot;Add to my
              dashboard&quot;.
            </p>
          ) : null}
        </section>

        {/* Cards I received */}
        <section aria-labelledby="received-heading" className={panel}>
          <h2 className={heading} id="received-heading">
            Cards I received
          </h2>
          <div className="mt-4 grid gap-4">
            {receivedCards.map((card) => (
              <article className="rounded-2xl bg-bg/70 p-4" data-testid="received-card" key={card.id}>
                <p className="text-sm font-black text-[#30273A]">
                  From {card.senderName}
                  {card.status === "hidden" ? " (hidden from others)" : ""}
                </p>
                <MediaView size="large" src={card.mediaUrl} type={card.mediaType ?? ""} />
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#463B52]">{card.message}</p>
                <a className="mt-2 inline-block text-xs font-black underline" href={`/card/${card.token}`}>
                  Open card
                </a>
              </article>
            ))}
          </div>
          {receivedCards.length === 0 ? (
            <p className={empty}>
              No cards here yet. When someone sends you a card link, open it while signed in and tap &quot;Claim this
              card&quot;. It will then stay here for you.
            </p>
          ) : null}
        </section>

        {/* My birthday page */}
        <section aria-labelledby="birthday-heading" className={panel}>
          <h2 className={heading} id="birthday-heading">
            My birthday page
          </h2>
          {user ? (
            <div className="mt-4 space-y-5">
              {user.paused_bool ? (
                <p className="rounded-2xl bg-accent/60 p-3 text-sm font-semibold text-[#30273A]">
                  JoyDrop is paused. Friends cannot send new messages and your page will not unlock automatically.
                </p>
              ) : null}
              <div className="space-y-3 text-sm font-semibold text-[#463B52]">
                <div>
                  <p className="font-black text-[#30273A]">Invite link for friends</p>
                  <CopyLink initialOrigin={origin} path={`/invite/${user.id}`} />
                </div>
                <div>
                  <p className="font-black text-[#30273A]">Your Birthday Bridge page</p>
                  <CopyLink initialOrigin={origin} path={`/birthday/${user.id}`} />
                </div>
                <p>
                  Your page unlocks at midnight Pacific Time on your birthday and shows only the messages you approve
                  below.
                </p>
              </div>
              <form action="/api/pause" method="post">
                <input name="user_id" type="hidden" value={user.id} />
                <input name="action" type="hidden" value={user.paused_bool ? "resume" : "pause"} />
                <button className="rounded-2xl bg-white px-5 py-3 font-heading font-black text-[#30273A] shadow" type="submit">
                  {user.paused_bool ? "Resume JoyDrop" : "Pause JoyDrop"}
                </button>
              </form>

              <div>
                <h3 className="font-heading text-lg font-black text-[#30273A]">Birthday messages from friends</h3>
                <div className="mt-3 grid gap-3">
                  {user.contributions.map((contribution) => (
                    <div className="rounded-2xl bg-bg/70 p-4 text-sm text-[#463B52]" key={contribution.id}>
                      <p className="font-bold">{contribution.contributor_name}</p>
                      <p className="whitespace-pre-wrap">{contribution.message_text}</p>
                      <MediaView
                        src={contribution.fileUrl ?? contribution.photo_url ?? contribution.voice_url}
                        type={contribution.type}
                      />
                      {!contribution.isApproved ? (
                        <form action="/api/approve" className="mt-3" method="post">
                          <input name="contribution_id" type="hidden" value={contribution.id} />
                          <button className="rounded-2xl bg-accent px-4 py-2 text-xs font-black text-[#30273A]" type="submit">
                            Approve
                          </button>
                        </form>
                      ) : (
                        <p className="mt-2 text-xs font-black text-[#30273A]">Approved</p>
                      )}
                    </div>
                  ))}
                  {user.contributions.length === 0 ? (
                    <p className={empty}>
                      No messages yet. Share your invite link above with friends. Messages they send through it show
                      up here for you to approve before your birthday. Cards made with &quot;Make a card&quot; are
                      separate: they appear under Cards I sent and Cards I received.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <p className={`mt-4 ${empty}`}>
              You don&apos;t have a birthday page yet. Set one up to get an invite link that friends use to send you
              messages, and a page that opens on your birthday.{" "}
              <a className="font-black underline" href="/onboarding">
                Set up my birthday page
              </a>
            </p>
          )}
        </section>

        {/* Data */}
        <section aria-labelledby="data-heading" className={`${panel} text-sm text-[#463B52]`}>
          <h2 className="font-heading text-lg font-black text-[#30273A]" id="data-heading">
            Your data
          </h2>
          <a className="mt-2 block underline" href="/api/me/export">
            Download my data (JSON)
          </a>
          <form action="/api/me" className="mt-3 space-y-2" method="post">
            <label className="flex gap-2 text-xs font-semibold">
              <input name="confirm" required type="checkbox" />
              I understand this hides my account, messages, and page in JoyDrop, removes cards I claimed, and takes
              cards I sent off my dashboard.
            </label>
            <button className="rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white" type="submit">
              Erase my data
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
