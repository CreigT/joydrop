import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;

  if (!token) {
    return Response.json({ error: "Firebase ID token is required." }, { status: 400 });
  }

  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);

  cookies().set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 5
  });

  return Response.json({ uid: decoded.uid });
}
