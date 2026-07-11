import Link from "next/link";
import { ConfettiBurst } from "@/components/ConfettiBurst";

export default function Thanks({
  searchParams
}: {
  searchParams: { user_id?: string };
}) {
  const invitePath = searchParams.user_id
    ? `/invite/${searchParams.user_id}`
    : "/invite";
  const birthdayPath = searchParams.user_id
    ? `/birthday/${searchParams.user_id}`
    : "/birthday";

  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <ConfettiBurst />
      <section className="relative z-10 w-full max-w-xl rounded-2xl bg-white/90 p-7 text-center shadow-xl ring-1 ring-white/80 sm:p-10">
        <p className="mb-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
          JoyDrop
        </p>
        <h1 className="font-heading text-3xl font-black text-[#30273A] sm:text-5xl">
          You&apos;re in! Want to invite friends to surprise you?
        </h1>
        <Link
          className="mt-7 block rounded-2xl bg-secondary px-5 py-3 font-heading font-black text-[#173B3A] shadow-lg shadow-secondary/30"
          href={invitePath}
        >
          {invitePath}
        </Link>
        <Link
          className="mt-3 block rounded-2xl bg-accent px-5 py-3 font-heading font-black text-[#30273A] shadow-lg shadow-accent/30"
          href={birthdayPath}
        >
          {birthdayPath}
        </Link>
      </section>
    </main>
  );
}
