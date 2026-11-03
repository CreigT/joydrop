export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
        <h1 className="font-heading text-4xl font-black text-[#30273A]">
          Terms
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#463B52]">
          <p>
            JoyDrop is a permission-first birthday page app. Only submit
            information, messages, voices, likenesses, and photos that you have the
            right and permission to share.
          </p>
          <p>
            AI speech drafts stay drafts until the birthday person approves them.
            Approved messages and speeches appear on the Birthday Bridge page when
            it unlocks. JoyDrop does not send email or text messages, and the gift
            tracker does not handle money.
          </p>
          <p>
            Do not submit unlawful, harmful, or non-consensual content. The page
            owner can hide or delete content on their page at any time.
          </p>
          <p>JoyDrop is provided as is, without guarantees of availability.</p>
        </div>
      </section>
    </main>
  );
}
