"use client";

import { formatCents, PRICING, type PriceBreakdown } from "@/lib/pricing";
import type { CardInput } from "@/lib/videoCard/types";
import type { Selection } from "@/lib/pricing";
import { useState } from "react";

export const inputClass =
  "mt-2 w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-base shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

export const primaryButton =
  "inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:bg-[#f85f94] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-2xl bg-secondary px-5 py-3 font-heading font-black text-[#173B3A] shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const lockedButton =
  "inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-gray-200 px-5 py-3 font-heading font-black text-gray-500";

/* ---------------- price breakdown ---------------- */

export function PriceBreakdownPanel({ breakdown }: { breakdown: PriceBreakdown }) {
  const product = breakdown.lines.find((line) => line.kind === "product");
  const addOns = breakdown.lines.filter((line) => line.kind === "addon");
  const fees = breakdown.lines.filter(
    (line) => line.kind === "serviceFee" || line.kind === "processingFee"
  );
  return (
    <section aria-labelledby="price-heading" className="rounded-2xl bg-bg/70 p-4">
      <h3 className="font-heading text-lg font-black text-[#30273A]" id="price-heading">
        Price
      </h3>
      <dl className="mt-3 grid gap-2 text-sm font-semibold text-[#463B52]">
        {product ? (
          <Row label={product.label} value={formatCents(product.amountCents)} />
        ) : null}
        {addOns.length > 0 ? (
          <>
            <Row
              label="Add-ons subtotal"
              muted
              value={formatCents(breakdown.addOnsCents)}
            />
            {addOns.map((line) => (
              <Row
                indent
                key={line.id}
                label={line.label}
                value={`+${formatCents(line.amountCents)}`}
              />
            ))}
          </>
        ) : null}
        {fees.map((line) => (
          <Row key={line.id} label={line.label} value={formatCents(line.amountCents)} />
        ))}
        {breakdown.taxCalculatedAtCheckout ? (
          <Row label="Sales tax" value="Calculated at checkout" />
        ) : null}
        <div className="mt-1 border-t border-black/10 pt-2">
          <Row
            bold
            label={breakdown.taxCalculatedAtCheckout ? "Total before tax" : "Total"}
            value={formatCents(breakdown.totalCents)}
          />
        </div>
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  indent
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${indent ? "pl-4" : ""} ${
        bold ? "font-heading text-lg font-black text-[#30273A]" : ""
      } ${muted ? "text-[#6A6074]" : ""}`}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ---------------- pending card (survives the Stripe redirect) ---------------- */

const PENDING_KEY = "joydrop:pending-video-card";

export type PendingCard = {
  card: CardInput;
  selection: Selection;
};

export function savePending(pending: PendingCard) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* private mode: the user can still pay, they will just need to re-enter details */
  }
}

export function loadPending(): PendingCard | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCard;
    return parsed?.card && parsed?.selection ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------- download + share ---------------- */

export function DeliveryActions({
  blob,
  filename,
  shareTitle
}: {
  blob: Blob;
  filename: string;
  shareTitle: string;
}) {
  const [message, setMessage] = useState("");

  function download() {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function share() {
    setMessage("");
    const file = new File([blob], filename, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: "I made this with JoyDrop!"
        });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    // Fallback: files cannot be shared from this browser, so copy a link to JoyDrop.
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/cards/new`);
      setMessage(
        "Sharing files is not supported here. We copied a link to JoyDrop instead. Download the file and attach it in your messaging app."
      );
    } catch {
      setMessage("Sharing is not supported here. Please use Download and attach the file.");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-3">
        <button className={primaryButton} onClick={download} type="button">
          Download
        </button>
        <button className={secondaryButton} onClick={share} type="button">
          Share
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-sm font-semibold text-[#463B52]">
        {message}
      </p>
    </div>
  );
}

export const TERMS_SUMMARY =
  "Cards are made on your device. Free previews have a big watermark and can't be saved. Paying unlocks the exact card you previewed.";

export function RefundNote({ note }: { note: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-relaxed text-[#463B52]">
      <p className="font-black">Terms and refunds</p>
      <p className="mt-1">{note}</p>
      {PRICING.supportEmail ? <p className="mt-1">Contact: {PRICING.supportEmail}</p> : null}
    </div>
  );
}
