import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/session-cookie";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/birthday/:path*/edit",
    "/api/generate",
    "/api/approve"
  ]
};
