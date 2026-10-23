/**
 * Canvas drawing for Video Cards (browser only).
 *
 * Everything is drawn in "card space" (1080 x 1920 for video, 1080 x 1350
 * for the picture card). Pass `scale` to render at a smaller pixel size.
 */

import {
  buildBokeh,
  buildParticles,
  bokehState,
  particleState,
  type Bokeh,
  type Particle
} from "./confetti";
import {
  backOut,
  buildTimeline,
  clamp,
  computeClosingLayout,
  computeStageLayout,
  computeStillLayout,
  ease,
  mixColor,
  rgba,
  type StillLayout
} from "./helpers";
import { mulberry32 } from "./rng";
import {
  CARD_DURATION,
  CARD_HEIGHT,
  CARD_WIDTH,
  STILL_HEIGHT,
  STILL_WIDTH,
  type BlockId,
  type ClosingLayout,
  type MeasureText,
  type PlacedBlock,
  type ResolvedCard,
  type Rgb,
  type StageLayout,
  type Timeline,
  type WatermarkMode
} from "./types";

export const FONT_STACK =
  'Poppins, Inter, "Segoe UI", "Helvetica Neue", Arial, "Liberation Sans", sans-serif';

const CREAM: Rgb = [255, 246, 224];
const PINK: Rgb = [255, 110, 175];
const ORANGE: Rgb = [255, 150, 50];
const RED: Rgb = [235, 64, 72];
const NAVY: Rgb = [8, 16, 60];
const LAYER_PAD = 90;

export function fontFor(size: number): string {
  return `800 ${size}px ${FONT_STACK}`;
}

type Ctx = CanvasRenderingContext2D;

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  return canvas;
}

/** Creates a text-width measuring function backed by a scratch canvas. */
export function createMeasure(): MeasureText {
  const ctx = makeCanvas(4, 4).getContext("2d") as Ctx;
  return (text, fontSize) => {
    ctx.font = fontFor(fontSize);
    return ctx.measureText(text).width;
  };
}

/* ------------------------------------------------------------------ */
/* Cached pieces                                                       */
/* ------------------------------------------------------------------ */

type Layer = { canvas: HTMLCanvasElement; width: number; height: number };

function makeTextLayer(
  block: PlacedBlock,
  color: Rgb,
  glow: Rgb
): Layer | null {
  if (block.lines.length === 0) return null;
  const width = CARD_WIDTH; // wide enough for any fitted line (max 800 + pop)
  const height = block.height + LAYER_PAD * 2;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d") as Ctx;
  ctx.font = fontFor(block.fontSize);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  block.lines.forEach((line, index) => {
    const x = width / 2;
    const y = LAYER_PAD + index * block.lineHeight + block.lineHeight / 2;
    // glow
    ctx.save();
    ctx.shadowColor = rgba(glow, 0.95);
    ctx.shadowBlur = 38;
    ctx.fillStyle = rgba(glow, 0.9);
    ctx.fillText(line, x, y);
    ctx.fillText(line, x, y);
    ctx.restore();
    // soft drop shadow
    ctx.fillStyle = "rgba(0,0,20,0.6)";
    ctx.fillText(line, x + 4, y + 6);
    // text
    ctx.fillStyle = rgba(color, 1);
    ctx.fillText(line, x, y);
  });
  return { canvas, width, height };
}

