import { registerSW } from "virtual:pwa-register";

// How often to check for a new service worker while the tab stays open.
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let swRegistration: ServiceWorkerRegistration | undefined;

export const updateServiceWorker = registerSW({
  // Check for a new SW immediately on page load, not deferred to the load event.
  immediate: true,
  onOfflineReady() {
    console.info("[WorshipStudio] Ready to work offline.");
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    swRegistration = registration;
    // Keep checking for updates while the tab stays open (e.g. a long service
    // or rehearsal session). autoUpdate handles the install + reload automatically.
    setInterval(() => void registration.update(), POLL_INTERVAL_MS);
  },
  onRegisterError(error) {
    console.error("[WorshipStudio] Service worker registration failed:", error);
  },
});

// Also check for updates whenever the installed app returns to the foreground,
// so a fresh deploy is picked up without waiting for the hourly poll.
// vite-plugin-pwa's autoUpdate mode installs and reloads automatically.
if ("serviceWorker" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void swRegistration?.update();
    }
  });
}
