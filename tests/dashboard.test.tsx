import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DASHBOARD_NOTICES, parseProfileForm, sentCardState } from "@/lib/dashboard";

const cookieJar = vi.hoisted(() => ({ session: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => (cookieJar.session ? { value: cookieJar.session } : undefined) })
}));
const auth = vi.hoisted(() => ({ current: null as null | { uid: string } }));
vi.mock("@/lib/session", () => ({ getCurrentFirebaseUser: async () => auth.current }));

import { TopNav } from "@/components/TopNav";
import { MediaView } from "@/components/MediaView";
import { POST as logout } from "@/app/api/session/logout/route";
import { POST as profile } from "@/app/api/profile/route";
import { POST as mine } from "@/app/api/cards/mine/route";

function post(fields: Record<string, string>, accept = "application/json") {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request("http://localhost/x", { method: "POST", body, headers: { accept } });
}

describe("sent card status", () => {
  it("maps card state to a plain label key", () => {
    expect(sentCardState({ status: "active", claimedByUid: null })).toBe("sent");
    expect(sentCardState({ status: "active", claimedByUid: "u1" })).toBe("claimed");
    expect(sentCardState({ status: "hidden", claimedByUid: "u1" })).toBe("hidden");
    expect(sentCardState({ status: "reported", claimedByUid: null })).toBe("removed");
  });
});

describe("profile form", () => {
  it("accepts a name and a real birthday, trimming spaces", () => {
    expect(parseProfileForm({ name: "  Ana   Lee ", month: "2", day: "29" })).toEqual({
      ok: true,
      value: { name: "Ana Lee", birthday: "02-29" }
    });
  });

  it("rejects empty, too long, or tag-like names and impossible dates", () => {
    expect(parseProfileForm({ name: "", month: "01", day: "01" })).toEqual({ ok: false, error: "name" });
    expect(parseProfileForm({ name: "a".repeat(101), month: "01", day: "01" })).toEqual({ ok: false, error: "name" });
    expect(parseProfileForm({ name: "<img>", month: "01", day: "01" })).toEqual({ ok: false, error: "name" });
    expect(parseProfileForm({ name: "Ana", month: "04", day: "31" })).toEqual({ ok: false, error: "birthday" });
    expect(parseProfileForm({ name: "Ana", month: "00", day: "10" })).toEqual({ ok: false, error: "birthday" });
    expect(parseProfileForm({ name: "Ana", month: "1a", day: "10" })).toEqual({ ok: false, error: "birthday" });
    expect(parseProfileForm({ name: "Ana", month: null, day: null })).toEqual({ ok: false, error: "birthday" });
  });

  it("only shows known notices", () => {
    expect(DASHBOARD_NOTICES.profile_saved.text).toBe("Profile saved.");
    expect(DASHBOARD_NOTICES["<script>"]).toBeUndefined();
  });
});

describe("top navigation", () => {
  it("signed in: Dashboard, Make a card, Sign out", () => {
    cookieJar.session = "cookie";
    const html = renderToStaticMarkup(TopNav());
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain(">Make a card<");
    expect(html).toContain('action="/api/session/logout"');
    expect(html).toContain(">Sign out<");
  });

  it("signed out: Make a card and Sign in", () => {
    cookieJar.session = undefined;
    const html = renderToStaticMarkup(TopNav());
    expect(html).toContain(">Sign in<");
    expect(html).not.toContain("Sign out");
  });
});

describe("sign out", () => {
  it("clears the session cookie and returns home from a form", async () => {
    const res = await logout(post({}, "text/html"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/?signed_out=1");
    expect(res.headers.get("set-cookie")).toMatch(/joydrop_session=;/);
  });
});

describe("new endpoints need sign-in", () => {
  it("profile and dashboard card delete return 401 when signed out", async () => {
    auth.current = null;
    expect((await profile(post({ name: "A", month: "01", day: "01" }))).status).toBe(401);
    expect((await mine(post({ card_id: "abcdefghij12", action: "delete", confirm: "on" }))).status).toBe(401);
  });
});

describe("media", () => {
  it("videos play inline on phones and photos load lazily", () => {
    expect(renderToStaticMarkup(MediaView({ src: "https://x.test/v.mp4", type: "video", size: "large" }))).toMatch(
      /playsInline|playsinline/
    );
    expect(renderToStaticMarkup(MediaView({ src: "https://x.test/p.jpg", type: "photo" }))).toContain('loading="lazy"');
  });
});
