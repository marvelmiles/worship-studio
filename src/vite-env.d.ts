/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Firebase is used only as an ephemeral signalling middleman for the Stream
 * module's one-tap pairing — never for storage. All of these are optional: if
 * they are absent the app builds and runs exactly as before, and the Stream
 * module quietly falls back to its QR / paste-a-code pairing.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Realtime Database URL, e.g. https://<project>-default-rtdb.firebaseio.com */
  readonly VITE_FIREBASE_DATABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
