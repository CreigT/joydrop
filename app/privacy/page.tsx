export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
        <h1 className="font-heading text-4xl font-black text-[#30273A]">
          Privacy
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-[#463B52]">
          <p>
            JoyDrop collects what you give it: your name, email, and birthday
            (month and day only), plus messages and files friends send through
            your invite link. It uses them only to build your Birthday Bridge page.
          </p>
          <p>
            <strong>Services we use.</strong> Sign-in is handled by Google Firebase.
            Uploaded files are stored in Firebase Storage (or in our database if
            storage is unavailable). The site runs on Vercel, and account and
            page data is stored in a hosted Postgres database. JoyDrop does
            not send your messages to any AI service.
          </p>
          <p>
            <strong>Who can see what.</strong> Your dashboard is visible only to you.
            Your Birthday Bridge page can be opened by anyone who has its link, but
            it shows only messages you approved, and only after it unlocks on your
            birthday (midnight Pacific Time). Pages are hidden from search engines unless you turn that on.
          </p>
          <p>
            <strong>Your controls.</strong> From your dashboard you can pause JoyDrop,
            download your data, or erase it. Erasing hides your account, messages,
            page, and any cards you claimed everywhere in the app; the records are kept in the database
            marked as deleted (soft delete). Friend messages you never approve are
            marked deleted automatically after 365 days.
          </p>
          <p>
            <strong>Birthday cards.</strong> Anyone can make a birthday card for a
            friend without an account. A card stores the names and message the sender
            types and any file they attach. The sender shares the card link from their
            own phone or email; JoyDrop doesn&apos;t send texts or emails and never
            receives anyone&apos;s phone number or email address for a card. Anyone with
            the card link can view it as soon as it is created. Card pages are hidden
            from search engines. The birthday person can hide, report, or delete the
            card, or sign in and claim it so only they can change it. The sender can
            delete it from their private share page. When a card is deleted or
            reported, its message and file link are cleared from the database; an
            attached file may remain in storage until it is cleaned up.
          </p>
          <p>
            <strong>Password reset.</strong> If you tap &quot;Forgot password?&quot; on the
            sign-in page, the email you type is sent to our sign-in provider (Firebase
            Authentication), which emails a reset link to that address if it has an
            account. This is the only email connected to JoyDrop.
          </p>
          <p>We don&apos;t sell your data.</p>
        </div>
      </section>
    </main>
  );
}
