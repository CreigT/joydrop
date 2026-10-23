import { mulberry32 } from "./rng";
import { CARD_HEIGHT, CARD_WIDTH, type Rgb, type Timeline } from "./types";

export type Particle = {
  t0: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: Rgb;
  w: number;
  h: number;
  rot: number;
  rotSpeed: number;
  flipSpeed: number;
  phase: number;
  falling: boolean;
  round: boolean;
  sway: number;
};

export type ParticleState = {
  x: number;
  y: number;
  rotation: number;
  /** 0.1..1, how "flat" the piece looks as it tumbles. */
  flip: number;
  visible: boolean;
};

export const CONFETTI_COLORS: Rgb[] = [
  [250, 200, 70],
  [235, 64, 72],
  [60, 200, 120],
  [255, 110, 175],
  [70, 150, 255],
  [255, 246, 224],
  [255, 150, 50],
  [180, 110, 255]
];

type Range = [number, number];

/** Builds all confetti particles for a card. Deterministic for a given seed. */
export function buildParticles(timeline: Timeline, seed = 11): Particle[] {
  const random = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * random();
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

  const make = (
    t0: number,
    x: number,
    y: number,
    speed: Range,
    angle: Range,
    falling = false
  ): Particle => {
    const sp = between(speed[0], speed[1]);
    const a = (between(angle[0], angle[1]) * Math.PI) / 180;
    return {
      t0,
      x,
      y,
      vx: sp * Math.cos(a),
      vy: -sp * Math.sin(a),
      color: pick(CONFETTI_COLORS),
      w: between(16, 34),
      h: between(10, 22),
      rot: between(0, 6.28),
      rotSpeed: between(-8, 8),
      flipSpeed: between(3, 8),
      phase: between(0, 6.28),
      falling,
      round: random() < 0.2,
      sway: between(20, 70)
    };
  };

  const D = timeline.duration;
  const s = D / 14;
  const particles: Particle[] = [];
  const burst = (at: number, count: number, sideCount: number, yBase: number) => {
    for (let i = 0; i < count; i++) {
      particles.push(
        make(at, between(120, 960), yBase, [900, 2300], [55, 125])
      );
    }
    for (let i = 0; i < sideCount; i++) {
      const left = random() < 0.5;
      particles.push(
        make(
          at,
          left ? 60 : 1020,
          yBase + 200,
          [1200, 2400],
          left ? [55, 75] : [105, 125]
        )
      );
    }
  };

  burst(timeline.bursts[0], 110, 60, 1300);
  burst(timeline.bursts[1] - 0.1 * s, 130, 60, 1400);
  for (let i = 0; i < 55; i++) {
    particles.push(
      make(between(0.6 * s, 9.8 * s), between(0, CARD_WIDTH), -40, [0, 0], [0, 0], true)
    );
  }
  for (let i = 0; i < 25; i++) {
    particles.push(
      make(
        between(10.8 * s, 13.2 * s),
        between(0, CARD_WIDTH),
        -40,
        [0, 0],
        [0, 0],
        true
      )
    );
  }
  return particles;
}

const DRAG = 1.6;
const TERMINAL = 380;

export function particleState(p: Particle, t: number): ParticleState {
  const u = t - p.t0;
  const hidden: ParticleState = { x: 0, y: 0, rotation: 0, flip: 1, visible: false };
  if (u < 0) return hidden;

  let x: number;
  let y: number;
  if (p.falling) {
    x = p.x + p.sway * Math.sin(u * 2 + p.phase);
    y = p.y + u * (300 + p.phase * 30);
  } else {
    const k = (1 - Math.exp(-DRAG * u)) / DRAG;
    x = p.x + p.vx * k + p.sway * 0.3 * Math.sin(u * 3 + p.phase) * Math.min(u, 1);
    y = p.y + p.vy * k + TERMINAL * (u - k);
  }
  if (y > CARD_HEIGHT + 50 || y < -50 || x < -50 || x > CARD_WIDTH + 50) {
    return hidden;
  }
  return {
    x,
    y,
    rotation: p.rot + p.rotSpeed * u,
    flip: Math.abs(Math.cos(p.phase + u * p.flipSpeed)) * 0.9 + 0.1,
    visible: true
  };
}

/** Bokeh (soft gold dots) drifting upward in the background. */
export type Bokeh = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
};

export function buildBokeh(count = 40, seed = 3): Bokeh[] {
  const random = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * random();
  return Array.from({ length: count }, () => ({
    x: between(0, CARD_WIDTH),
    y: between(0, CARD_HEIGHT),
    radius: between(10, 40),
    phase: between(0, 6.28),
    speed: between(10, 40)
  }));
}

export function bokehState(b: Bokeh, t: number) {
  const y = (((b.y - b.speed * t) % CARD_HEIGHT) + CARD_HEIGHT) % CARD_HEIGHT;
  const alpha = (25 + 30 * (0.5 + 0.5 * Math.sin(t * 2 + b.phase))) / 255;
  return { x: b.x, y, radius: b.radius, alpha };
}
