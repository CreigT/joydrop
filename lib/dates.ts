export function formatBirthday(mmdd: string) {
  const [month, day] = mmdd.split("-");
  const date = new Date(2026, Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });
}

export function birthdayInNext30Days(mmdd: string, now = new Date()) {
  const [month, day] = mmdd.split("-").map(Number);
  const birthday = new Date(now.getFullYear(), month - 1, day);
  if (birthday < startOfDay(now)) {
    birthday.setFullYear(now.getFullYear() + 1);
  }
  const thirtyDays = new Date(now);
  thirtyDays.setDate(now.getDate() + 30);
  return birthday <= thirtyDays;
}

export function scheduledBirthdayDate(mmdd: string, now = new Date()) {
  const [month, day] = mmdd.split("-").map(Number);
  const birthday = new Date(now.getFullYear(), month - 1, day, 7, 0, 0, 0);
  if (birthday < startOfDay(now)) {
    birthday.setFullYear(now.getFullYear() + 1);
  }
  return birthday;
}

export const DEFAULT_TIMEZONE = "America/Los_Angeles";

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight on year-month-day in `timeZone`. */
export function midnightInTimeZone(year: number, month: number, day: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let result = guess - timeZoneOffsetMs(new Date(guess), timeZone);
  // Re-check once in case a DST change falls between the guess and the result.
  result = guess - timeZoneOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

/**
 * When the Birthday Bridge page unlocks: local midnight at the start of the
 * next birthday in the person's time zone. If today is the birthday, that is
 * today's midnight (so the page is already open).
 */
export function birthdayUnlockDate(mmdd: string, now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const [month, day] = mmdd.split("-").map(Number);
  const localYear = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(now)
  );
  for (const year of [localYear - 1, localYear, localYear + 1]) {
    const start = midnightInTimeZone(year, month, day, timeZone);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (end > now) {
      return start;
    }
  }
  return midnightInTimeZone(localYear + 1, month, day, timeZone);
}

export function isTodayBirthday(mmdd: string, now = new Date()) {
  const today = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return today === mmdd;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
