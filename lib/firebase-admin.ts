import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import {
  joydropFirebaseProjectId,
  joydropFirebaseStorageBucket
} from "@/lib/firebase-project";

let app: App | null = null;

function decodeMaybeBase64(value: string) {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.includes("-----BEGIN PRIVATE KEY-----") ? decoded : value;
  } catch {
    return value;
  }
}

function normalizePrivateKey(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  let privateKey = value.trim();

  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = decodeMaybeBase64(privateKey).replace(/\\n/g, "\n");

  if (privateKey.startsWith("{")) {
    try {
      const serviceAccount = JSON.parse(privateKey) as { private_key?: string };
      privateKey = serviceAccount.private_key?.replace(/\\n/g, "\n") ?? privateKey;
    } catch {
      return privateKey;
    }
  }

  return privateKey;
}

export function getFirebaseAdminApp() {
  if (app) {
    return app;
  }

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  const projectId = joydropFirebaseProjectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are required.");
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    }),
    storageBucket: joydropFirebaseStorageBucket
  });

  return app;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminStorage() {
  return getStorage(getFirebaseAdminApp());
}
