export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
        <h1 className="font-heading text-4xl font-black text-[#30273A]">
          Terms
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#463B52]">
          <p>
            JoyDrop is a permission-first AI birthday automation app. You must
            only submit information, messages, voices, likenesses, and photos
            that you have permission to provide.
          </p>
          <p>
            AI-generated drafts require a human review option before delivery.
            Approved surprises may be scheduled and sent on the recipient&apos;s
            birthday.
          </p>
          <p>
            By using JoyDrop, you agree not to submit unlawful, harmful, or
            non-consensual content.
          </p>
        </div>
      </section>
    </main>
  );
}
