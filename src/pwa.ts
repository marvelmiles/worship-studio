import { registerSW } from "virtual:pwa-register";

// Registers the service worker that makes WorshipStudio installable and fully
// offline. With registerType "autoUpdate", new versions are fetched and applied
// automatically; we just log readiness for clarity.
export const updateServiceWorker = registerSW({
  immediate: true,
  onOfflineReady() {
    // The app and all its assets are cached — it now works without internet.
    console.info("[WorshipStudio] Ready to work offline.");
  },
  onRegisteredSW(swUrl) {
    console.info("[WorshipStudio] Service worker registered:", swUrl);
  },
  onRegisterError(error) {
    console.error("[WorshipStudio] Service worker registration failed:", error);
  },
});
