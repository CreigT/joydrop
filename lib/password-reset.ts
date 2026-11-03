// Messages for the "Forgot password?" step on the sign-in page.
// The reset email itself is sent by Firebase Authentication, not by JoyDrop.

/** Same message whether or not an account exists, so the page doesn't reveal who has one. */
export const RESET_SENT_MESSAGE =
  "If an account exists for that email, a reset link is on its way. Check spam too.";

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  if (error instanceof Error) {
    const match = error.message.match(/auth\/[a-z-]+/);
    if (match) return match[0];
  }
  return "";
}

/** Result of a reset request: "sent" shows the neutral message, "error" shows a plain error. */
export function resetResult(error: unknown): { kind: "sent" | "error"; message: string } {
  if (!error) return { kind: "sent", message: RESET_SENT_MESSAGE };
  const code = errorCode(error);
  if (code === "auth/user-not-found") return { kind: "sent", message: RESET_SENT_MESSAGE };
  if (code === "auth/invalid-email" || code === "auth/missing-email") {
    return { kind: "error", message: "Enter a valid email address." };
  }
  if (code === "auth/too-many-requests") {
    return { kind: "error", message: "Too many tries. Wait a few minutes, then try again." };
  }
  if (code === "auth/network-request-failed") {
    return { kind: "error", message: "No connection. Check your internet, then try again." };
  }
  return { kind: "error", message: "We couldn't send a reset link right now. Try again later." };
}
