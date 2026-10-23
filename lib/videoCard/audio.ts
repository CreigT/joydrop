/**
 * Synthesised party music. Everything is generated from math, so there are
 * no audio files and nothing to license.
 *
 * C - G - Am - F arpeggio at 120 BPM, kick and clap, a pop at the start and
 * applause-like noise on the end card.
 */

import { gaussian, mulberry32 } from "./rng";

const BPM = 120;
const BEAT = 60 / BPM;
const STEP = BEAT / 2;
const CHORDS = [
  [0, 4, 7], // C
  [7, 11, 14], // G
  [9, 12, 16], // Am
  [5, 9, 12] // F
];
const ROOTS = [60, 55, 57, 53];
const ARP = [0, 1, 2, 1, 0, 1, 2, 1];

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Moving average (centred, like numpy convolve "same"). */
export function boxFilter(x: Float32Array, k: number): Float32Array {
  const n = x.length;
  const out = new Float32Array(n);
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + x[i];
  const left = Math.floor(k / 2);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - left);
    const b = Math.min(n, i - left + k);
    out[i] = (prefix[b] - prefix[a]) / k;
  }
  return out;
}

function noise(random: () => number, length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = gaussian(random);
  return out;
}

function highpass(x: Float32Array, k: number): Float32Array {
  const lp = boxFilter(x, k);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] - lp[i];
  return out;
}

function mixInto(buffer: Float32Array, sound: Float32Array, atSeconds: number, sampleRate: number) {
  const start = Math.round(atSeconds * sampleRate);
  if (start >= buffer.length) return;
  const end = Math.min(buffer.length, start + sound.length);
  for (let i = start; i < end; i++) buffer[i] += sound[i - start];
}

function tone(freq: number, seconds: number, volume: number, sampleRate: number) {
  const n = Math.floor(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const wave =
      Math.sin(2 * Math.PI * freq * t) +
      0.4 * Math.sin(4 * Math.PI * freq * t) +
      0.2 * Math.sin(6 * Math.PI * freq * t);
    out[i] = wave * Math.min(t / 0.005, 1) * Math.exp(-t * 7) * volume;
  }
  return out;
}

function kick(sampleRate: number) {
  const n = Math.floor(0.25 * sampleRate);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    phase += (120 * Math.exp(-t * 25) + 45) / sampleRate;
    out[i] = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 14) * 0.9;
  }
  return out;
}

function clap(random: () => number, sampleRate: number) {
  const n = Math.floor(0.18 * sampleRate);
  const hp = highpass(noise(random, n), 8);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 30) + 0.6 * Math.exp(-Math.pow((t - 0.012) * 300, 2));
    hp[i] *= env * 0.35;
  }
  return hp;
}

function hat(random: () => number, sampleRate: number) {
  const n = Math.floor(0.05 * sampleRate);
  const hp = highpass(noise(random, n), 4);
  for (let i = 0; i < n; i++) hp[i] *= Math.exp(-(i / sampleRate) * 80) * 0.12;
  return hp;
}

function pop(random: () => number, sampleRate: number) {
  const n = Math.floor(0.6 * sampleRate);
  const hp = highpass(noise(random, n), 6);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    phase += (500 + 3000 * t) / sampleRate;
    out[i] = hp[i] * Math.exp(-t * 12) * 0.6 + Math.sin(2 * Math.PI * phase) * Math.exp(-t * 6) * 0.3;
  }
  return out;
}

function applause(random: () => number, sampleRate: number) {
  const n = Math.floor(3.5 * sampleRate);
  const raw = noise(random, n);
  const smooth = boxFilter(raw, 3);
  const slow = boxFilter(raw, 40);
  const band = new Float32Array(n);
  for (let i = 0; i < n; i++) band[i] = smooth[i] - slow[i];

  const crack = new Float32Array(n);
  for (let c = 0; c < 900; c++) {
    const start = Math.floor(random() * (n - 1500));
    const length = Math.floor(300 + random() * 900);
    const decay = 80 + random() * 170;
    const gain = 0.3 + random() * 0.7;
    for (let i = 0; i < length; i++) crack[start + i] += Math.exp(-i / decay) * gain;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.min(t / 0.3, 1) * Math.min(Math.max(1 - (t - 2.3) / 1.2, 0), 1);
    out[i] = band[i] * Math.min(crack[i], 1.5) * env * 0.9 + band[i] * 0.25 * env;
  }
  return out;
}

/**
 * Builds the whole soundtrack as mono float samples (-1..1).
 * Takes a few tens of milliseconds in a modern browser.
 */
export function generateCardAudio(
  durationSeconds: number,
  sampleRate: number,
  seed = 5
): Float32Array {
  const random = mulberry32(seed);
  const n = Math.floor(durationSeconds * sampleRate);
  const music = new Float32Array(n);

  const steps = Math.floor(durationSeconds / STEP);
  for (let k = 0; k < steps; k++) {
    const at = k * STEP;
    const bar = Math.floor(k / 8) % 4;
    const note = ROOTS[bar] + CHORDS[bar][ARP[k % 8]] + 12;
    mixInto(music, tone(midiToHz(note), 0.3, 0.16, sampleRate), at, sampleRate);
    if (k % 8 === 0) {
      mixInto(music, tone(midiToHz(ROOTS[bar] - 12), 0.9, 0.22, sampleRate), at, sampleRate);
    }
    if (k % 2 === 0) mixInto(music, kick(sampleRate), at, sampleRate);
    if (k % 4 === 2) mixInto(music, clap(random, sampleRate), at, sampleRate);
    if (k % 2 === 1) mixInto(music, hat(random, sampleRate), at, sampleRate);
  }

  // Short fade-in so the first sample does not click.
  for (let i = 0; i < Math.min(n, 0.05 * sampleRate); i++) music[i] *= i / (0.05 * sampleRate);

  const endStart = 0.75 * durationSeconds;
  [84, 88, 91, 96].forEach((midi, i) => {
    mixInto(music, tone(midiToHz(midi), 0.5, 0.1, sampleRate), endStart + i * 0.25, sampleRate);
  });
  mixInto(music, pop(random, sampleRate), 0, sampleRate);
  [72, 76, 79, 84].forEach((midi, i) => {
    mixInto(music, tone(midiToHz(midi), 0.4, 0.14, sampleRate), 0.05 + 0.07 * i, sampleRate);
  });
  mixInto(music, applause(random, sampleRate), endStart, sampleRate);

  let peak = 1e-9;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = Math.min(Math.max((durationSeconds - t) / 0.8, 0), 1);
    music[i] = Math.tanh(music[i] * 1.1) * fade;
    peak = Math.max(peak, Math.abs(music[i]));
  }
  for (let i = 0; i < n; i++) music[i] = (music[i] / peak) * 0.7;
  return music;
}
