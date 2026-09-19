import { registerSW } from "virtual:pwa-register";
import { APP_NAME } from "./lib/appInfo";

const POLL_INTERVAL_MS = 60 * 60 * 1000;

let swRegistration: ServiceWorkerRegistration | undefined;

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info(`[${APP_NAME}] Ready to work offline.`);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    swRegistration = registration;
    setInterval(() => void registration.update(), POLL_INTERVAL_MS);
  },
  onRegisterError(error) {
    console.error(`[${APP_NAME}] Service worker registration failed:`, error);
  },
});

if ("serviceWorker" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void swRegistration?.update();
    }
  });
}
