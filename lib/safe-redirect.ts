/**
 * Only allow same-site relative paths as post-login destinations.
 * Blocks absolute URLs, protocol-relative URLs ("//evil.com"),
 * backslash tricks, and javascript: URLs.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}
