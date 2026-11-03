import { NextResponse } from "next/server";
import { wantsHtml } from "@/lib/http";
import { sessionCookieName } from "@/lib/session-cookie";

/** Signs out by clearing the session cookie. The nav's "Sign out" form posts here. */
export async function POST(request: Request) {
  const response = wantsHtml(request)
    ? NextResponse.redirect(new URL("/?signed_out=1", request.url), 303)
    : NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookieName);
  return response;
}
