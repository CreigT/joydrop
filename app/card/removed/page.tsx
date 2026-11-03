import type { Metadata } from "next";

export const metadata: Metadata = { title: "Card removed | JoyDrop", robots: { index: false, follow: false } };

export default function CardRemovedPage() {
  return (
    <main className="confetti-dots flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white/90 p-7 text-center shadow-xl ring-1 ring-white/80">
        <h1 className="font-heading text-3xl font-black text-[#30273A]">Card removed</h1>
        <p className="mt-3 text-sm font-semibold text-[#463B52]">
          This card is no longer shown to anyone. Its message and file link were cleared.
        </p>
        <a className="mt-5 inline-block underline" href="/">
          Go to JoyDrop
        </a>
      </section>
    </main>
  );
}
