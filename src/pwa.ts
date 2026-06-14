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

// When the installed PWA is brought back to the foreground (user taps the
// home-screen icon after the app was backgrounded or the phone screen was off),
// immediately check for a new service worker. Without this, the tab would only
// check at registration time or on the hourly poll, so a freshly deployed
// version wouldn't be seen until one of those fires.
//
// Flow when an update is found:
//   registration.update() → new SW installs → skipWaiting (workbox config)
//   → new SW activates with isUpdate:true → window.location.reload()
//   (the reload is handled by vite-plugin-pwa's autoUpdate 'activated' listener)
if ("serviceWorker" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void swRegistration?.update();
    }
  });
}
