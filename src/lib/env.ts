import { z } from "zod";

/**
 * Validated view of the build-time environment. Every value is optional: the
 * app is fully functional without any of them, and the Stream module falls back
 * to its offline QR / paste pairing when Firebase signalling isn't configured
 * (see features/stream/lib/firebase.ts). Validating here — rather than reading
 * `import.meta.env` directly at each call site — gives a single source of truth
 * and turns a malformed value (e.g. a mistyped database URL) into a clear,
 * early warning instead of an opaque runtime failure deep inside Firebase.
 */
const envSchema = z.object({
  VITE_FIREBASE_API_KEY: z.string().min(1).optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  VITE_FIREBASE_APP_ID: z.string().min(1).optional(),
  VITE_FIREBASE_DATABASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(import.meta.env);
  if (result.success) return result.data;

  // A misconfigured optional var must never take the whole app down. Warn with
  // the offending fields and continue as if signalling were absent.
  if (import.meta.env.DEV) {
    console.warn(
      "Invalid environment variables; ignoring them:",
      result.error.flatten().fieldErrors,
    );
  }
  return {};
}

export const env: Env = parseEnv();
