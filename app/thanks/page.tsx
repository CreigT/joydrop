import { headers } from "next/headers";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { CopyLink } from "@/components/CopyLink";
import { originFromHeaders } from "@/lib/share";

export default function Thanks({
  searchParams
}: {
  searchParams: { user_id?: string };
}) {
  const id = searchParams.user_id ? encodeURIComponent(searchParams.user_id) : "";
  const invitePath = id ? `/invite/${id}` : "/invite";
  const birthdayPath = id ? `/birthday/${id}` : "/birthday";
  const h = headers();
  const origin = originFromHeaders((name) => h.get(name));

  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <ConfettiBurst />
      <section className="relative z-10 w-full max-w-xl rounded-2xl bg-white/90 p-7 text-center shadow-xl ring-1 ring-white/80 sm:p-10">
        <p className="mb-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
          JoyDrop
        </p>
        <h1 className="font-heading text-3xl font-black text-[#30273A] sm:text-5xl">
          You&apos;re in! Share your invite link with friends.
        </h1>
        <p className="mt-4 text-sm font-semibold text-[#463B52]">
          Friends use the first link to send messages. The second link is your
          Birthday Bridge page. You can find both on your dashboard.
        </p>
        <div className="mt-7 rounded-2xl bg-secondary px-5 py-3 text-left shadow-lg shadow-secondary/30">
          <p className="text-xs font-black uppercase text-[#173B3A]">Invite link for friends</p>
          <CopyLink
            initialOrigin={origin}
            linkClassName="break-all font-heading text-sm font-black text-[#173B3A] underline"
            path={invitePath}
          />
        </div>
        <div className="mt-3 rounded-2xl bg-accent px-5 py-3 text-left shadow-lg shadow-accent/30">
          <p className="text-xs font-black uppercase text-[#30273A]">Your Birthday Bridge page</p>
          <CopyLink
            initialOrigin={origin}
            linkClassName="break-all font-heading text-sm font-black text-[#30273A] underline"
            path={birthdayPath}
          />
        </div>
        <a className="mt-5 inline-block text-sm font-bold text-[#463B52] underline" href="/dashboard">
          Go to your dashboard
        </a>
      </section>
    </main>
  );
}
