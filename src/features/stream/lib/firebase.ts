import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { env } from "../../../lib/env";

/**
 * Firebase, used strictly as an in-memory signalling middleman for one-tap
 * pairing — never as storage. The Realtime Database (not Firestore) is chosen
 * deliberately: it is the only Firebase product with `onDisconnect`, which lets
 * a device guarantee its signalling scraps are wiped the instant it drops off,
 * even on a crash. Combined with an explicit delete once the handshake lands,
 * the database sits empty during a live session, so it costs effectively
 * nothing to run.
 *
 * Everything here is optional. When the env vars are missing (no Firebase
 * project configured) `signalingConfigured` is false and the Stream module
 * falls back to its offline QR / paste pairing. Only the Realtime Database
 * module is imported, so tree-shaking keeps the rest of Firebase out of the
 * bundle.
 */

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

/** True only when a Firebase project has been wired up via env vars. */
export const signalingConfigured = Boolean(config.apiKey && config.databaseURL);

let app: FirebaseApp | null = null;
let db: Database | null = null;

/**
 * Returns the Realtime Database handle, initialising Firebase on first use so an
 * unconfigured build never touches it. Returns null when not configured.
 */
export function getSignalingDb(): Database | null {
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
      // Misconfigured project — degrade to the QR / paste pairing.
      return null;
    }
  }
  return db;
}
