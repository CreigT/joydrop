"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Entitlements } from "@/lib/pricing";
import {
  QUALITY_SCALE,
  STILL_HEIGHT,
  STILL_WIDTH,
  cardFilename,
  formatPercent,
  resolveCard,
  type CardInput
} from "@/lib/videoCard";
import { createStillScene, createVideoScene, drawStillCard } from "@/lib/videoCard/draw";
import { canRecordVideo, canvasToPng, recordVideo, sizeCanvas } from "@/lib/videoCard/player";
import {
  DeliveryActions,
  clearPending,
  loadPending,
  primaryButton,
  secondaryButton
} from "./shared";

type State =
  | { step: "checking" }
  | { step: "no-session" }
  | { step: "no-card" }
  | { step: "unpaid" }
  | { step: "mismatch" }
  | { step: "error"; message: string }
  | { step: "unlocked"; entitlements: Entitlements; card: CardInput };

export function CardUnlock({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<State>(sessionId ? { step: "checking" } : { step: "no-session" });
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<{ blob: Blob; url: string; extension: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stillCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ask the server (which asks Stripe) whether this session is paid.
  useEffect(() => {
    if (!sessionId) return;
    const pending = loadPending();
    if (!pending) {
      setState({ step: "no-card" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/cards/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, card: pending.card })
        });
        const data = (await response.json()) as {
          paid?: boolean;
          matches?: boolean;
          entitlements?: Entitlements;
          error?: string;
        };
        if (cancelled) return;
        if (response.status === 402) return setState({ step: "unpaid" });
        if (response.status === 409) return setState({ step: "mismatch" });
        if (!response.ok || !data.entitlements) {
          return setState({ step: "error", message: data.error ?? "We could not check that payment." });
        }
        setState({ step: "unlocked", entitlements: data.entitlements, card: pending.card });
      } catch {
        if (!cancelled) setState({ step: "error", message: "We could not reach the server. Please refresh." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Picture card: made right away (no recording needed).
  useEffect(() => {
    if (state.step !== "unlocked" || !state.entitlements.includesCard) return;
    let cancelled = false;
    (async () => {
      try {
        const resolved = resolveCard(state.card);
        const scale = QUALITY_SCALE[state.entitlements.quality];
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(STILL_WIDTH * scale);
        canvas.height = Math.round(STILL_HEIGHT * scale);
        stillCanvasRef.current = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        drawStillCard(ctx, createStillScene(resolved), {
          scale,
          watermark: state.entitlements.watermark
        });
        const blob = await canvasToPng(canvas);
        if (cancelled) return;
        setPngBlob(blob);
        setPngUrl(URL.createObjectURL(blob));
      } catch {
        if (!cancelled) setError("We could not make the picture card. Please refresh and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(
    () => () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl);
    },
    [pngUrl]
  );
  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video.url);
    },
    [video]
  );

  async function createVideo() {
    if (state.step !== "unlocked" || !canvasRef.current) return;
    setError("");
    setCreating(true);
    setProgress(0);
    try {
      const { entitlements, card } = state;
      const scene = createVideoScene(resolveCard(card), { duration: entitlements.videoSeconds });
      const canvas = canvasRef.current;
      sizeCanvas(canvas, QUALITY_SCALE[entitlements.quality]);
      const result = await recordVideo({
        canvas,
        scene,
        draw: { watermark: entitlements.watermark },
        onProgress: setProgress
      });
      if (result) {
        setVideo({ blob: result.blob, url: URL.createObjectURL(result.blob), extension: result.extension });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong making the video.");
    } finally {
      setCreating(false);
    }
  }

  const wrap = "mx-auto grid max-w-2xl gap-5 rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-white/80";

  if (state.step === "checking") {
    return (
      <section aria-live="polite" className={wrap} role="status">
        <h1 className="font-heading text-2xl font-black text-[#30273A]">Checking your payment...</h1>
      </section>
    );
  }
  if (state.step !== "unlocked") {
    const messages: Record<string, string> = {
      "no-session": "This page needs a payment link. Start from the card maker.",
      "no-card":
        "Your payment was received, but your card details are not saved on this device or browser. Please open the card maker on the same device you used to pay. If you need help, use the refund and support note on the pricing page.",
      unpaid:
        "We have not seen a completed payment for this link yet. If you just paid, wait a moment and refresh.",
      mismatch:
        "This payment was for a different card than the one saved here, so it can't unlock this one. Make the card again and pay for it, or go back to your original card.",
      error: state.step === "error" ? state.message : ""
    };
    return (
      <section className={wrap}>
        <h1 className="font-heading text-2xl font-black text-[#30273A]">Hmm, we can&apos;t unlock that yet</h1>
        <p className="text-sm font-semibold leading-relaxed text-[#463B52]" role="alert">
          {messages[state.step]}
        </p>
        <Link className={primaryButton} href="/cards/new">
          Back to the card maker
        </Link>
      </section>
    );
  }

  const { entitlements, card } = state;
  const resolved = resolveCard(card);
  const videoSupported = typeof window === "undefined" ? true : canRecordVideo();
  return (
    <section className={wrap}>
      <div>
        <h1 className="font-heading text-3xl font-black text-[#30273A]">Payment received. Your card is unlocked!</h1>
        <p className="mt-2 text-sm font-semibold text-[#463B52]">
          For {resolved.name || "your friend"}.{" "}
          {entitlements.watermark === "none"
            ? "No watermark."
            : "It has a small \"Made with JoyDrop\" badge."}
        </p>
      </div>

      {entitlements.includesCard ? (
        <div>
          <h2 className="font-heading text-xl font-black text-[#30273A]">Picture card</h2>
          {pngUrl && pngBlob ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Picture card for ${resolved.name}`}
                className="mt-3 max-h-[60vh] rounded-2xl"
                src={pngUrl}
              />
              <DeliveryActions
                blob={pngBlob}
                filename={cardFilename(resolved, "png")}
                shareTitle="A card from JoyDrop"
              />
            </>
          ) : (
            <p className="mt-2 text-sm font-semibold text-[#463B52]" role="status">
              Making your picture...
            </p>
          )}
        </div>
      ) : null}

      {entitlements.includesVideo ? (
        <div>
          <h2 className="font-heading text-xl font-black text-[#30273A]">Video card</h2>
          <p className="mt-1 text-sm font-semibold text-[#463B52]">
            {entitlements.quality === "hd" ? "HD 1080p" : "Standard 720p"}, about{" "}
            {entitlements.videoSeconds} seconds. It is made on your device and takes about{" "}
            {entitlements.videoSeconds} seconds. Keep this tab open and on screen.
          </p>
          <div className="mt-3 flex justify-center">
            <canvas
              aria-label="Video being made"
              className={`max-h-[60vh] w-auto max-w-full rounded-2xl bg-[#08103c] ${
                creating ? "" : "hidden"
              }`}
              ref={canvasRef}
              style={{ aspectRatio: "1080 / 1920" }}
            />
          </div>
          {!video ? (
            <div className="mt-3">
              <button
                className={primaryButton}
                disabled={creating || !videoSupported}
                onClick={createVideo}
                type="button"
              >
                {creating ? `Making your video ${formatPercent(progress)}` : "Create my video"}
              </button>
              {!videoSupported ? (
                <p className="mt-2 text-sm font-bold text-[#30273A]" role="status">
                  This browser can&apos;t make videos yet. Please open this page in the latest
                  Chrome, Edge, Safari or Firefox.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex justify-center">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video className="max-h-[60vh] rounded-2xl" controls playsInline src={video.url} />
              </div>
              <DeliveryActions
                blob={video.blob}
                filename={cardFilename(resolved, video.extension)}
                shareTitle="A video card from JoyDrop"
              />
            </div>
          )}
        </div>
      ) : null}

      <p aria-live="assertive" className="text-sm font-bold text-red-700" role="alert">
        {error}
      </p>

      <div className="flex flex-wrap gap-3 border-t border-black/10 pt-4">
        <Link className={secondaryButton} href="/cards/new">
          Make another card
        </Link>
        <button
          className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#30273A] ring-1 ring-black/10"
          onClick={() => {
            clearPending();
            window.location.assign("/cards/new");
          }}
          type="button"
        >
          Finished. Clear the saved card from this device
        </button>
      </div>
    </section>
  );
}
