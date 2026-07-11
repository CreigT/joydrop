import { redirect } from "next/navigation";
import { getCurrentFirebaseUser } from "@/lib/session";

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

export default async function OnboardingPage() {
  const firebaseUser = await getCurrentFirebaseUser();

  if (!firebaseUser) {
    redirect("/login?next=/onboarding");
  }

  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <form
        action="/api/optin"
        method="post"
        className="w-full max-w-xl rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:p-7"
      >
        <p className="mb-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
          JoyDrop
        </p>
        <div className="space-y-4">
          <label className="block text-sm font-bold text-[#30273A]">
            Full name
            <input
              className={inputClass}
              defaultValue={firebaseUser.name ?? ""}
              name="full_name"
              placeholder="Full name"
              required
            />
          </label>
          <label className="block text-sm font-bold text-[#30273A]">
            Email
            <input
              className={inputClass}
              defaultValue={firebaseUser.email ?? ""}
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <label className="block text-sm font-medium text-[#30273A]">
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
            className="w-full rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30"
            type="submit"
          >
            Opt in
          </button>
        </div>
      </form>
    </main>
  );
}
