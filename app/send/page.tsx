import type { Metadata } from "next";
import { hasDatabaseUrl } from "@/lib/database";
import { CARD_LIMITS } from "@/lib/cards";

// Read the database setting at request time, not at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Make a birthday card | JoyDrop",
  robots: { index: false, follow: false }
};

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

export default function SendPage() {
  const open = hasDatabaseUrl();

  return (
    <main className="confetti-dots min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-white/80 sm:p-8">
        <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">JoyDrop</p>
        <h1 className="mt-4 font-heading text-3xl font-black text-[#30273A]">Make a birthday card</h1>
        <p className="mt-3 text-sm font-semibold leading-7 text-[#463B52]">
          Write a message and add a photo, GIF, short video, or voice note if you like. The birthday
          person doesn&apos;t need an account. Next, you&apos;ll get a private link to send from your own
          phone or email. JoyDrop doesn&apos;t send texts or emails. The card can be viewed as soon as
          the link is opened.
        </p>

        {!open ? (
          <p className="mt-6 rounded-2xl bg-accent/60 p-4 text-sm font-semibold text-[#30273A]">
            Cards are not available yet. Please check back soon.
          </p>
        ) : (
          <form action="/api/cards" className="mt-6 space-y-4" encType="multipart/form-data" method="post">
            <label className="block text-sm font-bold text-[#30273A]">
              Birthday person&apos;s name
              <input className={inputClass} maxLength={CARD_LIMITS.name} name="recipient_name" required />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Your name (shown on the card)
              <input className={inputClass} maxLength={CARD_LIMITS.name} name="sender_name" required />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Your message
              <textarea
                className={`${inputClass} min-h-36 resize-y`}
                maxLength={CARD_LIMITS.message}
                name="message"
                required
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Photo, GIF, video, or voice note (optional, up to 4 MB)
              <input accept="image/*,video/*,audio/*" className={inputClass} name="media" type="file" />
            </label>
            <label className="flex gap-3 rounded-2xl bg-bg/70 p-4 text-sm font-semibold leading-relaxed text-[#463B52]">
              <input className="mt-1 h-4 w-4 accent-primary" name="permission_checkbox" required type="checkbox" />
              I have the right to share what I&apos;m sending. I understand anyone with the card link can
              view it, and the birthday person can hide, report, or delete it.
            </label>
            <button
              className="w-full rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30"
              type="submit"
            >
              Create card
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
