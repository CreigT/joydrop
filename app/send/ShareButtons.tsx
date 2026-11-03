"use client";

import { useEffect, useState } from "react";
import { mailtoHref, shareText, smsHref } from "@/lib/share";

export function ShareButtons({
  cardPath,
  initialOrigin,
  recipientName,
  senderName
}: {
  cardPath: string;
  initialOrigin: string;
  recipientName: string;
  senderName: string;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const url = `${origin}${cardPath}`;
  const text = shareText(recipientName, senderName, url);
  const button =
    "block w-full rounded-2xl px-5 py-3 text-center font-heading font-black shadow";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      window.prompt("Copy this link:", url);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `A birthday card for ${recipientName}`, text, url });
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

  return (
    <div className="space-y-3">
      <p className="break-all rounded-2xl bg-bg/70 p-4 text-sm font-semibold text-[#30273A]" data-testid="card-url">
        {origin ? url : cardPath}
      </p>
      {canShare ? (
        <button className={`${button} bg-primary text-white`} onClick={nativeShare} type="button">
          Share…
        </button>
      ) : null}
      <a className={`${button} bg-secondary text-[#173B3A]`} href={smsHref(text)}>
        Send by text message
      </a>
      <a className={`${button} bg-accent text-[#30273A]`} href={mailtoHref(recipientName, text)}>
        Send by email
      </a>
      <button className={`${button} bg-white text-[#30273A]`} onClick={copy} type="button">
        {copied ? "Link copied" : "Copy link"}
      </button>
      <p className="text-xs font-semibold text-[#6A6074]">
        These buttons open your own Messages or email app with the link filled in. You choose who
        gets it and press send yourself. JoyDrop doesn&apos;t send texts or emails.
      </p>
    </div>
  );
}
