import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { sessionCookieName } from "@/lib/session-cookie";

export { sessionCookieName };

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    return await getFirebaseAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentFirebaseUser() {
  const token = cookies().get(sessionCookieName)?.value;
  return verifySessionToken(token);
}

export function displayNameFromToken(decoded: DecodedIdToken) {
  return decoded.name || decoded.email?.split("@")[0] || "JoyDrop Friend";
}
