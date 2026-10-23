"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PRICING,
  REFUND_NOTE,
  availableAddOns,
  calculatePrice,
  formatCents,
  type AddOnId,
  type ProductId
} from "@/lib/pricing";
import {
  CARD_TYPES,
  CARD_WIDTH,
  CARD_HEIGHT,
  QUALITY_SCALE,
  STILL_HEIGHT,
  STILL_WIDTH,
  TEMPLATES,
  buildTimeline,
  closingPreviewTime,
  formatPercent,
  isCardReady,
  resolveCard,
  stagePreviewTime,
  type CardInput,
  type CardType
} from "@/lib/videoCard";
import {
  createStillScene,
  createVideoScene,
  drawStillCard,
  drawVideoFrame,
  type StillScene,
  type VideoScene
} from "@/lib/videoCard/draw";
import { canRecordVideo, recordVideo, runScene, sizeCanvas } from "@/lib/videoCard/player";
import {
  PriceBreakdownPanel,
  RefundNote,
  clearPending,
  inputClass,
  loadPending,
  lockedButton,
  primaryButton,
  savePending,
  secondaryButton
} from "./shared";

type Props = {
  initialType: CardType;
  initialName: string;
  canceled: boolean;
};

type PreviewView = "main" | "closing" | "picture";
type Support = "unknown" | "yes" | "no";

const SWATCHES = ["#FAC846", "#FF8FB8", "#5EEAD4", "#FFA94D", "#C4A0FF"];

