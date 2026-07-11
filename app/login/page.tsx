import { redirect } from "next/navigation";
import { getCurrentFirebaseUser } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentFirebaseUser();

  if (user) {
    redirect(searchParams.next || "/dashboard");
  }

  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
        <p className="mb-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
          JoyDrop
        </p>
        <h1 className="font-heading text-3xl font-black text-[#30273A]">
          Sign in with Google
        </h1>
        <LoginForm nextPath={searchParams.next || "/dashboard"} />
      </section>
    </main>
  );
}
