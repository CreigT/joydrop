import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session-cookie";

// Logout is intentionally idempotent: clear the browser session even when
// the Firebase token has already expired or been revoked.
export async function POST() {
  cookies().set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
