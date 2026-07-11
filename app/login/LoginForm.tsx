"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";

const fieldClass =
  "w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function signInErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Email sign in failed.";
  }

  if (error.message.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  if (error.message.includes("auth/missing-password")) {
    return "Enter your password.";
  }

  if (error.message.includes("auth/weak-password")) {
    return "Use a password with at least 6 characters.";
  }

  if (error.message.includes("auth/email-already-in-use")) {
    return "That email already has a JoyDrop account. Try Email Sign In.";
  }

  if (
    error.message.includes("auth/user-not-found") ||
    error.message.includes("auth/wrong-password") ||
    error.message.includes("auth/invalid-credential")
  ) {
    return "Check your email and password, then try again.";
  }

  return error.message;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function setSession(token: string) {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error("Unable to create JoyDrop session.");
    }

    window.location.href = nextPath;
  }

  async function handleGoogle() {
    if (!auth) {
      setError("Firebase is not configured yet.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await setSession(await result.user.getIdToken());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setLoading(false);
    }
  }

  async function handleEmail(mode: "signin" | "signup") {
    if (!auth) {
      setError("Firebase is not configured yet.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        mode === "signup"
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);
      await setSession(await result.user.getIdToken());
    } catch (err) {
      setError(signInErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {!isFirebaseConfigured ? (
        <p className="rounded-2xl bg-accent/60 p-3 text-sm font-semibold text-[#30273A]">
          Firebase is not configured yet. Add the NEXT_PUBLIC_FIREBASE_* values
          in .env to enable sign in.
        </p>
      ) : null}
      <button
        className="w-full rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30 disabled:opacity-60"
        disabled={loading || !isFirebaseConfigured}
        onClick={handleGoogle}
        type="button"
      >
        Sign in with Google
      </button>

      <div className="space-y-3">
        <input
          className={fieldClass}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          value={email}
        />
        <input
          className={fieldClass}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
          value={password}
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl bg-secondary px-4 py-3 text-sm font-black text-[#173B3A] disabled:opacity-60"
            disabled={loading || !isFirebaseConfigured}
            onClick={() => handleEmail("signin")}
            type="button"
          >
            Email Sign In
          </button>
          <button
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-black text-[#30273A] disabled:opacity-60"
            disabled={loading || !isFirebaseConfigured}
            onClick={() => handleEmail("signup")}
            type="button"
          >
            Email Sign Up
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-primary/10 p-3 text-sm font-semibold text-[#8E3154]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
