import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session";

export async function POST() {
  cookies().delete(sessionCookieName);
  return Response.json({ ok: true });
}
