export interface Capability {
  id: string;
  label: string;
  ok: boolean;
  critical: boolean;
}

function safe(test: () => boolean): boolean {
  try {
    return test();
  } catch {
    return false;
  }
}

// Checks the browser features WorshipStudio relies on. Anything missing is
// surfaced to the user as a recommendation to upgrade their browser.
export function checkCapabilities(): Capability[] {
  return [
    { id: "indexeddb", label: "Offline database (IndexedDB)", critical: false, ok: safe(() => typeof indexedDB !== "undefined") },
    {
      id: "sessionStorage",
      label: "Session storage",
      critical: false,
      ok: safe(() => {
        const k = "__ws_cap__";
        sessionStorage.setItem(k, "1");
        sessionStorage.removeItem(k);
        return true;
      }),
    },
    { id: "fileReader", label: "File uploads (FileReader)", critical: true, ok: safe(() => typeof FileReader !== "undefined") },
    { id: "blobUrl", label: "Media previews (object URLs)", critical: true, ok: safe(() => typeof URL !== "undefined" && typeof URL.createObjectURL === "function") },
    { id: "promise", label: "Modern JavaScript (Promises)", critical: true, ok: safe(() => typeof Promise !== "undefined") },
    { id: "serviceWorker", label: "Offline mode (Service Worker)", critical: false, ok: safe(() => "serviceWorker" in navigator) },
    { id: "fullscreen", label: "Fullscreen presentation", critical: false, ok: safe(() => !!document.documentElement.requestFullscreen) },
    { id: "audio", label: "Background audio playback", critical: false, ok: safe(() => typeof Audio !== "undefined") },
  ];
}

export function missingCapabilities(): Capability[] {
  return checkCapabilities().filter((c) => !c.ok);
}
