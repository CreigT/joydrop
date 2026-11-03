import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cardActionAllowed,
  cardMediaKind,
  hashManageToken,
  isWellFormedToken,
  newCardToken,
  newManageToken
} from "@/lib/cards";
import { mailtoHref, shareText, smsHref } from "@/lib/share";

const session = vi.hoisted(() => ({ current: null as null | { uid: string } }));
const db = vi.hoisted(() => ({
  card: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() }
}));
const storage = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock("@/lib/session", () => ({ getCurrentFirebaseUser: async () => session.current }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/storage", () => ({ uploadContributionFile: storage.upload }));
vi.mock("@/lib/database", () => ({
  hasDatabaseUrl: () => true,
  databaseUnavailableResponse: () => Response.json({ error: "unavailable" }, { status: 503 })
}));

import { POST as createCard } from "@/app/api/cards/route";
import { POST as cardAction } from "@/app/api/cards/[token]/route";
import { POST as manageCard } from "@/app/api/cards/manage/route";

let ipCounter = 0;
function form(url: string, fields: Record<string, string | File>, accept = "application/json", ip?: string) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request(url, {
    method: "POST",
    body,
    headers: { accept, "x-forwarded-for": ip ?? `10.0.0.${++ipCounter}` }
  });
}

const VALID = {
  recipient_name: "Test Recipient",
  sender_name: "Test Sender",
  message: "TEST DATA - happy birthday",
  permission_checkbox: "on"
};
const TOKEN = "A".repeat(32);
const card = (over: Record<string, unknown> = {}) => ({
  id: "card_1",
  token: TOKEN,
  status: "active",
  claimedByUid: null,
  ...over
});

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
});

describe("card helpers", () => {
  it("makes long, URL-safe, unique tokens", () => {
    const a = newCardToken();
    const b = newCardToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(newManageToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken(newManageToken(), 40)).toBe(true);
  });

  it("rejects short or odd tokens", () => {
    expect(isWellFormedToken("abc")).toBe(false);
    expect(isWellFormedToken("A".repeat(31) + "/")).toBe(false);
    expect(isWellFormedToken("A".repeat(65))).toBe(false);
  });

  it("hashes manage tokens with SHA-256", () => {
    expect(hashManageToken("x")).toHaveLength(64);
    expect(hashManageToken("x")).toBe(hashManageToken("x"));
  });

  it("maps media types", () => {
    expect(cardMediaKind("image/gif")).toBe("gif");
    expect(cardMediaKind("image/png")).toBe("photo");
    expect(cardMediaKind("video/mp4")).toBe("video");
    expect(cardMediaKind("audio/mpeg")).toBe("voice");
    expect(cardMediaKind("application/pdf")).toBeNull();
  });

  it("builds sms and mailto links with the card link filled in", () => {
    const text = shareText("Ana", "Ben", "https://example.test/card/abc");
    expect(smsHref(text)).toBe(`sms:?&body=${encodeURIComponent(text)}`);
    expect(decodeURIComponent(smsHref(text))).toContain("https://example.test/card/abc");
    const mail = mailtoHref("Ana & Co", text);
    expect(mail.startsWith("mailto:?subject=")).toBe(true);
    expect(mail).toContain(encodeURIComponent("Ana & Co"));
    expect(mail).not.toContain(" ");
  });

  it("applies the access rules", () => {
    expect(cardActionAllowed(card(), "hide", null)).toEqual({ ok: true });
    expect(cardActionAllowed(card(), "claim", null)).toEqual({ ok: false, status: 401 });
    expect(cardActionAllowed(card(), "claim", "u1")).toEqual({ ok: true });
    expect(cardActionAllowed(card(), "nope", null)).toEqual({ ok: false, status: 400 });
    const claimed = card({ claimedByUid: "u1" });
    expect(cardActionAllowed(claimed, "delete", null)).toEqual({ ok: false, status: 401 });
    expect(cardActionAllowed(claimed, "delete", "u2")).toEqual({ ok: false, status: 403 });
    expect(cardActionAllowed(claimed, "delete", "u1")).toEqual({ ok: true });
    expect(cardActionAllowed(claimed, "claim", "u2")).toEqual({ ok: false, status: 409 });
    expect(cardActionAllowed(claimed, "report", null)).toEqual({ ok: true });
    expect(cardActionAllowed(card({ status: "reported" }), "show", null)).toEqual({ ok: false, status: 404 });
    expect(cardActionAllowed(card({ status: "deleted" }), "report", null)).toEqual({ ok: false, status: 404 });
  });
});

