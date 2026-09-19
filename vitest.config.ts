import { defineConfig } from "vitest/config";

// Tests exercise the source directly, so the app's Vite plugins (React fast
// refresh, the PWA service worker) are left out: they only slow the run down.
export default defineConfig({
  json: {
    stringify: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
