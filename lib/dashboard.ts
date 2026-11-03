import { CARD_LIMITS } from "@/lib/cards";
import { isValidBirthdayMmDd, LIMITS } from "@/lib/input";

export type SentCardState = "sent" | "claimed" | "hidden" | "removed";

/** Plain status for a card the user sent. Deleted cards are not listed at all. */
export function sentCardState(card: { status: string; claimedByUid: string | null }): SentCardState {
  if (card.status === "reported" || card.status === "deleted") return "removed";
  if (card.status === "hidden") return "hidden";
  if (card.claimedByUid) return "claimed";
  return "sent";
}

export const SENT_CARD_LABELS: Record<SentCardState, string> = {
  sent: "Sent (not claimed yet)",
  claimed: "Claimed by the birthday person",
  hidden: "Hidden by the birthday person",
  removed: "Removed"
};

export type ProfileInput = { name: string; birthday: string };
export type ProfileError = "name" | "birthday";

/** Validates the "Edit profile" form. Name 1–100 characters; birthday a real month and day. */
export function parseProfileForm(form: {
  name: FormDataEntryValue | null;
  month: FormDataEntryValue | null;
  day: FormDataEntryValue | null;
}): { ok: true; value: ProfileInput } | { ok: false; error: ProfileError } {
  const name = String(form.name ?? "").trim().replace(/\s+/g, " ");
  if (!name || name.length > LIMITS.name || /[<>]/.test(name)) return { ok: false, error: "name" };
  const month = String(form.month ?? "").trim().padStart(2, "0");
  const day = String(form.day ?? "").trim().padStart(2, "0");
  const birthday = `${month}-${day}`;
  if (!/^\d{2}$/.test(month) || !/^\d{2}$/.test(day) || !isValidBirthdayMmDd(birthday)) {
    return { ok: false, error: "birthday" };
  }
  return { ok: true, value: { name, birthday } };
}

/** Messages shown on the dashboard after a form posts back (?notice=...). Unknown values show nothing. */
export const DASHBOARD_NOTICES: Record<string, { tone: "ok" | "error"; text: string }> = {
  profile_saved: { tone: "ok", text: "Profile saved." },
  profile_name: { tone: "error", text: `Enter a name up to ${CARD_LIMITS.name} characters (no < or >).` },
  profile_birthday: { tone: "error", text: "Pick a real month and day for your birthday." },
  profile_missing: { tone: "error", text: "Set up your birthday page first, then you can edit your profile." },
  card_deleted: { tone: "ok", text: "Card deleted. Its message and file link were cleared." },
  card_added: { tone: "ok", text: "Card added to your dashboard." }
};
