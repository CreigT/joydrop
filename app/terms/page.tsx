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
            Messages appear on the Birthday Bridge page only after the birthday
            person approves them, and only once the page unlocks. JoyDrop does not send email or text messages, except that if you tap &quot;Forgot password?&quot; our sign-in provider (Firebase) emails you a password reset link. The gift
            tracker does not handle money.
          </p>
          <p>
            Do not submit unlawful, harmful, or non-consensual content. The page
            owner can hide or delete content on their page at any time.
          </p>
          <p>
            Birthday cards: you can make a card for someone without an account. You
            send the card link yourself from your phone or email; JoyDrop doesn&apos;t
            send texts or emails. Send it only to the person it is for, and only
            include content you have the right to share. Anyone with the link can view
            the card. The birthday person can hide, report, or delete it, and reported
            cards are removed for good.
          </p>
          <p>JoyDrop is provided as is, without guarantees of availability.</p>
        </div>
      </section>
    </main>
  );
}
