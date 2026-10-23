import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBokeh, buildParticles, particleState } from "../confetti";
import { generateCardAudio } from "../audio";
import { buildTimeline, resolveCard } from "../helpers";

describe("generateCardAudio", () => {
  const sampleRate = 8000;
  const samples = generateCardAudio(14, sampleRate);
  it("has the right length and valid, normalised samples", () => {
    assert.equal(samples.length, 14 * sampleRate);
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      assert.ok(Number.isFinite(samples[i]));
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    assert.ok(peak > 0.6 && peak <= 0.7 + 1e-6, `peak ${peak}`);
  });
  it("is not silent in the middle, fades out at the end", () => {
    const energy = (from: number, to: number) => {
      let sum = 0;
      for (let i = from * sampleRate; i < to * sampleRate; i++) sum += samples[i] * samples[i];
      return sum;
    };
    assert.ok(energy(5, 6) > 0.1);
    assert.ok(energy(13.9, 14) < energy(5, 5.1));
  });
  it("is deterministic for a seed", () => {
    const again = generateCardAudio(14, sampleRate);
    assert.deepEqual(Array.from(again.slice(1000, 1010)), Array.from(samples.slice(1000, 1010)));
  });
});

describe("confetti", () => {
  const timeline = buildTimeline(resolveCard({ type: "birthday", recipientName: "A" }));
  const particles = buildParticles(timeline);
  it("builds the same particles every time", () => {
    assert.equal(particles.length, buildParticles(timeline).length);
    assert.equal(particles[0].x, buildParticles(timeline)[0].x);
    assert.ok(particles.length > 400);
  });
  it("is hidden before its start time and moves afterwards", () => {
    const burst = particles[0];
    assert.equal(particleState(burst, -1).visible, false);
    const a = particleState(burst, 0.2);
    const b = particleState(burst, 0.4);
    assert.ok(a.visible && b.visible);
    assert.notEqual(a.y, b.y);
  });
  it("makes bokeh dots", () => {
    assert.equal(buildBokeh(10).length, 10);
  });
});
