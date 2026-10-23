import Link from "next/link";
import { SPONSOR_TEXT } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/5 px-5 py-6 text-center text-sm font-semibold text-[#463B52]">
      <p>{SPONSOR_TEXT}</p>
      <nav aria-label="Footer" className="mt-2 flex justify-center gap-4 text-xs">
        <Link className="underline" href="/cards/new">
          Video cards
        </Link>
        <Link className="underline" href="/pricing">
          Pricing
        </Link>
        <Link className="underline" href="/terms">
          Terms
        </Link>
        <Link className="underline" href="/privacy">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
