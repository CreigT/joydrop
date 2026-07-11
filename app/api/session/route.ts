import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { sessionCookieName } from "@/lib/session-cookie";

const sessionDurationMs = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;

  if (!token) {
    return Response.json({ error: "Firebase ID token is required." }, { status: 400 });
  }

  try {
    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const sessionCookie = await auth.createSessionCookie(token, {
      expiresIn: sessionDurationMs
    });

    cookies().set(sessionCookieName, sessionCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionDurationMs / 1000
    });

    return Response.json({ uid: decoded.uid });
  } catch (error) {
    console.error("Unable to create JoyDrop session", error);
    return Response.json(
      { error: "Unable to create JoyDrop session." },
      { status: 500 }
    );
  }
}
