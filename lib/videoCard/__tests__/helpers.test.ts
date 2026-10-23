import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockInsideSafeArea,
  blocksDoNotOverlap,
  buildTimeline,
  cardFilename,
  cleanText,
  closingPreviewTime,
  computeClosingLayout,
  computeStageLayout,
  computeStillLayout,
  ensureReadableAccent,
  fitText,
  isCardReady,
  luminance,
  parseHex,
  pickMimeType,
  resolveCard,
  slugify,
  stagePreviewTime,
  wrapWords
} from "../helpers";
import { SAFE_RECT, STILL_SAFE_RECT, type CardInput, type MeasureText } from "../types";

/** Fake font: every character is 0.62 em wide. */
const measure: MeasureText = (text, size) => text.length * size * 0.62;

describe("cleanText", () => {
  it("collapses whitespace, strips control characters, caps length", () => {
    assert.equal(cleanText("  Hi \n\t there\u0000 ", 40), "Hi there");
    assert.equal(cleanText("abcdefghij", 4), "abcd");
    assert.equal(cleanText(42 as unknown, 10), "");
  });
  it("turns curly apostrophes into straight ones", () => {
    assert.equal(cleanText("O\u2019neal", 20), "O'neal");
  });
  it("does not split emoji in half", () => {
    assert.equal(cleanText("🎉🎉🎉", 2), "🎉🎉");
  });
});

describe("colour helpers", () => {
  it("parses short and long hex", () => {
    assert.deepEqual(parseHex("#fa0"), [255, 170, 0]);
    assert.deepEqual(parseHex("FAC846"), [250, 200, 70]);
    assert.equal(parseHex("nope"), null);
  });
  it("brightens dark colours so text is readable on navy", () => {
    const dark = ensureReadableAccent([10, 10, 40]);
    assert.ok(luminance(dark) >= 0.35);
    const bright = ensureReadableAccent([250, 200, 70]);
    assert.deepEqual(bright, [250, 200, 70]);
  });
});

describe("resolveCard", () => {
  it("applies template defaults and upper-cases the headline and name", () => {
    const card = resolveCard({ type: "birthday", recipientName: "Ana" });
    assert.equal(card.headline, "HAPPY BIRTHDAY!");
    assert.equal(card.name, "ANA");
    assert.equal(card.subtitle, "Wishing you a day full of joy");
    assert.equal(card.fromLine, "");
  });
  it("builds the From line once", () => {
    assert.equal(resolveCard({ type: "thank-you", senderName: "the Creigs" }).fromLine, "From the Creigs");
    assert.equal(resolveCard({ type: "thank-you", senderName: "From Bob" }).fromLine, "From Bob");
  });
  it("uses overrides and falls back for an unknown type", () => {
    const card = resolveCard({
      type: "nope" as never,
      headline: "woohoo",
      subtitle: "for the BIG favor"
    });
    assert.equal(card.type, "birthday");
    assert.equal(card.headline, "WOOHOO");
    assert.equal(card.subtitle, "for the BIG favor");
  });
  it("needs a recipient name to be ready", () => {
    assert.equal(isCardReady({ type: "birthday" }), false);
    assert.equal(isCardReady({ type: "birthday", recipientName: "  " }), false);
    assert.equal(isCardReady({ type: "birthday", recipientName: "Jo" }), true);
  });
});

describe("timeline", () => {
  const full = resolveCard({
    type: "thank-you",
    recipientName: "Ana",
    message: "Thanks so much"
  });
  it("matches the reference pacing for four blocks", () => {
    const t = buildTimeline(full);
    assert.equal(t.duration, 14);
    assert.deepEqual(t.bursts, [0, 10.5]);
    assert.ok(Math.abs((t.reveal.headline ?? -1) - 0.25) < 1e-9);
    assert.ok(Math.abs((t.reveal.message ?? -1) - 7.3) < 1e-9);
    assert.ok(Math.abs(t.endStart - 10.5) < 1e-9);
  });
  it("orders reveals and ends the stage before the end card", () => {
    const t = buildTimeline(full);
    const times = [t.reveal.headline, t.reveal.name, t.reveal.subtitle, t.reveal.message] as number[];
    assert.deepEqual([...times].sort((a, b) => a - b), times);
    assert.ok(t.mainFadeStart < t.endStart && t.endStart < t.fadeOutStart && t.fadeOutStart < t.duration);
  });
  it("skips missing blocks and scales with a longer duration", () => {
    const small = resolveCard({ type: "birthday" });
    const t = buildTimeline(small, 25);
    assert.equal(t.reveal.name, undefined);
    assert.equal(t.reveal.message, undefined);
    assert.ok(t.endStart > 18);
    assert.ok(t.fadeOutStart < 25);
  });
  it("preview times sit inside the right part of the video", () => {
    const t = buildTimeline(full);
    assert.ok(stagePreviewTime(t) < t.mainFadeStart);
    assert.ok(closingPreviewTime(t) > t.endStart && closingPreviewTime(t) < t.fadeOutStart);
  });
});

