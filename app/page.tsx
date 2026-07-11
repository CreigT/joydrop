import Link from "next/link";
import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session-cookie";

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

export default function Home() {
  const hasSession = Boolean(cookies().get(sessionCookieName)?.value);

  return (
    <main className="min-h-screen overflow-hidden bg-bg">
      <section className="confetti-dots px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              JoyDrop
            </div>
            <div className="space-y-5">
              <h1 className="font-heading text-4xl font-black leading-tight text-[#30273A] sm:text-6xl">
                JoyDrop
              </h1>
              <p className="max-w-xl text-xl font-semibold leading-relaxed text-[#463B52] sm:text-2xl">
                AI that makes birthdays unforgettable — with permission only
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "Friends opt you in OR you self opt-in",
                "AI learns what makes you smile via short preference form",
                "On your birthday, you get one combined video/voice note from all opt-in friends"
              ].map((step, index) => (
                <div
                  className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-white/70"
                  key={step}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent font-heading text-lg font-black text-[#30273A]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-[#463B52]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-white/85 p-5 text-sm font-semibold leading-relaxed text-[#463B52] shadow-sm ring-1 ring-white/70">
              Pause anytime. Human override on every message. We never sell data.
            </div>
            <Link
              className="inline-flex rounded-2xl bg-secondary px-5 py-3 font-heading font-black text-[#173B3A] shadow-lg shadow-secondary/30"
              href={hasSession ? "/dashboard" : "/login"}
            >
              {hasSession ? "Go to Dashboard" : "Sign in with Google"}
            </Link>
          </div>

          <form
            action="/api/optin"
            method="post"
            className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:p-7"
          >
            <div className="space-y-4">
              <label className="block text-sm font-bold text-[#30273A]">
                Full name
                <input
                  className={inputClass}
                  name="full_name"
                  placeholder="Full name"
                  required
                />
              </label>
              <label className="block text-sm font-bold text-[#30273A]">
                Email
                <input
                  className={inputClass}
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="block text-sm font-bold text-[#30273A]">
                Birthday
                <div className="mt-2 flex gap-2">
                  <select
                    className="flex-1 rounded-xl border border-gray-300 bg-white p-3"
                    name="month"
                    required
                  >
                    <option value="">Month</option>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December"
                    ].map((month, index) => (
                      <option
                        key={month}
                        value={String(index + 1).padStart(2, "0")}
                      >
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex-1 rounded-xl border border-gray-300 bg-white p-3"
                    name="day"
                    required
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, index) => (
                      <option
                        key={index + 1}
                        value={String(index + 1).padStart(2, "0")}
                      >
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  We only store month + day. Year is never asked or saved.
                </p>
              </label>
              <label className="flex gap-3 rounded-2xl bg-bg/70 p-4 text-sm font-semibold leading-relaxed text-[#463B52]">
                <input
                  className="mt-1 h-4 w-4 accent-primary"
                  name="consent_checkbox_1"
                  required
                  type="checkbox"
                />
                I consent to AI creating birthday surprises for me
              </label>
              <label className="flex gap-3 rounded-2xl bg-bg/70 p-4 text-sm font-semibold leading-relaxed text-[#463B52]">
                <input
                  className="mt-1 h-4 w-4 accent-primary"
                  name="consent_checkbox_2"
                  required
                  type="checkbox"
                />
                Friends can add me to their surprise list
              </label>
              <button
                className="w-full rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-[#f85f94]"
                type="submit"
              >
                Opt in
              </button>
            </div>
          </form>
        </div>
      </section>
      <footer className="px-5 py-8 text-center text-sm font-semibold text-[#463B52]">
        A Smile Automations project
      </footer>
    </main>
  );
}
