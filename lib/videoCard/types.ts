/**
 * Video Cards - shared types and constants.
 *
 * All coordinates are in "card space": a 1080 x 1920 vertical canvas.
 * Callers may render at a smaller pixel size by passing a scale factor.
 */

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;
export const CARD_FPS = 30;
export const CARD_DURATION = 14;

/** Text must stay inside these margins (px, card space). */
export const SAFE_MARGIN = {
  left: 120,
  right: 120,
  top: 250,
  bottom: 250
} as const;

export const SAFE_RECT = {
  x: SAFE_MARGIN.left,
  y: SAFE_MARGIN.top,
  width: CARD_WIDTH - SAFE_MARGIN.left - SAFE_MARGIN.right,
  height: CARD_HEIGHT - SAFE_MARGIN.top - SAFE_MARGIN.bottom
} as const;

/**
 * Animated text pops in with a small overshoot (about 4 %), so the width we
 * allow text to fill is a little narrower than the safe width. That keeps
 * the text inside the margins even at the peak of the "pop" animation.
 */
export const STAGE_MAX_WIDTH = 800;

export const CARD_TYPES = ["birthday", "thank-you", "celebration"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export type CardInput = {
  type: CardType;
  recipientName?: string;
  /** Replaces the big headline (e.g. "THANK YOU!"). */
  headline?: string;
  /** Line under the name (e.g. "for the BIG favor"). */
  subtitle?: string;
  /** Optional personal message. */
  message?: string;
  /** Who the card is from. Shown on the end card as "From ...". */
  senderName?: string;
  /** Optional accent colour as a hex string, e.g. "#FAC846". */
  themeColor?: string;
};

export type Rgb = readonly [number, number, number];

export type CardTemplate = {
  type: CardType;
  label: string;
  description: string;
  headline: string;
  defaultSubtitle: string;
  subtitlePlaceholder: string;
  closing: string;
};

/** A card after cleaning/defaulting. Everything the renderer needs. */
export type ResolvedCard = {
  type: CardType;
  headline: string;
  name: string;
  subtitle: string;
  message: string;
  /** Full end-card line, e.g. "From the Creigs". Empty when no sender. */
  fromLine: string;
  closing: string;
  accent: Rgb;
  accentHex: string;
};

export type BlockId = "headline" | "name" | "subtitle" | "message";

export type Timeline = {
  duration: number;
  /** Seconds at which confetti bursts fire. */
  bursts: number[];
  /** Seconds at which each stage block starts to appear. */
  reveal: Partial<Record<BlockId, number>>;
  /** Stage text starts fading out here, hidden by `mainFadeEnd`. */
  mainFadeStart: number;
  mainFadeEnd: number;
  /** End card ("With love," ...) starts here. */
  endStart: number;
  /** Final fade to the background colour. */
  fadeOutStart: number;
};

export type FittedText = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Widest line, in px. */
  width: number;
  /** lines.length * lineHeight */
  height: number;
  /** True if the text had to be shortened with an ellipsis. */
  truncated: boolean;
};

export type PlacedBlock<Id extends string = string> = FittedText & {
  id: Id;
  /** Vertical centre of the block, in card space. */
  centerY: number;
};

export type StageLayout = {
  blocks: PlacedBlock<BlockId>[];
  /** Factor applied to start sizes so everything fits vertically. */
  shrink: number;
};

export type ClosingId = "closing" | "from";

export type ClosingLayout = {
  blocks: PlacedBlock<ClosingId>[];
  heartsCenterY: number;
};

/** Measures text width in px at the given font size. */
export type MeasureText = (text: string, fontSize: number) => number;

/* ------------------------------------------------------------------ */
/* Output options (used by the pricing / paywall)                      */
/* ------------------------------------------------------------------ */

/** "preview" = heavy tiled watermark (free). "badge" = small corner badge. "none" = clean. */
export type WatermarkMode = "preview" | "badge" | "none";

export type Quality = "standard" | "hd";

export const STILL_WIDTH = 1080;
export const STILL_HEIGHT = 1350;

/** Safe area for the still (picture) card. Sides match the video (120px). */
export const STILL_SAFE_RECT = {
  x: 120,
  y: 150,
  width: STILL_WIDTH - 240,
  height: STILL_HEIGHT - 300
} as const;

export const QUALITY_SCALE: Record<Quality, number> = {
  /** 720 x 1280 video / 720 x 900 picture */
  standard: 2 / 3,
  /** 1080 x 1920 video / 1080 x 1350 picture */
  hd: 1
};
