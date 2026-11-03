import { createHash, randomBytes } from "crypto";

export const CARD_LIMITS = {
  name: 100,
  message: 2000
} as const;

export const CARD_STATUSES = ["active", "hidden", "reported", "deleted"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

/** 24 random bytes → 32-character URL-safe token (192 bits). */
export function newCardToken() {
  return randomBytes(24).toString("base64url");
}

/** 32 random bytes → 43-character URL-safe token for the sender's manage link. */
export function newManageToken() {
  return randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Tokens are base64url; reject anything else before touching the database. */
export function isWellFormedToken(token: string, minLength = 32) {
  return token.length >= minLength && token.length <= 64 && /^[A-Za-z0-9_-]+$/.test(token);
}

/** Media kind for an uploaded card file, from its MIME type. */
export function cardMediaKind(mime: string): "photo" | "gif" | "video" | "voice" | null {
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "voice";
  return null;
}

type CardAccess = { status: string; claimedByUid: string | null };

/**
 * Who may change a card from its link:
 * - "report" is open to anyone holding the link and removes the card for good.
 * - Before the card is claimed, the link holder (the birthday person) may hide, show, or delete it.
 * - After it is claimed, only the signed-in claimer may hide, show, or delete it.
 * - "claim" needs a signed-in user and an unclaimed card (or the same claimer).
 */
export function cardActionAllowed(
  card: CardAccess,
  action: string,
  sessionUid: string | null
): { ok: true } | { ok: false; status: 400 | 401 | 403 | 404 | 409 } {
  if (card.status === "deleted" || card.status === "reported") return { ok: false, status: 404 };
  if (action === "report") return { ok: true };
  if (action === "claim") {
    if (!sessionUid) return { ok: false, status: 401 };
    if (card.claimedByUid && card.claimedByUid !== sessionUid) return { ok: false, status: 409 };
    return { ok: true };
  }
  if (action !== "hide" && action !== "show" && action !== "delete") return { ok: false, status: 400 };
  if (card.claimedByUid) {
    if (!sessionUid) return { ok: false, status: 401 };
    if (card.claimedByUid !== sessionUid) return { ok: false, status: 403 };
  }
  return { ok: true };
}