describe("POST /api/cards", () => {
  it("creates a card without sign-in and redirects to the private share page", async () => {
    db.card.create.mockResolvedValue({});
    const res = await createCard(form("http://x/api/cards", VALID));
    expect(res.status).toBe(303);
    const location = res.headers.get("location")!;
    const manageToken = location.split("/send/")[1];
    expect(isWellFormedToken(manageToken, 40)).toBe(true);
    const data = db.card.create.mock.calls[0][0].data;
    expect(data.manageTokenHash).toBe(hashManageToken(manageToken));
    expect(JSON.stringify(data)).not.toContain(manageToken);
    expect(isWellFormedToken(data.token)).toBe(true);
    expect(data.mediaUrl).toBeNull();
  });

  it("requires names, a message, and the permission box", async () => {
    for (const missing of Object.keys(VALID)) {
      const fields: Record<string, string> = { ...VALID };
      delete fields[missing];
      const res = await createCard(form("http://x/api/cards", fields));
      expect(res.status).toBe(400);
    }
    expect(db.card.create).not.toHaveBeenCalled();
  });

  it("rejects overlong input", async () => {
    const res = await createCard(form("http://x/api/cards", { ...VALID, message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
    const res2 = await createCard(form("http://x/api/cards", { ...VALID, sender_name: "x".repeat(101) }));
    expect(res2.status).toBe(400);
  });

  it("rejects wrong file types and files over 4 MB", async () => {
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect((await createCard(form("http://x/api/cards", { ...VALID, media: pdf }))).status).toBe(400);
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "a.jpg", { type: "image/jpeg" });
    expect((await createCard(form("http://x/api/cards", { ...VALID, media: big }))).status).toBe(400);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("uploads an allowed file", async () => {
    storage.upload.mockResolvedValue("https://storage.test/file");
    db.card.create.mockResolvedValue({});
    const img = new File(["x"], "a.png", { type: "image/png" });
    const res = await createCard(form("http://x/api/cards", { ...VALID, media: img }));
    expect(res.status).toBe(303);
    expect(db.card.create.mock.calls[0][0].data).toMatchObject({ mediaUrl: "https://storage.test/file", mediaType: "photo" });
  });

  it("rate-limits one address", async () => {
    db.card.create.mockResolvedValue({});
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await createCard(form("http://x/api/cards", VALID, "application/json", "10.9.9.9"))).status);
    }
    expect(statuses).toContain(429);
  });
});

describe("POST /api/cards/[token]", () => {
  const act = (action: string, accept?: string) =>
    cardAction(form(`http://x/api/cards/${TOKEN}`, { action }, accept), { params: { token: TOKEN } });

  it("404s for malformed or unknown tokens without a lookup", async () => {
    const res = await cardAction(form("http://x/api/cards/bad", { action: "hide" }), { params: { token: "bad" } });
    expect(res.status).toBe(404);
    expect(db.card.findUnique).not.toHaveBeenCalled();
    db.card.findUnique.mockResolvedValue(null);
    expect((await act("hide")).status).toBe(404);
  });

  it("lets the link holder hide an unclaimed card", async () => {
    db.card.findUnique.mockResolvedValue(card());
    const res = await act("hide");
    expect(res.status).toBe(200);
    expect(db.card.update).toHaveBeenCalledWith({ where: { id: "card_1" }, data: { status: "hidden" } });
  });

  it("clears content when reported and redirects browsers", async () => {
    db.card.findUnique.mockResolvedValue(card({ claimedByUid: "u1" }));
    const res = await act("report", "text/html");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://x/card/removed");
    expect(db.card.update.mock.calls[0][0].data).toEqual({
      status: "reported",
      message: "",
      mediaUrl: null,
      mediaType: null
    });
  });

  it("needs sign-in to claim, then saves the claimer", async () => {
    db.card.findUnique.mockResolvedValue(card());
    expect((await act("claim")).status).toBe(401);
    session.current = { uid: "u1" };
    expect((await act("claim")).status).toBe(200);
    expect(db.card.update).toHaveBeenCalledWith({ where: { id: "card_1" }, data: { claimedByUid: "u1" } });
  });

  it("blocks other people from changing a claimed card", async () => {
    db.card.findUnique.mockResolvedValue(card({ claimedByUid: "u1" }));
    session.current = { uid: "u2" };
    expect((await act("delete")).status).toBe(403);
    expect((await act("claim")).status).toBe(409);
    expect(db.card.update).not.toHaveBeenCalled();
  });
});

describe("POST /api/cards/manage", () => {
  it("deletes with the right manage token only", async () => {
    const manage = newManageToken();
    db.card.findUnique.mockResolvedValue(null);
    expect((await manageCard(form("http://x/api/cards/manage", { manage_token: manage, action: "delete" }))).status).toBe(404);
    expect(db.card.findUnique).toHaveBeenCalledWith({ where: { manageTokenHash: hashManageToken(manage) } });

    db.card.findUnique.mockResolvedValue(card());
    const res = await manageCard(form("http://x/api/cards/manage", { manage_token: manage, action: "delete" }));
    expect(res.status).toBe(200);
    expect(db.card.update.mock.calls[0][0].data.status).toBe("deleted");
  });

  it("rejects short tokens and unknown actions", async () => {
    expect((await manageCard(form("http://x/api/cards/manage", { manage_token: "short", action: "delete" }))).status).toBe(404);
    expect((await manageCard(form("http://x/api/cards/manage", { manage_token: newManageToken(), action: "edit" }))).status).toBe(400);
    expect(db.card.findUnique).not.toHaveBeenCalled();
  });
});
