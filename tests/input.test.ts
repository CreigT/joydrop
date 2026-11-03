import { describe, expect, it } from "vitest";
import { isValidBirthdayMmDd, isValidEmail, parseAmount, isContributionType } from "@/lib/input";
import { safeNextPath } from "@/lib/safe-redirect";
import { isPageOpen, isSurprisePublishable } from "@/lib/birthday-page";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/onboarding?x=1")).toBe("/onboarding?x=1");
  });
  it("blocks open redirects and script URLs", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", undefined]) {
      expect(safeNextPath(bad as string | undefined)).toBe("/dashboard");
    }
  });
});

describe("input validation", () => {
  it("validates birthdays", () => {
    expect(isValidBirthdayMmDd("02-29")).toBe(true);
    expect(isValidBirthdayMmDd("12-31")).toBe(true);
    expect(isValidBirthdayMmDd("02-30")).toBe(false);
    expect(isValidBirthdayMmDd("13-01")).toBe(false);
    expect(isValidBirthdayMmDd("ab-cd")).toBe(false);
  });
  it("validates emails, amounts, and types", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(parseAmount("25")).toBe(25);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("1e12")).toBeNull();
    expect(isContributionType("photo")).toBe(true);
    expect(isContributionType("exe")).toBe(false);
  });
});

describe("birthday page rules", () => {
  it("opens when unlocked or after unlock time", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 100000);
    expect(isPageOpen({ isLocked: false, unlockAt: future })).toBe(true);
    expect(isPageOpen({ isLocked: true, unlockAt: past })).toBe(true);
    expect(isPageOpen({ isLocked: true, unlockAt: future })).toBe(false);
  });
  it("only shows approved or sent speeches", () => {
    expect(isSurprisePublishable({ status: "draft" })).toBe(false);
    expect(isSurprisePublishable({ status: "approved" })).toBe(true);
    expect(isSurprisePublishable({ status: "sent", soft_delete: true })).toBe(false);
    expect(isSurprisePublishable(null)).toBe(false);
  });
});
