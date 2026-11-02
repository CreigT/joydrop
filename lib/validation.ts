const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: Record<string, string[]> = {
  voice: ["audio/webm", "audio/mpeg", "audio/wav", "audio/ogg"],
  photo: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  gif: ["image/gif"]
};

export function validateContributionFile(file: File | null, kind: string): string | null {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_FILE_SIZE) {
    return `File too large (max 10 MB for ${kind})`;
  }

  const allowed = ALLOWED_TYPES[kind];
  if (allowed && file.type && !allowed.includes(file.type)) {
    return `Invalid file type for ${kind}. Allowed: ${allowed.join(", ")}`;
  }

  return null;
}

// Simple in-memory rate limiter (best-effort; not durable across serverless instances)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT = 5; // 5 contributions per minute per IP

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count += 1;
  return true;
}