export function CardMaker({ initialType, initialName, canceled }: Props) {
  const [type, setType] = useState<CardType>(initialType);
  const [name, setName] = useState(initialName);
  const [subtitle, setSubtitle] = useState("");
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [headline, setHeadline] = useState("");
  const [themeColor, setThemeColor] = useState(SWATCHES[0]);
  const [includeSound, setIncludeSound] = useState(true);

  const [product, setProduct] = useState<ProductId>("video");
  const [addOns, setAddOns] = useState<AddOnId[]>([]);
  const [terms, setTerms] = useState(false);

  const [view, setView] = useState<PreviewView>("main");
  const [support, setSupport] = useState<Support>("unknown");
  const [phase, setPhase] = useState<"idle" | "creating" | "ready">("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [hidden, setHidden] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scenes = useRef<{ video: VideoScene | null; still: StillScene | null }>({
    video: null,
    still: null
  });
  const abortRef = useRef<AbortController | null>(null);

  const input: CardInput = useMemo(
    () => ({
      type,
      recipientName: name,
      headline,
      subtitle,
      message,
      senderName: sender,
      themeColor
    }),
    [type, name, headline, subtitle, message, sender, themeColor]
  );
  const resolved = useMemo(() => resolveCard(input), [input]);
  const ready = isCardReady(input);
  const wantsVideo = product !== "card";
  const wantsPicture = product !== "video";

  const breakdown = useMemo(() => calculatePrice({ product, addOns }), [product, addOns]);
  const offered = useMemo(() => availableAddOns(product), [product]);

  /* ---------- setup ---------- */

  useEffect(() => {
    setSupport(canRecordVideo() ? "yes" : "no");
  }, []);

  useEffect(() => {
    if (!canceled) return;
    const pending = loadPending();
    if (!pending) return;
    const c = pending.card;
    setType(c.type);
    setName(c.recipientName ?? "");
    setHeadline(c.headline ?? "");
    setSubtitle(c.subtitle ?? "");
    setMessage(c.message ?? "");
    setSender(c.senderName ?? "");
    setThemeColor(c.themeColor ?? SWATCHES[0]);
    setProduct(pending.selection.product);
    setAddOns(pending.selection.addOns);
  }, [canceled]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* ---------- scenes + live preview ---------- */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const video = createVideoScene(resolved);
      const still = createStillScene(resolved);
      scenes.current = { video, still };
      setSceneVersion((v) => v + 1);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [resolved]);

  const drawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (view === "picture") {
      const still = scenes.current.still;
      if (!still) return;
      canvas.width = STILL_WIDTH / 2;
      canvas.height = STILL_HEIGHT / 2;
      drawStillCard(ctx, still, { scale: 0.5, watermark: "preview" });
      return;
    }
    const video = scenes.current.video;
    if (!video) return;
    canvas.width = CARD_WIDTH / 2;
    canvas.height = CARD_HEIGHT / 2;
    const timeline = buildTimeline(resolved);
    const t = view === "main" ? stagePreviewTime(timeline) : closingPreviewTime(timeline);
    drawVideoFrame(ctx, video, t, { scale: 0.5, watermark: "preview" });
  }, [view, resolved]);

  useEffect(() => {
    if (phase === "creating" || playing) return;
    drawStatic();
  }, [drawStatic, sceneVersion, phase, playing]);

  // If the user switches to a card-only product, show the picture.
  useEffect(() => {
    if (!wantsVideo) setView("picture");
    else if (!wantsPicture && view === "picture") setView("main");
  }, [wantsVideo, wantsPicture, view]);

  /* ---------- actions ---------- */

  function stopAnything() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPlaying(false);
  }

  async function playPreview() {
    const canvas = canvasRef.current;
    const scene = scenes.current.video;
    if (!canvas || !scene) return;
    stopAnything();
    const controller = new AbortController();
    abortRef.current = controller;
    setView("main");
    setPlaying(true);
    sizeCanvas(canvas, 0.5);
    await runScene({ canvas, scene, draw: { watermark: "preview" }, signal: controller.signal });
    if (abortRef.current === controller) {
      abortRef.current = null;
      setPlaying(false);
    }
  }

  async function createPreviewVideo() {
    const canvas = canvasRef.current;
    const scene = scenes.current.video;
    if (!canvas || !scene || !ready) return;
    stopAnything();
    setError("");
    setStatus("Making your free preview. Please keep this tab open and on screen.");
    setView("main");
    setPhase("creating");
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    sizeCanvas(canvas, QUALITY_SCALE.standard);
    try {
      const result = await recordVideo({
        canvas,
        scene,
        draw: { watermark: "preview" },
        includeSound,
        signal: controller.signal,
        onProgress: setProgress
      });
      if (!result) {
        setPhase("idle");
        setStatus("Stopped.");
        return;
      }
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPhase("ready");
      setStatus("Your free preview is ready. It is watermarked and locked until you pay.");
    } catch (caught) {
      setPhase("idle");
      setStatus("");
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong making the video. Please try again."
      );
    } finally {
      abortRef.current = null;
      drawStatic();
    }
  }

  function cancelCreate() {
    stopAnything();
  }

  function toggleAddOn(id: AddOnId) {
    setAddOns((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function chooseProduct(next: ProductId) {
    setProduct(next);
    setAddOns((current) => current.filter((id) => availableAddOns(next).includes(id)));
  }

  async function pay() {
    setError("");
    if (!ready) {
      setError("Please enter who the card is for.");
      return;
    }
    if (!terms) {
      setError("Please tick the box to agree to the terms and refund note.");
      return;
    }
    setPaying(true);
    try {
      savePending({ card: input, selection: breakdown.selection });
      const response = await fetch("/api/cards/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card: input,
          selection: breakdown.selection,
          acceptedTerms: true
        })
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "We could not start checkout.");
      }
      window.location.assign(data.url);
    } catch (caught) {
      setPaying(false);
      setError(caught instanceof Error ? caught.message : "We could not start checkout.");
    }
  }

  /* ---------- render ---------- */

  const tabs: { id: PreviewView; label: string; show: boolean }[] = [
    { id: "main", label: "Main screen", show: wantsVideo },
    { id: "closing", label: "Closing screen", show: wantsVideo },
    { id: "picture", label: "Picture card", show: wantsPicture }
  ];
  const creating = phase === "creating";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <form
        className="grid gap-6 rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:p-7"
        onSubmit={(event) => event.preventDefault()}
      >
        {canceled ? (
          <p className="rounded-2xl bg-accent/60 p-3 text-sm font-bold text-[#30273A]" role="status">
            Payment was canceled. Nothing was charged and your card is still here.
          </p>
        ) : null}

        <fieldset>
          <legend className="font-heading text-lg font-black text-[#30273A]">
            1. What kind of card?
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {CARD_TYPES.map((id) => (
              <label
                className={`cursor-pointer rounded-2xl p-4 text-sm ring-2 transition has-[:focus-visible]:ring-secondary ${
                  type === id ? "bg-accent/70 ring-primary" : "bg-bg/70 ring-transparent"
                }`}
                key={id}
              >
                <input
                  checked={type === id}
                  className="sr-only"
                  name="card-type"
                  onChange={() => setType(id)}
                  type="radio"
                  value={id}
                />
                <span className="block font-heading text-base font-black text-[#30273A]">
                  {TEMPLATES[id].label}
                </span>
                <span className="mt-1 block font-semibold text-[#463B52]">
                  {TEMPLATES[id].description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4">
          <h2 className="font-heading text-lg font-black text-[#30273A]">2. Your words</h2>
          <label className="block text-sm font-bold text-[#30273A]">
            Who is it for?
            <input
              autoComplete="off"
              className={inputClass}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              placeholder="Their name"
              required
              value={name}
            />
          </label>
          <label className="block text-sm font-bold text-[#30273A]">
            Short line under the name (optional)
            <input
              className={inputClass}
              maxLength={60}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder={TEMPLATES[type].subtitlePlaceholder}
              value={subtitle}
            />
          </label>
          <label className="block text-sm font-bold text-[#30273A]">
            Your message (optional)
            <textarea
              className={`${inputClass} min-h-24`}
              maxLength={140}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write something from the heart"
              value={message}
            />
            <span className="mt-1 block text-xs font-semibold text-[#6A6074]">
              {message.length}/140
            </span>
          </label>
          <label className="block text-sm font-bold text-[#30273A]">
            From
            <input
              autoComplete="name"
              className={inputClass}
              maxLength={40}
              onChange={(event) => setSender(event.target.value)}
              placeholder="Your name, or something like the Smiths"
              value={sender}
            />
          </label>

          <details className="rounded-2xl bg-bg/70 p-4">
            <summary className="cursor-pointer text-sm font-black text-[#30273A]">
              More options
            </summary>
            <div className="mt-3 grid gap-4">
              <label className="block text-sm font-bold text-[#30273A]">
                Change the big title (optional)
                <input
                  className={inputClass}
                  maxLength={30}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder={TEMPLATES[type].headline}
                  value={headline}
                />
              </label>
              <div>
                <label className="block text-sm font-bold text-[#30273A]" htmlFor="theme-color">
                  Name color
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {SWATCHES.map((color) => (
                    <button
                      aria-label={`Use color ${color}`}
                      aria-pressed={themeColor === color}
                      className={`h-9 w-9 rounded-full ring-2 ${
                        themeColor === color ? "ring-[#30273A]" : "ring-white"
                      }`}
                      key={color}
                      onClick={() => setThemeColor(color)}
                      style={{ background: color }}
                      type="button"
                    />
                  ))}
                  <input
                    className="h-9 w-12 rounded border border-gray-300"
                    id="theme-color"
                    onChange={(event) => setThemeColor(event.target.value.toUpperCase())}
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(themeColor) ? themeColor : SWATCHES[0]}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm font-bold text-[#30273A]">
                <input
                  checked={includeSound}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) => setIncludeSound(event.target.checked)}
                  type="checkbox"
                />
                Include music and sound
              </label>
            </div>
          </details>
        </div>

        <fieldset>
          <legend className="font-heading text-lg font-black text-[#30273A]">
            3. What do you want?
          </legend>
          <div className="mt-3 grid gap-3">
            {(Object.keys(PRICING.products) as ProductId[]).map((id) => (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 text-sm ring-2 has-[:focus-visible]:ring-secondary ${
                  product === id ? "bg-accent/70 ring-primary" : "bg-bg/70 ring-transparent"
                }`}
                key={id}
              >
                <input
                  checked={product === id}
                  className="mt-1 h-4 w-4 accent-primary"
                  name="product"
                  onChange={() => chooseProduct(id)}
                  type="radio"
                  value={id}
                />
                <span className="flex-1">
                  <span className="flex justify-between gap-3 font-heading text-base font-black text-[#30273A]">
                    {PRICING.products[id].label}
                    <span>{formatCents(PRICING.products[id].priceCents)}</span>
                  </span>
                  <span className="block font-semibold text-[#463B52]">
                    {PRICING.products[id].description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {offered.length > 0 ? (
            <div className="mt-4 grid gap-2">
              <p className="text-sm font-black text-[#30273A]">Optional extras</p>
              {offered.map((id) => {
                const addOn = PRICING.addOns[id];
                const price = (addOn.priceCents as Partial<Record<ProductId, number>>)[product] ?? 0;
                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-2xl bg-bg/70 p-3 text-sm"
                    key={id}
                  >
                    <input
                      checked={addOns.includes(id)}
                      className="mt-1 h-4 w-4 accent-primary"
                      onChange={() => toggleAddOn(id)}
                      type="checkbox"
                    />
                    <span className="flex-1">
                      <span className="flex justify-between gap-3 font-black text-[#30273A]">
                        {addOn.label}
                        <span>+{formatCents(price)}</span>
                      </span>
                      <span className="block font-semibold text-[#463B52]">
                        {addOn.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : null}
        </fieldset>

        <div className="grid gap-4">
          <PriceBreakdownPanel breakdown={breakdown} />
          <RefundNote note={REFUND_NOTE} />
          <label className="flex items-start gap-3 text-sm font-bold text-[#30273A]">
            <input
              checked={terms}
              className="mt-1 h-4 w-4 accent-primary"
              onChange={(event) => setTerms(event.target.checked)}
              type="checkbox"
            />
            <span>
              I agree to the terms and refund note above. I understand my payment unlocks the
              exact card shown here.
            </span>
          </label>
          <button
            className={primaryButton}
            disabled={!ready || paying}
            onClick={pay}
            type="button"
          >
            {paying
              ? "Opening checkout..."
              : `Pay ${formatCents(breakdown.totalCents)}${
                  breakdown.taxCalculatedAtCheckout ? " + tax" : ""
                } and unlock`}
          </button>
          <p className="text-xs font-semibold text-[#6A6074]">
            You pay on Stripe&apos;s secure page. JoyDrop never sees your card number. See{" "}
            <Link className="underline" href="/pricing">
              all prices
            </Link>
            .
          </p>
          <p aria-live="assertive" className="text-sm font-bold text-red-700" role="alert">
            {error}
          </p>
        </div>
      </form>

      <section aria-labelledby="preview-heading" className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80">
          <h2 className="font-heading text-lg font-black text-[#30273A]" id="preview-heading">
            Free preview
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#463B52]">
            This is how your card looks. Free previews always have a big &quot;Made with JoyDrop&quot;
            watermark. Paid cards get a small badge, or no watermark with the Remove watermark extra.
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Preview screen">
            {tabs
              .filter((tab) => tab.show)
              .map((tab) => (
                <button
                  aria-pressed={view === tab.id}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    view === tab.id ? "bg-primary text-white" : "bg-bg text-[#30273A]"
                  }`}
                  disabled={creating || playing}
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
          </div>
          <div className="mt-4 flex justify-center">
            <canvas
              aria-label={`Preview of the ${TEMPLATES[type].label.toLowerCase()} card for ${
                resolved.name || "your friend"
              }`}
              className="max-h-[70vh] w-auto max-w-full rounded-2xl bg-[#08103c] shadow-lg"
              ref={canvasRef}
              role="img"
              style={{
                aspectRatio:
                  view === "picture" && !creating && !playing
                    ? `${STILL_WIDTH} / ${STILL_HEIGHT}`
                    : `${CARD_WIDTH} / ${CARD_HEIGHT}`
              }}
            />
          </div>

          {wantsVideo ? (
            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap gap-3">
                <button
                  className={secondaryButton}
                  disabled={!ready || creating || playing || support === "no"}
                  onClick={playPreview}
                  type="button"
                >
                  Play preview (no sound)
                </button>
                <button
                  className={primaryButton}
                  disabled={!ready || creating || support === "no"}
                  onClick={createPreviewVideo}
                  type="button"
                >
                  {creating ? "Creating..." : "Create free preview video"}
                </button>
                {creating ? (
                  <button className={lockedButton + " !cursor-pointer !bg-white"} onClick={cancelCreate} type="button">
                    Cancel
                  </button>
                ) : null}
              </div>
              {support === "no" ? (
                <p className="rounded-2xl bg-accent/60 p-3 text-sm font-bold text-[#30273A]" role="status">
                  This browser can&apos;t make videos yet. Please try the latest Chrome, Edge,
                  Safari or Firefox. You can still see the preview above.
                </p>
              ) : null}
              {creating ? (
                <div>
                  <div
                    aria-label="Video progress"
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(progress * 100)}
                    className="h-3 overflow-hidden rounded-full bg-bg"
                    role="progressbar"
                  >
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: formatPercent(progress) }}
                    />
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#463B52]">
                    {formatPercent(progress)} done
                    {hidden ? " - come back to this tab or the video will skip!" : ""}
                  </p>
                </div>
              ) : null}
              <p aria-live="polite" className="text-sm font-semibold text-[#463B52]" role="status">
                {status}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-[#463B52]">
              The picture card is made instantly after you pay.
            </p>
          )}
        </div>

        {previewUrl && wantsVideo ? (
          <div className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80">
            <h2 className="font-heading text-lg font-black text-[#30273A]">
              Your free preview video
            </h2>
            <div className="mt-3 flex justify-center">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                className="max-h-[60vh] rounded-2xl"
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                playsInline
                src={previewUrl}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <span aria-disabled="true" className={lockedButton} role="button" tabIndex={-1}>
                Download is locked
              </span>
              <span aria-disabled="true" className={lockedButton} role="button" tabIndex={-1}>
                Share is locked
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-[#463B52]">
              Pay on the left to unlock a clean copy you can download and share.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

