import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { sessionCookieName } from "@/lib/session-cookie";

const sessionDurationMs = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (origin && origin !== expectedOrigin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (typeof token !== "string" || !token || token.length > 8192) {
    return Response.json({ error: "Valid Firebase ID token required." }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(token, true);
    // Do not mint long-lived sessions from old ID tokens.
    const authTimeMs = decoded.auth_time * 1000;
    if (!Number.isFinite(authTimeMs) || Date.now() - authTimeMs > 5 * 60 * 1000) {
      return Response.json({ error: "Recent sign-in required." }, { status: 401 });
    }
    const sessionCookie = await auth.createSessionCookie(token, { expiresIn: sessionDurationMs });
    cookies().set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionDurationMs / 1000
    });
    return Response.json({ uid: decoded.uid }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid or expired authentication token." }, { status: 401 });
  }
}
