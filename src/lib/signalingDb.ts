import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { env } from "../../../lib/env";

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

export const signalingConfigured = Boolean(config.apiKey && config.databaseURL);

let app: FirebaseApp | null = null;
let db: Database | null = null;

export const getSignalingDb = (): Database | null => {
  if (!signalingConfigured) return null;
  if (!db) {
    try {
      app =
        app ??
        initializeApp({
          apiKey: config.apiKey,
          projectId: config.projectId,
          appId: config.appId,
          databaseURL: config.databaseURL,
        });
      db = getDatabase(app);
    } catch {
      return null;
    }
  }
  return db;
};
