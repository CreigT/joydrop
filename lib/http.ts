export function wantsHtml(request: Request) {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

export function seeOther(request: Request, path: string) {
  return Response.redirect(new URL(path, request.url), 303);
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}
