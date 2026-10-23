import type { Metadata } from "next";
import Link from "next/link";
import {
  ADD_ON_IDS,
  PRICING,
  PRODUCT_IDS,
  REFUND_NOTE,
  formatCents,
  type AddOnConfig
} from "@/lib/pricing";
import { sponsoredDescription, SPONSOR_TEXT } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing | JoyDrop Video Cards",
  description: sponsoredDescription("Simple prices for JoyDrop video cards and picture cards."),
  other: { sponsor: SPONSOR_TEXT }
};

export default function PricingPage() {
  const addOns = ADD_ON_IDS.filter((id) => PRICING.addOns[id].enabled);
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-heading text-4xl font-black text-[#30273A]">Video card pricing</h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-[#463B52]">
          Previewing is always free. Free previews carry a big &quot;Made with JoyDrop&quot;
          watermark and can&apos;t be downloaded or shared. Paying unlocks the exact card you
          previewed.
        </p>

        <section aria-labelledby="products" className="mt-8 grid gap-4 sm:grid-cols-3">
          <h2 className="sr-only" id="products">
            Cards
          </h2>
          {PRODUCT_IDS.map((id) => (
            <article
              className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80"
              key={id}
            >
              <h3 className="font-heading text-xl font-black text-[#30273A]">
                {PRICING.products[id].label}
              </h3>
              <p className="mt-2 font-heading text-3xl font-black text-primary">
                {formatCents(PRICING.products[id].priceCents)}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#463B52]">
                {PRICING.products[id].description}
              </p>
            </article>
          ))}
        </section>

        <section aria-labelledby="extras" className="mt-8 rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80">
          <h2 className="font-heading text-2xl font-black text-[#30273A]" id="extras">
            Optional extras
          </h2>
          <ul className="mt-4 grid gap-4">
            {addOns.map((id) => {
              const addOn: AddOnConfig = PRICING.addOns[id];
              return (
                <li className="text-sm text-[#463B52]" key={id}>
                  <p className="font-black text-[#30273A]">
                    {addOn.label}
                    {addOn.includedInBase ? " (included free)" : ""}
                  </p>
                  <p className="font-semibold">{addOn.description}</p>
                  {!addOn.includedInBase ? (
                    <p className="mt-1 font-semibold">
                      {PRODUCT_IDS.filter((p) => typeof addOn.priceCents[p] === "number")
                        .map(
                          (p) =>
                            `${PRICING.products[p].label} +${formatCents(addOn.priceCents[p] as number)}`
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="fees" className="mt-8 rounded-2xl bg-white/90 p-5 text-sm font-semibold leading-relaxed text-[#463B52] shadow-xl ring-1 ring-white/80">
          <h2 className="font-heading text-2xl font-black text-[#30273A]" id="fees">
            Fees and tax
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              You always see the full price breakdown before you pay.
            </li>
            {PRICING.serviceFee.percent > 0 || PRICING.serviceFee.flatCents > 0 ? (
              <li>
                {PRICING.serviceFee.label}: {PRICING.serviceFee.percent}%
                {PRICING.serviceFee.flatCents > 0
                  ? ` + ${formatCents(PRICING.serviceFee.flatCents)}`
                  : ""}
                .
              </li>
            ) : (
              <li>No service fee.</li>
            )}
            {PRICING.passThroughStripeFee.enabled ? (
              <li>{PRICING.passThroughStripeFee.label} is added at checkout.</li>
            ) : null}
            <li>
              {PRICING.automaticTax
                ? "Sales tax is calculated at checkout based on your location."
                : "No sales tax is added."}
            </li>
          </ul>
        </section>

        <section aria-labelledby="refunds" className="mt-8 rounded-2xl bg-white/90 p-5 text-sm font-semibold leading-relaxed text-[#463B52] shadow-xl ring-1 ring-white/80">
          <h2 className="font-heading text-2xl font-black text-[#30273A]" id="refunds">
            Terms and refunds
          </h2>
          <p className="mt-3">{REFUND_NOTE}</p>
          {PRICING.supportEmail ? <p className="mt-2">Contact: {PRICING.supportEmail}</p> : null}
          <p className="mt-2">
            Payments are handled by Stripe on its own secure page. JoyDrop never sees or stores
            your card number. Your card is made on your own device and nothing is sent to anyone
            for you. See also the{" "}
            <Link className="underline" href="/terms">
              site terms
            </Link>
            .
          </p>
        </section>

        <Link
          className="mt-8 inline-flex rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30"
          href="/cards/new"
        >
          Make a video card
        </Link>
      </div>
    </main>
  );
}
