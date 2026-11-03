"use client";

import { useEffect, useState } from "react";
import { absoluteUrl } from "@/lib/share";

/** A full site link with a Copy button. The server passes the origin so the link is complete on first render. */
export function CopyLink({
  path,
  initialOrigin,
  linkClassName,
  buttonClassName
}: {
  path: string;
  initialOrigin: string;
  linkClassName?: string;
  buttonClassName?: string;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = absoluteUrl(origin, path);

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
    <span className="flex flex-wrap items-center gap-2">
      <a className={linkClassName ?? "break-all underline"} data-testid="full-link" href={url}>
        {url}
      </a>
      <button
        className={
          buttonClassName ??
          "rounded-xl bg-white px-3 py-1 text-xs font-black text-[#30273A] shadow"
        }
        onClick={copy}
        type="button"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