function makeBackground(width: number, height: number, accent: Rgb): HTMLCanvasElement {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d") as Ctx;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, rgba(NAVY, 1));
  gradient.addColorStop(1, "rgb(30,50,130)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.47,
    0,
    width / 2,
    height * 0.47,
    Math.max(width, height) * 0.62
  );
  glow.addColorStop(0, rgba(accent, 0.2));
  glow.addColorStop(1, rgba(accent, 0));
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function makeBokehSprite(accent: Rgb): HTMLCanvasElement {
  const size = 128;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext("2d") as Ctx;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, rgba(accent, 1));
  gradient.addColorStop(0.55, rgba(accent, 0.7));
  gradient.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

function heartPath(ctx: Ctx, cx: number, cy: number, size: number) {
  ctx.beginPath();
  for (let k = 0; k <= 60; k++) {
    const t = (2 * Math.PI * k) / 60;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    const px = cx + (x * size) / 16;
    const py = cy - (y * size) / 16;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHeart(ctx: Ctx, cx: number, cy: number, size: number, color: Rgb, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  heartPath(ctx, cx + 3, cy + 5, size);
  ctx.fillStyle = "rgba(0,0,30,0.43)";
  ctx.fill();
  heartPath(ctx, cx, cy, size);
  ctx.fillStyle = rgba(color, 1);
  ctx.fill();
  heartPath(ctx, cx - size * 0.18, cy - size * 0.25, size * 0.35);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fill();
  ctx.restore();
}

function drawLayer(
  ctx: Ctx,
  layer: Layer | null | undefined,
  centerY: number,
  alpha = 1,
  scale = 1,
  slideY = 0
) {
  if (!layer || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(CARD_WIDTH / 2, centerY + slideY);
  ctx.scale(scale, scale);
  ctx.drawImage(layer.canvas, -layer.width / 2, -layer.height / 2);
  ctx.restore();
}

function drawConfetti(ctx: Ctx, particles: Particle[], t: number) {
  for (const p of particles) {
    const s = particleState(p, t);
    if (!s.visible) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    ctx.fillStyle = rgba(p.color, 1);
    if (p.round) {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.h * 0.6, p.h * 0.6 * s.flip, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, (-p.h / 2) * s.flip, p.w, p.h * s.flip);
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/* Watermark                                                           */
/* ------------------------------------------------------------------ */

export const WATERMARK_TEXT = "Made with JoyDrop";

function pill(ctx: Ctx, cx: number, cy: number, text: string, size: number, alpha: number) {
  ctx.save();
  ctx.font = fontFor(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.7;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(8,16,60,0.72)";
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, cx, cy + size * 0.04);
  ctx.restore();
}

/**
 * "preview": heavy diagonal tiles plus a badge (free preview, locked).
 * "badge": small badge in the bottom margin (paid, watermark not removed).
 * "none": nothing.
 */
export function drawWatermark(ctx: Ctx, mode: WatermarkMode, width: number, height: number) {
  if (mode === "none") return;
  if (mode === "preview") {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = fontFor(58);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    const stepX = 560;
    const stepY = 300;
    const reach = Math.hypot(width, height) / 2 + stepX;
    let row = 0;
    for (let y = -reach; y <= reach; y += stepY, row++) {
      for (let x = -reach + (row % 2 ? stepX / 2 : 0); x <= reach; x += stepX) {
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.strokeText(WATERMARK_TEXT, x, y);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(WATERMARK_TEXT, x, y);
      }
    }
    ctx.restore();
  }
  pill(ctx, width / 2, height - (mode === "preview" ? 110 : 90), WATERMARK_TEXT, mode === "preview" ? 52 : 40, mode === "preview" ? 1 : 0.8);
}

/* ------------------------------------------------------------------ */
/* Video scene                                                         */
/* ------------------------------------------------------------------ */

export type VideoScene = {
  kind: "video";
  card: ResolvedCard;
  timeline: Timeline;
  stage: StageLayout;
  closing: ClosingLayout;
  particles: Particle[];
  bokeh: Bokeh[];
  bg: HTMLCanvasElement;
  bokehSprite: HTMLCanvasElement;
  layers: Record<string, Layer | null>;
};

type LayerStyle = { color: Rgb; glow: Rgb };

function stageStyle(id: BlockId, card: ResolvedCard): LayerStyle {
  switch (id) {
    case "headline":
      return { color: CREAM, glow: card.accent };
    case "name":
      return { color: card.accent, glow: card.accent };
    case "subtitle":
      return { color: CREAM, glow: PINK };
    case "message":
      return { color: mixColor(card.accent, CREAM, 0.35), glow: ORANGE };
  }
}

export function createVideoScene(
  card: ResolvedCard,
  options: { duration?: number; measure?: MeasureText } = {}
): VideoScene {
  const measure = options.measure ?? createMeasure();
  const timeline = buildTimeline(card, options.duration ?? CARD_DURATION);
  const stage = computeStageLayout(card, measure);
  const closing = computeClosingLayout(card, measure);

  const layers: Record<string, Layer | null> = {};
  for (const block of stage.blocks) {
    const style = stageStyle(block.id, card);
    layers[block.id] = makeTextLayer(block, style.color, style.glow);
  }
  for (const block of closing.blocks) {
    layers[block.id] =
      block.id === "closing"
        ? makeTextLayer(block, CREAM, PINK)
        : makeTextLayer(block, card.accent, card.accent);
  }

  return {
    kind: "video",
    card,
    timeline,
    stage,
    closing,
    particles: buildParticles(timeline),
    bokeh: buildBokeh(),
    bg: makeBackground(CARD_WIDTH, CARD_HEIGHT, card.accent),
    bokehSprite: makeBokehSprite(card.accent),
    layers
  };
}

function drawBokeh(ctx: Ctx, sprite: HTMLCanvasElement, bokeh: Bokeh[], t: number) {
  for (const b of bokeh) {
    const s = bokehState(b, t);
    ctx.globalAlpha = s.alpha * 1.6;
    ctx.drawImage(sprite, s.x - s.radius * 1.6, s.y - s.radius * 1.6, s.radius * 3.2, s.radius * 3.2);
  }
  ctx.globalAlpha = 1;
}

function drawHeartsGroup(ctx: Ctx, t: number, startAt: number, cy: number) {
  const colors: Rgb[] = [RED, PINK, RED];
  for (let i = 0; i < 3; i++) {
    const u = t - (startAt + 0.5 + 0.15 * i);
    if (u < 0) continue;
    const base = i === 1 ? 95 : 70;
    const size = base * backOut(u / 0.5) * (1 + 0.06 * Math.sin((t - startAt) * 6 + i));
    drawHeart(ctx, 540 + (i - 1) * 180, cy - 50 + (i === 1 ? 0 : 8), size, colors[i]);
  }
  const palette: Rgb[] = [PINK, RED, [250, 200, 70]];
  for (let j = 0; j < 6; j++) {
    const u = t - (startAt + 1.0 + 0.2 * j);
    if (u < 0) continue;
    const x = 540 + (j - 2.5) * 150 + 20 * Math.sin(u * 3 + j);
    const y = cy + 110 - u * 90;
    if (y < cy - 20) continue;
    drawHeart(ctx, x, y, 22, palette[j % 3], 0.8);
  }
}

export type DrawOptions = {
  /** Pixel scale relative to card space (1 = full size). */
  scale?: number;
  watermark?: WatermarkMode;
};

export function drawVideoFrame(
  ctx: Ctx,
  scene: VideoScene,
  t: number,
  options: DrawOptions = {}
) {
  const scale = options.scale ?? 1;
  const { timeline, card } = scene;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(scene.bg, 0, 0);
  drawBokeh(ctx, scene.bokehSprite, scene.bokeh, t);

  // Main stage text.
  if (t < timeline.mainFadeEnd) {
    const fade =
      t > timeline.mainFadeStart
        ? 1 - ease((t - timeline.mainFadeStart) / (timeline.mainFadeEnd - timeline.mainFadeStart))
        : 1;
    for (const block of scene.stage.blocks) {
      const at = timeline.reveal[block.id];
      if (at === undefined) continue;
      const u = (t - at) / 0.7;
      if (u <= 0) continue;
      const alpha = Math.min(u * 2, 1) * fade;
      if (block.id === "headline" || block.id === "name") {
        drawLayer(ctx, scene.layers[block.id], block.centerY, alpha, 0.4 + 0.6 * backOut(u));
      } else {
        drawLayer(ctx, scene.layers[block.id], block.centerY, alpha, 1, (1 - ease(u)) * 120);
      }
    }
  }

  // End card.
  if (t >= timeline.endStart) {
    for (const block of scene.closing.blocks) {
      const delay = block.id === "closing" ? 0 : 0.5;
      const u = (t - timeline.endStart - delay) / 0.7;
      if (u <= 0) continue;
      drawLayer(
        ctx,
        scene.layers[block.id],
        block.centerY,
        Math.min(u * 2, 1),
        0.5 + 0.5 * backOut(u)
      );
    }
    drawHeartsGroup(ctx, t, timeline.endStart, scene.closing.heartsCenterY);
  }

  drawConfetti(ctx, scene.particles, t);

  if (t > timeline.fadeOutStart) {
    const amount = ease((t - timeline.fadeOutStart) / (timeline.duration - timeline.fadeOutStart));
    ctx.fillStyle = rgba(NAVY, amount);
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }

  drawWatermark(ctx, options.watermark ?? "none", CARD_WIDTH, CARD_HEIGHT);
  void card;
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Still (picture) card                                                */
/* ------------------------------------------------------------------ */

export type StillScene = {
  kind: "still";
  card: ResolvedCard;
  layout: StillLayout;
  bg: HTMLCanvasElement;
  bokehSprite: HTMLCanvasElement;
  bokeh: Bokeh[];
  confetti: Particle[];
  layers: Record<string, Layer | null>;
};

export function createStillScene(
  card: ResolvedCard,
  options: { measure?: MeasureText } = {}
): StillScene {
  const measure = options.measure ?? createMeasure();
  const layout = computeStillLayout(card, measure);
  const layers: Record<string, Layer | null> = {};
  for (const block of layout.blocks) {
    if (block.id === "from") layers.from = makeTextLayer(block, card.accent, card.accent);
    else {
      const style = stageStyle(block.id, card);
      layers[block.id] = makeTextLayer(block, style.color, style.glow);
    }
  }
  // Frozen confetti from the video generator, taken mid-fall and rescaled to fit.
  const timeline = buildTimeline(card);
  const confetti = buildParticles(timeline, 21);
  return {
    kind: "still",
    card,
    layout,
    bg: makeBackground(STILL_WIDTH, STILL_HEIGHT, card.accent),
    bokehSprite: makeBokehSprite(card.accent),
    bokeh: buildBokeh(28, 9).map((b) => ({ ...b, y: (b.y / CARD_HEIGHT) * STILL_HEIGHT })),
    confetti,
    layers
  };
}

/** Time into the confetti simulation used for the frozen picture. */
const STILL_CONFETTI_TIME = 1.1;

export function drawStillCard(
  ctx: Ctx,
  scene: StillScene,
  options: DrawOptions = {}
) {
  const scale = options.scale ?? 1;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(scene.bg, 0, 0);
  drawBokeh(ctx, scene.bokehSprite, scene.bokeh, 2);

  // Confetti behind the text so words stay easy to read.
  const rand = mulberry32(77);
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 90; i++) {
    const p = scene.confetti[i % scene.confetti.length];
    const x = rand() * STILL_WIDTH;
    const y = rand() * STILL_HEIGHT;
    const rot = rand() * Math.PI * 2;
    const flip = 0.4 + rand() * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = rgba(p.color, 1);
    if (p.round) {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.h * 0.6, p.h * 0.6 * flip, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.w / 2, (-p.h / 2) * flip, p.w, p.h * flip);
    }
    ctx.restore();
  }
  ctx.restore();
  void STILL_CONFETTI_TIME;

  // Text layers are sized for the 1920px-tall video; they are position-agnostic.
  ctx.save();
  for (const block of scene.layout.blocks) {
    const layer = scene.layers[block.id];
    if (!layer) continue;
    ctx.drawImage(layer.canvas, 0, block.centerY - layer.height / 2);
  }
  ctx.restore();

  const cy = scene.layout.heartsCenterY;
  drawHeart(ctx, 540 - 170, cy + 6, 56, RED);
  drawHeart(ctx, 540, cy - 4, 78, PINK);
  drawHeart(ctx, 540 + 170, cy + 6, 56, RED);

  drawWatermark(ctx, options.watermark ?? "none", STILL_WIDTH, STILL_HEIGHT);
  ctx.restore();
}
