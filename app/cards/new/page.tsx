import type { Metadata } from "next";
import Link from "next/link";
import { CardMaker } from "@/components/cards/CardMaker";
import { sponsoredDescription, SPONSOR_TEXT } from "@/lib/site";
import { cleanText, parseCardType } from "@/lib/videoCard/helpers";

export const metadata: Metadata = {
  title: "Make a video card | JoyDrop",
  description: sponsoredDescription(
    "Make a celebratory birthday, thank-you or celebration video card. Free preview, pay to download."
  ),
  other: { sponsor: SPONSOR_TEXT }
};

export default function NewCardPage({
  searchParams
}: {
  searchParams: { type?: string; name?: string; canceled?: string };
}) {
  return (
    <main className="min-h-screen bg-bg px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
          JoyDrop Video Cards
        </p>
        <h1 className="mt-4 font-heading text-3xl font-black text-[#30273A] sm:text-5xl">
          Make a video card
        </h1>
        <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-[#463B52]">
          Pick a card, type a few words and watch it appear. Previewing is free. You only pay
          when you want to download or share it. You send it yourself. JoyDrop never sends
          anything for you.{" "}
          <Link className="underline" href="/pricing">
            See prices
          </Link>
        </p>
        <div className="mt-8">
          <CardMaker
            canceled={searchParams.canceled === "1"}
            initialName={cleanText(searchParams.name, 40)}
            initialType={parseCardType(searchParams.type)}
          />
        </div>
      </div>
    </main>
  );
}
