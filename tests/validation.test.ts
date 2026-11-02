import { describe, it, expect, beforeEach } from "vitest";
import { validateContributionFile, checkRateLimit } from "../lib/validation";

// Helper to create a mock File
function mockFile(size: number, type: string, name = "test.file"): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("validateContributionFile", () => {
  it("returns null for null or empty file", () => {
    expect(validateContributionFile(null, "photo")).toBeNull();
    expect(validateContributionFile(mockFile(0, "image/jpeg"), "photo")).toBeNull();
  });

  it("rejects files larger than 10 MB", () => {
    const big = mockFile(11 * 1024 * 1024, "image/jpeg");
    expect(validateContributionFile(big, "photo")).toContain("File too large");
  });

  it("accepts files under 10 MB with allowed type", () => {
    const ok = mockFile(1 * 1024 * 1024, "image/jpeg");
    expect(validateContributionFile(ok, "photo")).toBeNull();
  });

  it("rejects disallowed MIME type", () => {
    const bad = mockFile(1000, "application/pdf", "doc.pdf");
    expect(validateContributionFile(bad, "photo")).toContain("Invalid file type");
  });

  it("allows gif for gif kind", () => {
    const gif = mockFile(1000, "image/gif");
    expect(validateContributionFile(gif, "gif")).toBeNull();
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Clear the module-level map by re-importing is hard; we test sequential behavior
  });

  it("allows first 5 requests from same IP", () => {
    const ip = "test-ip-" + Date.now();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
  });

  it("blocks the 6th request within the window", () => {
    const ip = "rate-test-" + Date.now();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip)).toBe(false);
  });
});
