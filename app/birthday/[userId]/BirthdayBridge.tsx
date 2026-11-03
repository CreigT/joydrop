"use client";

/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Confetti from "react-confetti";

type Contribution = {
  id: string;
  contributor_name: string;
  message_text: string | null;
  voice_url: string | null;
  photo_url: string | null;
  type: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
  created_at: string;
};

type GuestbookEntry = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

type Gift = {
  id: string;
  from_name: string;
  title: string;
  amount: number;
  goal: number;
};

type Props = {
  page: {
    id: string;
    userId: string;
    unlockAt: string;
    isLocked: boolean;
    isPublic: boolean;
    isHidden: boolean;
    viewCount: number;
    isOwner: boolean;
  };
  user: {
    name: string;
    birthday_mm_dd: string;
  };
  contributions: Contribution[];
  guestbook: GuestbookEntry[];
  gifts: Gift[];
};

function timeLeft(unlockAt: string) {
  const diff = Math.max(0, new Date(unlockAt).getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, diff };
}

function relativeTime(date: string) {
  const days = Math.max(
    0,
    Math.round((Date.now() - new Date(date).getTime()) / 86400000)
  );
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function BirthdayBridge({
  page,
  user,
  contributions,
  guestbook,
  gifts
}: Props) {
  const [countdown, setCountdown] = useState(() => timeLeft(page.unlockAt));
  const [selected, setSelected] = useState<Contribution | null>(null);
  const unlocked = !page.isLocked;
  const reachedUnlockTime = countdown.diff === 0;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(timeLeft(page.unlockAt));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [page.unlockAt]);

  const timeline = useMemo(
    () =>
      contributions
        .filter((contribution) => contribution.type === "photo")
        .slice(0, 8)
        .map((contribution) => ({
          id: contribution.id,
          label: `Photo from ${contribution.contributor_name}`,
          by: relativeTime(contribution.created_at)
        })),
    [contributions]
  );

  return (
    <main className="min-h-screen bg-bg">
      {unlocked ? <Confetti recycle={false} /> : null}
      <section className="bg-gradient-to-br from-primary to-secondary px-5 py-12 text-white">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-6xl"
          initial={{ opacity: 0, y: 18 }}
        >
          <p className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-black">
            JoyDrop
          </p>
          <h1 className="mt-6 font-heading text-4xl font-black sm:text-6xl">
            {unlocked ? `Happy Birthday, ${user.name}!` : `${user.name}'s birthday page`}
          </h1>
          {!unlocked ? (
            <div className="mt-6 grid grid-cols-4 gap-3 text-center">
              {[
                ["Days", countdown.days],
                ["Hours", countdown.hours],
                ["Minutes", countdown.minutes],
                ["Seconds", countdown.seconds]
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-white/20 p-4" key={label}>
                  <p className="font-heading text-2xl font-black">{value}</p>
                  <p className="text-xs font-bold uppercase">{label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </motion.div>
      </section>

      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 py-8">
        {page.isOwner && page.isHidden ? (
          <p className="rounded-2xl bg-accent/60 p-4 text-sm font-semibold text-[#30273A]">
            This page is hidden. Only you can see it. Use &quot;Show this page
            again&quot; below to make it visible to visitors.
          </p>
        ) : null}
        {!unlocked ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-bg/35 pt-20 backdrop-blur-sm">
            <div className="rounded-2xl bg-white/90 px-5 py-3 font-heading font-black text-[#30273A] shadow-xl">
              {reachedUnlockTime
                ? "It's time! Refresh the page to see it."
                : `Unlocks at midnight Pacific Time on ${user.name}'s birthday`}
            </div>
          </div>
        ) : null}

        <section>
          <h2 className="font-heading text-2xl font-black text-[#30273A]">
            Memory Wall
          </h2>
          <div className="mt-4 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {contributions.map((contribution) => (
              <button
                className="mb-4 w-full break-inside-avoid rounded-2xl bg-white/90 p-4 text-left shadow-xl ring-1 ring-white/80"
                key={contribution.id}
                onClick={() => setSelected(contribution)}
                type="button"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading font-black text-white">
                    {contribution.contributor_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#30273A]">
                      {contribution.contributor_name}
                    </p>
                    <p className="text-xs font-semibold text-[#6A6074]">
                      {relativeTime(contribution.created_at)}
                    </p>
                  </div>
                </div>
                <MediaPreview contribution={contribution} />
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-black text-[#30273A]">
            Photo Timeline
          </h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {timeline.map((moment) => (
              <div
                className="min-w-64 rounded-2xl bg-white/90 p-4 shadow-xl ring-1 ring-white/80"
                key={moment.id}
              >
                <p className="font-heading font-black text-[#30273A]">
                  {moment.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#463B52]">
                  {moment.by}
                </p>
              </div>
            ))}
          </div>
        </section>

        {unlocked ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80">
              <h2 className="font-heading text-2xl font-black text-[#30273A]">
                Guestbook
              </h2>
              <form
                action={`/api/birthday/${page.userId}/guestbook`}
                className="mt-4 grid gap-3"
                method="post"
              >
                <input
                  className="rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="name"
                  placeholder="Name"
                  required
                />
                <textarea
                  className="min-h-28 rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="message"
                  placeholder="Message"
                  required
                />
                <button
                  className="rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white"
                  type="submit"
                >
                  Sign Guestbook
                </button>
              </form>
              <div className="mt-5 grid gap-3">
                {guestbook.map((entry) => (
                  <div className="rounded-2xl bg-bg/70 p-4" key={entry.id}>
                    <p className="font-bold text-[#30273A]">{entry.name}</p>
                    <p className="text-sm text-[#463B52]">{entry.message}</p>
                    <p className="mt-2 text-sm">🎉 💛 ✨</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80">
              <h2 className="font-heading text-2xl font-black text-[#30273A]">
                Gift Tracker
              </h2>
              <form
                action={`/api/birthday/${page.userId}/gift`}
                className="mt-4 grid gap-3"
                method="post"
              >
                <input
                  className="rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="from_name"
                  placeholder="From"
                  required
                />
                <input
                  className="rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="title"
                  placeholder="Gift"
                  required
                />
                <input
                  className="rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="amount"
                  placeholder="Amount"
                  type="number"
                />
                <input
                  className="rounded-2xl border border-white/70 bg-bg/70 px-4 py-3"
                  name="goal"
                  placeholder="Goal"
                  type="number"
                />
                <button
                  className="rounded-2xl bg-secondary px-5 py-3 font-heading font-black text-[#173B3A]"
                  type="submit"
                >
                  Add gift
                </button>
                <p className="text-xs font-semibold text-[#6A6074]">
                  This only tracks gift ideas and pledges. JoyDrop does not take or
                  send money.
                </p>
              </form>
              <div className="mt-5 grid gap-3">
                {gifts.map((gift) => {
                  const progress =
                    gift.goal > 0 ? Math.min(100, (gift.amount / gift.goal) * 100) : 0;
                  return (
                    <div className="rounded-2xl bg-bg/70 p-4" key={gift.id}>
                      <p className="font-bold text-[#30273A]">
                        From {gift.from_name}: {gift.title}
                      </p>
                      <div className="mt-3 h-3 rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {page.isOwner ? (
          <section className="grid gap-4 rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:grid-cols-2 lg:grid-cols-4">
            <a
              className="rounded-2xl bg-accent px-4 py-3 text-center font-heading font-black text-[#30273A]"
              href={`/api/birthday/${page.userId}/generate-pdf`}
            >
              Download Memory Book PDF
            </a>
            <form action={`/api/birthday/${page.userId}/privacy`} method="post">
              <input
                name="action"
                type="hidden"
                value={page.isPublic ? "hide-search" : "allow-search"}
              />
              <button
                className="w-full rounded-2xl bg-secondary px-4 py-3 font-heading font-black text-[#173B3A]"
                type="submit"
              >
                {page.isPublic ? "Hide from search engines" : "Allow search engines"}
              </button>
            </form>
            <form action={`/api/birthday/${page.userId}/privacy`} method="post">
              <input name="action" type="hidden" value={page.isHidden ? "resume" : "pause"} />
              <button
                className="w-full rounded-2xl bg-white px-4 py-3 font-heading font-black text-[#30273A]"
                type="submit"
              >
                {page.isHidden ? "Show this page again" : "Hide this page"}
              </button>
            </form>
            <form action={`/api/birthday/${page.userId}/privacy`} method="post">
              <input name="action" type="hidden" value="delete" />
              <button
                className="w-full rounded-2xl bg-primary px-4 py-3 font-heading font-black text-white"
                type="submit"
              >
                Delete page content
              </button>
            </form>
          </section>
        ) : null}
      </div>

      <AnimatePresence>
        {selected ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#30273A]/70 p-5"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              animate={{ scale: 1 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-5"
              exit={{ scale: 0.96 }}
              initial={{ scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <MediaPreview contribution={selected} full />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function MediaPreview({
  contribution,
  full = false
}: {
  contribution: Contribution;
  full?: boolean;
}) {
  const src = contribution.fileUrl ?? contribution.photo_url ?? contribution.voice_url;

  if (contribution.type === "video" && src) {
    return <video className="w-full rounded-2xl" controls={full} playsInline src={src} />;
  }

  if ((contribution.type === "photo" || contribution.type === "gif") && src) {
    return (
      <img
        alt=""
        className="w-full rounded-2xl object-cover"
        src={src}
      />
    );
  }

  if (contribution.type === "voice" && src) {
    return <audio className="w-full" controls src={src} />;
  }

  return (
    <p className="text-sm leading-7 text-[#463B52]">
      {contribution.message_text}
    </p>
  );
}
