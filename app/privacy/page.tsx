export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
        <h1 className="font-heading text-4xl font-black text-[#30273A]">
          Privacy
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#463B52]">
          <p>
            JoyDrop collects opt-in birthday details, friend contributions, and
            generated surprise content only to create consent-based birthday
            surprises.
          </p>
          <p>
            Pause anytime. Human override on every message. We never sell data.
          </p>
          <p>
            You can export your data at /api/me/export and erase your data at
            /api/me. Contributions older than 90 days are auto-deleted unless a
            Surprise was sent.
          </p>
        </div>
      </section>
    </main>
  );
}
