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

export function birthdayUnlockDate(mmdd: string, now = new Date()) {
  const [month, day] = mmdd.split("-").map(Number);
  const birthday = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);
  if (birthday < startOfDay(now)) {
    birthday.setFullYear(now.getFullYear() + 1);
  }
  return birthday;
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
