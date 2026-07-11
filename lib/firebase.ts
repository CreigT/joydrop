import { initializeApp, getApps } from "firebase/app";
import {
  type Auth,
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";
import {
  joydropFirebaseAuthDomain,
  joydropFirebaseProjectId,
  joydropFirebaseStorageBucket
} from "@/lib/firebase-project";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: joydropFirebaseAuthDomain,
  projectId: joydropFirebaseProjectId,
  storageBucket: joydropFirebaseStorageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const app = isFirebaseConfigured
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();
