/**
 * Pure helper functions for Video Cards. Nothing here touches the DOM, so
 * all of it can be unit tested with `npm test`.
 */

import { DEFAULT_ACCENT_HEX, TEMPLATES } from "./templates";
import {
  CARD_DURATION,
  CARD_TYPES,
  SAFE_RECT,
  STAGE_MAX_WIDTH,
  STILL_SAFE_RECT,
  type BlockId,
  type CardInput,
  type CardType,
  type ClosingLayout,
  type FittedText,
  type MeasureText,
  type PlacedBlock,
  type ResolvedCard,
  type Rgb,
  type StageLayout,
  type Timeline
} from "./types";

/* ------------------------------------------------------------------ */
/* Small math / easing helpers                                         */
/* ------------------------------------------------------------------ */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smoothstep ease, input clamped to 0..1. */
export function ease(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Ease with a small overshoot ("pop"). Input clamped to 0..1. */
export function backOut(x: number, strength = 1): number {
  const t = clamp(x, 0, 1) - 1;
  return 1 + (strength + 1) * t * t * t + strength * t * t;
}

/* ------------------------------------------------------------------ */
/* Input cleaning                                                      */
/* ------------------------------------------------------------------ */

export const LIMITS = {
  name: 40,
  headline: 30,
  subtitle: 60,
  message: 140,
  sender: 40
} as const;

/** Removes control characters, collapses whitespace, trims, caps length. */
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const collapsed = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(collapsed).slice(0, maxLength).join("").trim();
}

export function isCardType(value: unknown): value is CardType {
  return (
    typeof value === "string" && (CARD_TYPES as readonly string[]).includes(value)
  );
}

export function parseCardType(value: unknown, fallback: CardType = "birthday"): CardType {
  return isCardType(value) ? value : fallback;
}

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

