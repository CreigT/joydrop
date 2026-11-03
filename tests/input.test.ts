import { describe, expect, it } from "vitest";
import { isValidBirthdayMmDd, isValidEmail, parseAmount, isContributionType } from "@/lib/input";
import { safeNextPath } from "@/lib/safe-redirect";
import { isPageOpen } from "@/lib/birthday-page";
import { birthdayUnlockDate } from "@/lib/dates";

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
});

describe("birthday unlock time", () => {
  it("unlocks at midnight Pacific Time (standard and daylight time)", () => {
    const now = new Date("2026-11-03T05:00:00Z");
    // Dec 25 is PST (UTC-8): midnight Pacific = 08:00 UTC
    expect(birthdayUnlockDate("12-25", now).toISOString()).toBe("2026-12-25T08:00:00.000Z");
    // Jul 4 is PDT (UTC-7), next year
    expect(birthdayUnlockDate("07-04", now).toISOString()).toBe("2027-07-04T07:00:00.000Z");
  });
  it("keeps today's date while it is still the birthday in Pacific Time", () => {
    // 2026-11-03 05:00 UTC is still Nov 2 in Los Angeles
    const now = new Date("2026-11-03T05:00:00Z");
    expect(birthdayUnlockDate("11-02", now).toISOString()).toBe("2026-11-02T08:00:00.000Z");
    expect(birthdayUnlockDate("11-01", now).toISOString()).toBe("2027-11-01T07:00:00.000Z");
  });
});
