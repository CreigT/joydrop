"use client";

import { useEffect, useState } from "react";
import { absoluteUrl, mailtoHref, shareText, smsHref } from "@/lib/share";

/** Card link with Copy, Text, and Email buttons for the sender's dashboard. Opens the sender's own apps. */
export function CardLinkActions({
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = absoluteUrl(origin, cardPath);
  const text = shareText(recipientName, senderName, url);
  const button = "rounded-xl px-3 py-2 text-xs font-black shadow";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <a className="block break-all text-xs font-semibold text-[#463B52] underline" href={url}>
        {url}
      </a>
      <div className="flex flex-wrap gap-2">
        <button className={`${button} bg-white text-[#30273A]`} onClick={copy} type="button">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a className={`${button} bg-secondary text-[#173B3A]`} href={smsHref(text)}>
          Text it
        </a>
        <a className={`${button} bg-accent text-[#30273A]`} href={mailtoHref(recipientName, text)}>
          Email it
        </a>
      </div>
    </div>
  );
}
