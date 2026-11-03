export const LIMITS = {
  name: 100,
  email: 254,
  message: 2000,
  guestbookMessage: 1000,
  giftTitle: 120,
  giftAmountMax: 1_000_000
} as const;

export const CONTRIBUTION_TYPES = ["text", "voice", "photo", "video", "gif"] as const;
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export function isContributionType(value: string): value is ContributionType {
  return (CONTRIBUTION_TYPES as readonly string[]).includes(value);
}

export function isValidEmail(value: string) {
  return value.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Validates an MM-DD birthday (Feb 29 allowed). */
export function isValidBirthdayMmDd(value: string) {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

/** Parses a whole, non-negative amount within the allowed range. Returns null if invalid. */
export function parseAmount(value: FormDataEntryValue | null) {
  if (value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.giftAmountMax) return null;
  return Math.round(n);
}

export function tooLong(value: string, max: number) {
  return value.length > max;
}
