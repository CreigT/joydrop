import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { absoluteUrl } from "@/lib/share";
import { RESET_SENT_MESSAGE, isValidEmail, resetResult } from "@/lib/password-reset";

const requestHeaders = vi.hoisted(() => ({
  current: new Map<string, string>([
    ["x-forwarded-host", "joydrop-iota.vercel.app"],
    ["x-forwarded-proto", "https"]
  ])
}));

vi.mock("next/headers", () => ({
  headers: () => ({ get: (name: string) => requestHeaders.current.get(name) ?? null })
}));
vi.mock("@/components/ConfettiBurst", () => ({ ConfettiBurst: () => null }));

import Thanks from "@/app/thanks/page";

describe("full share links", () => {
  it("joins the origin and path, or falls back to the path", () => {
    expect(absoluteUrl("https://joydrop-iota.vercel.app", "/invite/abc")).toBe(
      "https://joydrop-iota.vercel.app/invite/abc"
    );
    expect(absoluteUrl("", "/invite/abc")).toBe("/invite/abc");
  });

  it("welcome page shows full https invite and birthday links with Copy buttons on first render", () => {
    const html = renderToStaticMarkup(Thanks({ searchParams: { user_id: "cmabc123" } }));
    expect(html).toContain('href="https://joydrop-iota.vercel.app/invite/cmabc123"');
    expect(html).toContain(">https://joydrop-iota.vercel.app/invite/cmabc123</a>");
    expect(html).toContain('href="https://joydrop-iota.vercel.app/birthday/cmabc123"');
    expect(html).toContain(">https://joydrop-iota.vercel.app/birthday/cmabc123</a>");
    expect(html.match(/>Copy</g)?.length).toBe(2);
    expect(html).not.toMatch(/>\/invite\//);
  });

  it("welcome page escapes an odd user id instead of building a different path", () => {
    const html = renderToStaticMarkup(Thanks({ searchParams: { user_id: "../x?y" } }));
    expect(html).toContain("https://joydrop-iota.vercel.app/invite/..%2Fx%3Fy");
  });
});

describe("forgot password", () => {
  it("shows the same neutral message whether or not the account exists", () => {
    expect(resetResult(null)).toEqual({ kind: "sent", message: RESET_SENT_MESSAGE });
    expect(resetResult({ code: "auth/user-not-found" })).toEqual({ kind: "sent", message: RESET_SENT_MESSAGE });
    expect(RESET_SENT_MESSAGE).toMatch(/If an account exists/);
  });

  it("explains invalid email, too many tries, and offline plainly", () => {
    expect(resetResult({ code: "auth/invalid-email" })).toEqual({ kind: "error", message: "Enter a valid email address." });
    expect(resetResult(new Error("Firebase: Error (auth/too-many-requests).")).message).toMatch(/Too many tries/);
    expect(resetResult({ code: "auth/network-request-failed" }).message).toMatch(/No connection/);
    expect(resetResult({ code: "auth/internal-error" })).toEqual({
      kind: "error",
      message: "We couldn't send a reset link right now. Try again later."
    });
  });

  it("checks the email before asking Firebase", () => {
    expect(isValidEmail("someone@example.com")).toBe(true);
    expect(isValidEmail(" someone@example.com ")).toBe(true);
    expect(isValidEmail("someone")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