describe("fitText", () => {
  const options = { maxWidth: 800, maxLines: 2, startSize: 170, minSize: 60 };
  it("keeps the start size when it fits", () => {
    const fit = fitText(measure, "HI", options);
    assert.equal(fit.fontSize, 170);
    assert.deepEqual(fit.lines, ["HI"]);
  });
  it("shrinks so a line never exceeds the max width", () => {
    const fit = fitText(measure, "CONGRATULATIONS!", options);
    assert.ok(fit.fontSize < 170);
    assert.ok(fit.width <= 800);
    assert.equal(fit.lines.length, 1);
  });
  it("wraps onto a second line when that allows bigger text", () => {
    const fit = fitText(measure, "HAPPY BIRTHDAY!", options);
    assert.equal(fit.lines.length, 2);
    assert.ok(fit.width <= 800);
  });
  it("prefers one line when it is big enough", () => {
    const fit = fitText(measure, "THANK YOU", { ...options, singleLinePreferredSize: 80 });
    assert.equal(fit.lines.length, 1);
    assert.ok(fit.fontSize >= 80);
  });
  it("breaks very long words and adds an ellipsis instead of cutting off", () => {
    const fit = fitText(measure, "A".repeat(200), { maxWidth: 800, maxLines: 2, startSize: 90, minSize: 40 });
    assert.equal(fit.truncated, true);
    assert.equal(fit.lines.length, 2);
    assert.ok(fit.lines[1].endsWith("\u2026"));
    assert.ok(fit.width <= 800);
  });
  it("returns an empty result for empty text", () => {
    const fit = fitText(measure, "   ", options);
    assert.deepEqual(fit.lines, []);
    assert.equal(fit.height, 0);
  });
  it("wrapWords returns null when one word is wider than the box", () => {
    assert.equal(wrapWords(measure, "ABCDEFGHIJKLMNOP", 100, 200), null);
    assert.deepEqual(wrapWords(measure, "aa bb cc", 100, 400), ["aa bb", "cc"]);
  });
});

const SAMPLES: CardInput[] = [
  { type: "birthday", recipientName: "Ana" },
  { type: "thank-you", recipientName: "O'Neal", subtitle: "for the BIG favor", message: "We are so grateful!", senderName: "the Creigs" },
  { type: "celebration", recipientName: "Maximilian Alexander Montgomery-Wellington III", subtitle: "on your amazing and well deserved promotion", message: "x ".repeat(70), senderName: "Everyone at the office on the fourth floor" },
  { type: "birthday", recipientName: "W".repeat(40), headline: "H".repeat(30), subtitle: "S".repeat(60), message: "M".repeat(140), senderName: "F".repeat(40) },
  { type: "thank-you", recipientName: "Zoë 🎉", message: "Thank you thank you thank you thank you thank you thank you thank you thank you thank you thank you thank you" }
];

describe("layouts keep text inside the safe margins", () => {
  SAMPLES.forEach((input, index) => {
    const card = resolveCard(input);
    it(`stage layout #${index}`, () => {
      const stage = computeStageLayout(card, measure);
      assert.ok(stage.blocks.length >= 2);
      for (const block of stage.blocks) {
        assert.ok(blockInsideSafeArea(block), `${block.id} outside safe area`);
        assert.ok(block.width <= 800 + 0.5, `${block.id} too wide`);
        assert.ok(block.lines.length > 0);
      }
      assert.ok(blocksDoNotOverlap(stage.blocks));
    });
    it(`closing layout #${index}`, () => {
      const closing = computeClosingLayout(card, measure);
      for (const block of closing.blocks) assert.ok(blockInsideSafeArea(block));
      assert.ok(blocksDoNotOverlap(closing.blocks));
      const last = closing.blocks[closing.blocks.length - 1];
      assert.ok(closing.heartsCenterY > last.centerY + last.height / 2);
      assert.ok(closing.heartsCenterY + 130 <= SAFE_RECT.y + SAFE_RECT.height + 0.5);
    });
    it(`still layout #${index}`, () => {
      const still = computeStillLayout(card, measure);
      for (const block of still.blocks) {
        assert.ok(blockInsideSafeArea(block, STILL_SAFE_RECT), `${block.id} outside still safe area`);
      }
      assert.ok(blocksDoNotOverlap(still.blocks));
    });
  });
  it("safe margins are at least 120px at the sides and 250px top and bottom", () => {
    assert.ok(SAFE_RECT.x >= 120);
    assert.ok(1080 - (SAFE_RECT.x + SAFE_RECT.width) >= 120);
    assert.ok(SAFE_RECT.y >= 250);
    assert.ok(1920 - (SAFE_RECT.y + SAFE_RECT.height) >= 250);
  });
});

describe("files and formats", () => {
  it("slugifies names", () => {
    assert.equal(slugify("O'NEAL"), "o-neal");
    assert.equal(slugify("!!!"), "card");
    assert.equal(cardFilename({ type: "thank-you", name: "O'NEAL" }, "mp4"), "joydrop-thank-you-card-o-neal.mp4");
  });
  it("prefers mp4 and falls back to webm", () => {
    assert.equal(pickMimeType(() => true)?.extension, "mp4");
    assert.equal(pickMimeType((m) => m.startsWith("video/webm"))?.extension, "webm");
    assert.equal(pickMimeType(() => false), null);
  });
});