/** Accepts "#abc" or "#aabbcc" (the # is optional). Returns null if invalid. */
export function parseHex(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

export function toHex(rgb: Rgb): string {
  return (
    "#" +
    rgb
      .map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function mixColor(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The card background is dark navy, so accent text must be bright. Dark
 * colours are mixed toward white until they are readable.
 */
export function ensureReadableAccent(rgb: Rgb, minLuminance = 0.35): Rgb {
  let out = rgb;
  for (let i = 0; i < 20 && luminance(out) < minLuminance; i++) {
    out = mixColor(out, [255, 255, 255], 0.1);
  }
  return out;
}

export function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])},${alpha})`;
}

/* ------------------------------------------------------------------ */
/* Resolve a form input into a render-ready card                       */
/* ------------------------------------------------------------------ */

export function resolveCard(input: CardInput): ResolvedCard {
  const type = parseCardType(input.type);
  const template = TEMPLATES[type];

  const headline =
    cleanText(input.headline, LIMITS.headline).toUpperCase() || template.headline;
  const name = cleanText(input.recipientName, LIMITS.name).toUpperCase();
  const subtitle =
    cleanText(input.subtitle, LIMITS.subtitle) || template.defaultSubtitle;
  const message = cleanText(input.message, LIMITS.message);
  const sender = cleanText(input.senderName, LIMITS.sender);
  const fromLine = !sender
    ? ""
    : /^from\b/i.test(sender)
      ? sender
      : `From ${sender}`;

  const accent = ensureReadableAccent(
    parseHex(input.themeColor) ?? (parseHex(DEFAULT_ACCENT_HEX) as Rgb)
  );

  return {
    type,
    headline,
    name,
    subtitle,
    message,
    fromLine,
    closing: template.closing,
    accent,
    accentHex: toHex(accent)
  };
}

/** The Create button needs at least the recipient's name. */
export function isCardReady(input: CardInput): boolean {
  return cleanText(input.recipientName, LIMITS.name).length > 0;
}

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

export const STAGE_ORDER: BlockId[] = ["headline", "name", "subtitle", "message"];

export function stageBlocksPresent(card: ResolvedCard): BlockId[] {
  return STAGE_ORDER.filter((id) => {
    switch (id) {
      case "headline":
        return card.headline.length > 0;
      case "name":
        return card.name.length > 0;
      case "subtitle":
        return card.subtitle.length > 0;
      case "message":
        return card.message.length > 0;
    }
  });
}

export function buildTimeline(
  card: ResolvedCard,
  duration: number = CARD_DURATION
): Timeline {
  const scale = duration / CARD_DURATION;
  const present = stageBlocksPresent(card);
  const first = 0.25 * scale;
  const last = 7.3 * scale;
  const step =
    present.length > 1
      ? Math.min(3 * scale, (last - first) / (present.length - 1))
      : 0;

  const reveal: Partial<Record<BlockId, number>> = {};
  present.forEach((id, index) => {
    reveal[id] = first + index * step;
  });

  return {
    duration,
    bursts: [0, 0.75 * duration],
    reveal,
    mainFadeStart: 0.73 * duration,
    mainFadeEnd: 0.73 * duration + 0.5 * scale,
    endStart: 0.75 * duration,
    fadeOutStart: 0.936 * duration
  };
}

/** A time (seconds) at which every stage block is fully visible. */
export function stagePreviewTime(timeline: Timeline): number {
  const times = Object.values(timeline.reveal) as number[];
  const lastReveal = times.length ? Math.max(...times) : 0;
  return Math.min(lastReveal + 1.2, timeline.mainFadeStart - 0.3);
}

/** A time (seconds) at which the end card is fully visible. */
export function closingPreviewTime(timeline: Timeline): number {
  return Math.min(timeline.endStart + 1.8, timeline.fadeOutStart - 0.2);
}

/* ------------------------------------------------------------------ */
/* Text fitting                                                        */
/* ------------------------------------------------------------------ */

export type FitOptions = {
  maxWidth: number;
  maxLines: number;
  startSize: number;
  minSize: number;
  /** line-height multiplier. */
  lineHeight?: number;
  /**
   * If the whole text fits on ONE line at this size or larger, prefer the
   * single line. Otherwise wrapping onto more lines (bigger text) is allowed.
   */
  singleLinePreferredSize?: number;
};

/** Greedy word wrap. Returns null if a single word is wider than maxWidth. */
export function wrapWords(
  measure: MeasureText,
  text: string,
  fontSize: number,
  maxWidth: number
): string[] | null {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (measure(word, fontSize) > maxWidth) return null;
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function tryFit(
  measure: MeasureText,
  text: string,
  options: FitOptions,
  maxLines: number
): { size: number; lines: string[] } | null {
  for (let size = options.startSize; size >= options.minSize; size -= 2) {
    const lines = wrapWords(measure, text, size, options.maxWidth);
    if (lines && lines.length <= maxLines) return { size, lines };
  }
  return null;
}

/** Break by characters so even a very long word fits. */
function hardWrap(
  measure: MeasureText,
  text: string,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of Array.from(text)) {
    const candidate = current + char;
    if (current && measure(candidate, fontSize) > maxWidth) {
      lines.push(current.trim());
      current = char === " " ? "" : char;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function ellipsize(
  measure: MeasureText,
  line: string,
  fontSize: number,
  maxWidth: number
): string {
  let out = Array.from(line);
  while (out.length > 1 && measure(out.join("") + "\u2026", fontSize) > maxWidth) {
    out = out.slice(0, -1);
  }
  return out.join("").trimEnd() + "\u2026";
}

/**
 * Finds the largest font size (never above startSize, never below minSize
 * unless it truly cannot fit) so the text fits `maxWidth` in at most
 * `maxLines` lines. If even the minimum size does not fit, the text is
 * broken by characters and ends with an ellipsis, so it is never cut off.
 */
export function fitText(
  measure: MeasureText,
  text: string,
  options: FitOptions
): FittedText {
  const lineHeightRatio = options.lineHeight ?? 1.15;
  const clean = text.trim();
  if (!clean) {
    return {
      lines: [],
      fontSize: options.startSize,
      lineHeight: Math.round(options.startSize * lineHeightRatio),
      width: 0,
      height: 0,
      truncated: false
    };
  }

  let found: { size: number; lines: string[] } | null = null;
  if (options.singleLinePreferredSize !== undefined) {
    const single = tryFit(measure, clean, options, 1);
    if (single && single.size >= options.singleLinePreferredSize) found = single;
  }
  if (!found) found = tryFit(measure, clean, options, options.maxLines);

  let truncated = false;
  if (!found) {
    const size = options.minSize;
    let lines = hardWrap(measure, clean, size, options.maxWidth);
    if (lines.length > options.maxLines) {
      lines = lines.slice(0, options.maxLines);
      lines[lines.length - 1] = ellipsize(
        measure,
        lines[lines.length - 1],
        size,
        options.maxWidth
      );
      truncated = true;
    }
    found = { size, lines };
  }

  const lineHeight = Math.round(found.size * lineHeightRatio);
  return {
    lines: found.lines,
    fontSize: found.size,
    lineHeight,
    width: Math.max(...found.lines.map((line) => measure(line, found!.size))),
    height: lineHeight * found.lines.length,
    truncated
  };
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type StageSpec = {
  id: BlockId;
  text: (card: ResolvedCard) => string;
  options: FitOptions;
};

const STAGE_SPECS: StageSpec[] = [
  {
    id: "headline",
    text: (card) => card.headline,
    options: {
      maxWidth: STAGE_MAX_WIDTH,
      maxLines: 2,
      startSize: 170,
      minSize: 60,
      singleLinePreferredSize: 110
    }
  },
  {
    id: "name",
    text: (card) => card.name,
    options: { maxWidth: STAGE_MAX_WIDTH, maxLines: 2, startSize: 230, minSize: 64 }
  },
  {
    id: "subtitle",
    text: (card) => card.subtitle,
    options: { maxWidth: STAGE_MAX_WIDTH, maxLines: 2, startSize: 92, minSize: 40 }
  },
  {
    id: "message",
    text: (card) => card.message,
    options: { maxWidth: STAGE_MAX_WIDTH, maxLines: 4, startSize: 72, minSize: 36 }
  }
];

export const STAGE_GAP = 64;

/** Stacks blocks top to bottom, centred in `area`. */
function stack<Id extends string>(
  items: { id: Id; fit: FittedText }[],
  gaps: number[],
  areaTop: number,
  areaHeight: number
): PlacedBlock<Id>[] {
  const total =
    items.reduce((sum, item) => sum + item.fit.height, 0) +
    gaps.reduce((sum, gap) => sum + gap, 0);
  let y = areaTop + (areaHeight - total) / 2;
  return items.map((item, index) => {
    const block: PlacedBlock<Id> = {
      ...item.fit,
      id: item.id,
      centerY: y + item.fit.height / 2
    };
    y += item.fit.height + (gaps[index] ?? 0);
    return block;
  });
}

function shrunk(options: FitOptions, factor: number): FitOptions {
  const startSize = Math.max(16, Math.round(options.startSize * factor));
  return {
    ...options,
    startSize,
    minSize: Math.min(options.minSize, startSize),
    singleLinePreferredSize:
      options.singleLinePreferredSize === undefined
        ? undefined
        : Math.round(options.singleLinePreferredSize * factor)
  };
}

/** Lays out the main screen: headline, name, subtitle, message. */
export function computeStageLayout(
  card: ResolvedCard,
  measure: MeasureText
): StageLayout {
  const specs = STAGE_SPECS.filter((spec) => spec.text(card).length > 0);
  let factor = 1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const items = specs.map((spec) => ({
      id: spec.id,
      fit: fitText(measure, spec.text(card), shrunk(spec.options, factor))
    }));
    const gaps = items.slice(1).map(() => STAGE_GAP * factor);
    const total =
      items.reduce((sum, item) => sum + item.fit.height, 0) +
      gaps.reduce((sum, gap) => sum + gap, 0);
    if (total <= SAFE_RECT.height || attempt === 39) {
      return {
        blocks: stack(items, gaps, SAFE_RECT.y, SAFE_RECT.height),
        shrink: factor
      };
    }
    factor *= 0.94;
  }
  /* istanbul ignore next - loop always returns */
  return { blocks: [], shrink: factor };
}

export const HEARTS_BLOCK_HEIGHT = 260;

export type StillBlockId = BlockId | "from";

export type StillLayout = {
  blocks: PlacedBlock<StillBlockId>[];
  heartsCenterY: number;
  shrink: number;
};

/**
 * Lays out the single picture card (1080 x 1350): headline, name, subtitle,
 * message, "From ..." and hearts all on one screen.
 */
export function computeStillLayout(
  card: ResolvedCard,
  measure: MeasureText
): StillLayout {
  const base = (startSize: number, minSize: number, maxLines: number): FitOptions => ({
    maxWidth: STAGE_MAX_WIDTH,
    maxLines,
    startSize,
    minSize
  });
  const specs: { id: StillBlockId; text: string; options: FitOptions }[] = [
    {
      id: "headline",
      text: card.headline,
      options: { ...base(150, 54, 2), singleLinePreferredSize: 100 }
    },
    { id: "name", text: card.name, options: base(190, 56, 2) },
    { id: "subtitle", text: card.subtitle, options: base(76, 36, 2) },
    { id: "message", text: card.message, options: base(58, 32, 4) },
    { id: "from", text: card.fromLine || card.closing, options: base(80, 36, 2) }
  ];
  const present = specs.filter((spec) => spec.text.length > 0);
  const heartsHeight = 150;
  let factor = 1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const items: { id: StillBlockId | "hearts"; fit: FittedText }[] = present.map(
      (spec) => ({ id: spec.id, fit: fitText(measure, spec.text, shrunk(spec.options, factor)) })
    );
    items.push({
      id: "hearts",
      fit: { lines: [], fontSize: 0, lineHeight: 0, width: 0, height: heartsHeight * factor, truncated: false }
    });
    const gaps = items.slice(1).map(() => 44 * factor);
    const total =
      items.reduce((sum, item) => sum + item.fit.height, 0) +
      gaps.reduce((sum, gap) => sum + gap, 0);
    if (total <= STILL_SAFE_RECT.height || attempt === 39) {
      const placed = stack(items, gaps, STILL_SAFE_RECT.y, STILL_SAFE_RECT.height);
      const hearts = placed[placed.length - 1];
      return {
        blocks: placed.slice(0, -1) as PlacedBlock<StillBlockId>[],
        heartsCenterY: hearts.centerY,
        shrink: factor
      };
    }
    factor *= 0.94;
  }
  /* istanbul ignore next */
  return { blocks: [], heartsCenterY: STILL_SAFE_RECT.y, shrink: factor };
}

/** Lays out the end card: "With love," + "From X" + hearts. */
export function computeClosingLayout(
  card: ResolvedCard,
  measure: MeasureText
): ClosingLayout {
  const closingOptions: FitOptions = {
    maxWidth: STAGE_MAX_WIDTH,
    maxLines: 1,
    startSize: 100,
    minSize: 48
  };
  const fromOptions: FitOptions = {
    maxWidth: STAGE_MAX_WIDTH,
    maxLines: 2,
    startSize: 112,
    minSize: 44
  };

  let factor = 1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const items: { id: "closing" | "from" | "hearts"; fit: FittedText }[] = [
      { id: "closing", fit: fitText(measure, card.closing, shrunk(closingOptions, factor)) }
    ];
    if (card.fromLine) {
      items.push({
        id: "from",
        fit: fitText(measure, card.fromLine, shrunk(fromOptions, factor))
      });
    }
    // The hearts are reserved as an empty block at the bottom of the stack.
    items.push({
      id: "hearts",
      fit: {
        lines: [],
        fontSize: 0,
        lineHeight: 0,
        width: 0,
        height: HEARTS_BLOCK_HEIGHT,
        truncated: false
      }
    });
    const gaps = items.slice(1).map((item) => (item.id === "hearts" ? 40 : 60) * factor);
    const total =
      items.reduce((sum, item) => sum + item.fit.height, 0) +
      gaps.reduce((sum, gap) => sum + gap, 0);
    if (total <= SAFE_RECT.height || attempt === 39) {
      const placed = stack(items, gaps, SAFE_RECT.y, SAFE_RECT.height);
      const hearts = placed[placed.length - 1];
      return {
        blocks: placed.slice(0, -1) as PlacedBlock<"closing" | "from">[],
        heartsCenterY: hearts.centerY
      };
    }
    factor *= 0.94;
  }
  /* istanbul ignore next - loop always returns */
  return { blocks: [], heartsCenterY: SAFE_RECT.y + SAFE_RECT.height / 2 };
}

/** True when a placed block sits fully inside the safe area. */
export function blockInsideSafeArea(
  block: PlacedBlock,
  area: { x: number; y: number; width: number; height: number } = SAFE_RECT
): boolean {
  const top = block.centerY - block.height / 2;
  const bottom = block.centerY + block.height / 2;
  const half = block.width / 2;
  const centerX = area.x + area.width / 2;
  return (
    top >= area.y - 0.5 &&
    bottom <= area.y + area.height + 0.5 &&
    centerX - half >= area.x - 0.5 &&
    centerX + half <= area.x + area.width + 0.5
  );
}

/** True when no two blocks overlap vertically (blocks sorted top to bottom). */
export function blocksDoNotOverlap(blocks: PlacedBlock[]): boolean {
  const sorted = [...blocks].sort((a, b) => a.centerY - b.centerY);
  for (let i = 1; i < sorted.length; i++) {
    const prevBottom = sorted[i - 1].centerY + sorted[i - 1].height / 2;
    const top = sorted[i].centerY - sorted[i].height / 2;
    if (top < prevBottom - 0.5) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Files, recording formats                                            */
/* ------------------------------------------------------------------ */

export function slugify(value: string, fallback = "card"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return slug || fallback;
}

export function cardFilename(
  card: Pick<ResolvedCard, "type" | "name">,
  extension: string
): string {
  return `joydrop-${card.type}-card-${slugify(card.name, "friend")}.${extension}`;
}

export const MIME_CANDIDATES: { mimeType: string; extension: string }[] = [
  { mimeType: "video/mp4;codecs=avc1.640029,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
  { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" }
];

/** Prefers mp4/h264, falls back to webm. Returns null if nothing works. */
export function pickMimeType(
  isSupported: (mimeType: string) => boolean
): { mimeType: string; extension: string } | null {
  for (const candidate of MIME_CANDIDATES) {
    if (isSupported(candidate.mimeType)) return candidate;
  }
  return null;
}

export function formatPercent(progress: number): string {
  return `${Math.round(clamp(progress, 0, 1) * 100)}%`;
}
