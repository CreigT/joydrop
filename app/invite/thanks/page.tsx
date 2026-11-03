export default function InviteThanks({
  searchParams
}: {
  searchParams: { birthday?: string };
}) {
  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-xl rounded-2xl bg-white/90 p-7 text-center shadow-xl ring-1 ring-white/80 sm:p-10">
        <h1 className="font-heading text-3xl font-black text-[#30273A] sm:text-5xl">
          Thanks! Your message was sent.
        </h1>
        <p className="mt-4 text-sm font-semibold leading-7 text-[#463B52]">
          If it&apos;s approved, it will appear on their Birthday Bridge page
          {searchParams.birthday ? ` when it unlocks on ${searchParams.birthday}` : ""}.
        </p>
      </section>
    </main>
  );
}
