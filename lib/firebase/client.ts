import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBVe-Cnp4Yt7rYeIBQWdID1v_OACHJc9s8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "estudio-bernabe.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "estudio-bernabe",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "estudio-bernabe.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "910713760857",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:910713760857:web:0f8a570e3fd3f089d91548",
};

export function getClientAuth() {
  if (typeof window === "undefined") {
    throw new Error("Firebase Authentication solo está disponible en el navegador.");
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}

export function createGoogleProvider() {
  return new GoogleAuthProvider();
}
