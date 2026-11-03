import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ current: null as null | { uid: string; email?: string } }));

const db = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn()
  },
  birthdayPage: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn()
  },
  contribution: { updateMany: vi.fn(), findMany: vi.fn() },
  surprise: { updateMany: vi.fn() },
  guestbookEntry: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  gift: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
  card: { findMany: vi.fn(), updateMany: vi.fn() },
  $transaction: vi.fn()
}));

vi.mock("@/lib/session", () => ({
  getCurrentFirebaseUser: async () => session.current,
  displayNameFromToken: () => "Friend"
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/database", () => ({
  hasDatabaseUrl: () => true,
  databaseUnavailableResponse: () => Response.json({ error: "unavailable" }, { status: 503 })
}));

import { GET as pauseGet, POST as pausePost } from "@/app/api/pause/route";
import { POST as privacyPost } from "@/app/api/birthday/[userId]/privacy/route";
import { GET as exportGet } from "@/app/api/me/export/route";
import { DELETE as meDelete, POST as mePost } from "@/app/api/me/route";
import { POST as guestbookPost } from "@/app/api/birthday/[userId]/guestbook/route";
import { GET as pdfGet } from "@/app/api/birthday/[userId]/generate-pdf/route";
import { GET as publicPageGet } from "@/app/api/birthday/[userId]/route";
import { GET as cronGet } from "@/app/api/cron/daily/route";

const OWNER = { id: "user_owner", firebaseUid: "uid_owner", soft_delete: false, paused_bool: false };

function form(url: string, fields: Record<string, string>, accept = "application/json") {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request(url, { method: "POST", body, headers: { accept } });
}

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
  db.card.findMany.mockResolvedValue([]);
  db.card.updateMany.mockResolvedValue({ count: 0 });
});

describe("/api/pause", () => {
  it("returns 401 when not signed in", async () => {
    const res = await pausePost(form("http://x/api/pause", { user_id: OWNER.id }));
    expect(res.status).toBe(401);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("returns 403 when pausing someone else's account", async () => {
    session.current = { uid: OWNER.firebaseUid };
    db.user.findFirst.mockResolvedValue(OWNER);
    const res = await pausePost(form("http://x/api/pause", { user_id: "user_victim" }));
    expect(res.status).toBe(403);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("pauses the caller's own account", async () => {
    session.current = { uid: OWNER.firebaseUid };
    db.user.findFirst.mockResolvedValue(OWNER);
    const res = await pausePost(form("http://x/api/pause", { user_id: OWNER.id }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ paused: true });
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { firebaseUid: OWNER.firebaseUid, soft_delete: false }
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: OWNER.id },
      data: { paused_bool: true }
    });
  });

  it("resumes the caller's own account and redirects browsers to the dashboard", async () => {
    session.current = { uid: OWNER.firebaseUid };
    db.user.findFirst.mockResolvedValue(OWNER);
    const res = await pausePost(
      form("http://x/api/pause", { user_id: OWNER.id, action: "resume" }, "text/html")
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://x/dashboard");
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: OWNER.id },
      data: { paused_bool: false }
    });
  });

  it("no longer changes anything on GET", async () => {
    const res = pauseGet();
    expect(res.status).toBe(405);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("erase form returns 401 before the confirm check when not signed in", async () => {
    const res = await mePost(form("http://x/api/me", {}));
    expect(res.status).toBe(401);
    session.current = { uid: "uid_owner" };
    expect((await mePost(form("http://x/api/me", {}))).status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("/api/birthday/[userId]/privacy", () => {
  const page = { userId: OWNER.id, user: OWNER };

  it("returns 401 when not signed in", async () => {
    const res = await privacyPost(form("http://x", { action: "delete" }), { params: { userId: OWNER.id } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for another user's page", async () => {
    session.current = { uid: "uid_attacker" };
    db.birthdayPage.findUnique.mockResolvedValue(page);
    const res = await privacyPost(form("http://x", { action: "delete" }), { params: { userId: OWNER.id } });
    expect(res.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("lets the owner hide their page", async () => {
    session.current = { uid: OWNER.firebaseUid };
    db.birthdayPage.findUnique.mockResolvedValue(page);
    const res = await privacyPost(form("http://x", { action: "pause" }), { params: { userId: OWNER.id } });
    expect(res.status).toBe(303);
    expect(db.birthdayPage.update).toHaveBeenCalledWith({
      where: { userId: OWNER.id },
      data: { soft_delete: true, isPublic: false }
    });
  });
});

describe("/api/me and /api/me/export", () => {
  it("export returns 401 when not signed in", async () => {
    const res = await exportGet();
    expect(res.status).toBe(401);
  });

  it("export looks up the account by login id only, never by email", async () => {
    session.current = { uid: "uid_attacker", email: "victim@example.com" };
    db.user.findFirst.mockResolvedValue(null);
    const res = await exportGet();
    expect(res.status).toBe(404);
    const where = db.user.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ firebaseUid: "uid_attacker" });
  });

  it("erase returns 401 when not signed in and matches by login id only", async () => {
    expect((await meDelete()).status).toBe(401);
    session.current = { uid: "uid_attacker", email: "victim@example.com" };
    db.user.findFirst.mockResolvedValue(null);
    const res = await meDelete();
    expect(res.status).toBe(404);
    expect(db.user.findFirst.mock.calls[0][0].where).toEqual({
      firebaseUid: "uid_attacker",
      soft_delete: false
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe("/api/birthday/[userId]/generate-pdf", () => {
  it("401 without session, 403 for another user's id", async () => {
    const ctx = { params: { userId: OWNER.id } };
    expect((await pdfGet(new Request("http://x"), ctx)).status).toBe(401);
    session.current = { uid: "uid_attacker" };
    db.user.findUnique.mockResolvedValue(OWNER);
    expect((await pdfGet(new Request("http://x"), ctx)).status).toBe(403);
  });
});

describe("visitor writes and public reads respect the lock", () => {
  const future = new Date(Date.now() + 86400000);
  const lockedPage = {
    id: "page1",
    userId: OWNER.id,
    isLocked: true,
    unlockAt: future,
    soft_delete: false,
    user: { ...OWNER, name: "Sam", email: "sam@example.com" },
  };

  it("guestbook refuses entries on a locked page", async () => {
    db.birthdayPage.findUnique.mockResolvedValue(lockedPage);
    const res = await guestbookPost(
      form("http://x", { name: "A", message: "hi" }),
      { params: { userId: OWNER.id } }
    );
    expect(res.status).toBe(404);
    expect(db.guestbookEntry.create).not.toHaveBeenCalled();
  });

  it("guestbook rejects oversized messages", async () => {
    const res = await guestbookPost(
      form("http://x", { name: "A", message: "x".repeat(5000) }),
      { params: { userId: OWNER.id } }
    );
    expect(res.status).toBe(400);
  });

  it("public page API leaks no email/login id and no content before unlock", async () => {
    db.birthdayPage.findUnique.mockResolvedValue(lockedPage);
    const res = await publicPageGet(new Request("http://x"), { params: { userId: OWNER.id } });
    const json = await res.json();
    const text = JSON.stringify(json);
    expect(text).not.toContain("sam@example.com");
    expect(text).not.toContain("uid_owner");
    expect(text).not.toContain("secret");
    expect(json.contributions).toEqual([]);
    expect(db.contribution.findMany).not.toHaveBeenCalled();
  });
});

describe("/api/cron/daily", () => {
  it("rejects the secret in the query string and wrong bearer tokens", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-test-value");
    expect((await cronGet(new Request("http://x/api/cron/daily?secret=s3cret-test-value"))).status).toBe(401);
    expect(
      (await cronGet(new Request("http://x/api/cron/daily", { headers: { authorization: "Bearer nope" } }))).status
    ).toBe(401);
    vi.unstubAllEnvs();
  });

  it("with the bearer secret, unlocks due pages without needing a speech", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-test-value");
    vi.stubEnv("DATABASE_URL", "postgres://test");
    db.contribution.updateMany.mockResolvedValue({ count: 0 });
    db.birthdayPage.findMany.mockResolvedValue([{ id: "page1", userId: OWNER.id }]);
    const res = await cronGet(
      new Request("http://x/api/cron/daily", { headers: { authorization: "Bearer s3cret-test-value" } })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, unlocked: 1, expiredUnapproved: 0 });
    const where = db.birthdayPage.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("surprise");
    expect(where.user).toEqual({ paused_bool: false, soft_delete: false });
    expect(db.contribution.updateMany.mock.calls[0][0].where.isApproved).toBe(false);
    expect(db.birthdayPage.update).toHaveBeenCalledWith({ where: { id: "page1" }, data: { isLocked: false } });
    vi.unstubAllEnvs();
  });
});
