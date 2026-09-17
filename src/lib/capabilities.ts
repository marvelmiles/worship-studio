export interface Capability {
  id: string;
  label: string;
  ok: boolean;
  critical: boolean;
}

const safe = (test: () => boolean): boolean => {
  try {
    return test();
  } catch {
    return false;
  }
};

const hasWindowProperty = (name: string): boolean =>
  safe(() => typeof window !== "undefined" && name in window);

export const checkCapabilities = (): Capability[] => {
  return [
    {
      id: "promise",
      label: "Modern JavaScript (Promises)",
      critical: true,
      ok: safe(() => typeof Promise !== "undefined"),
    },
    {
      id: "fileApi",
      label: "File uploads (File API)",
      critical: true,
      ok: safe(
        () =>
          typeof File !== "undefined" &&
          typeof Blob !== "undefined" &&
          typeof Blob.prototype.stream === "function",
      ),
    },
    {
      id: "blobUrl",
      label: "Media previews (object URLs)",
      critical: true,
      ok: safe(
        () =>
          typeof URL !== "undefined" &&
          typeof URL.createObjectURL === "function",
      ),
    },
    {
      id: "indexeddb",
      label: "Offline library (IndexedDB)",
      critical: false,
      ok: safe(() => typeof indexedDB !== "undefined"),
    },
    {
      id: "localStorage",
      label: "Remembering your place in the Bible",
      critical: false,
      ok: safe(() => {
        const key = "__ws_cap__";
        localStorage.setItem(key, "1");
        localStorage.removeItem(key);
        return true;
      }),
    },
    {
      id: "canvas",
      label: "Thumbnails and image editing (Canvas)",
      critical: false,
      ok: safe(
        () =>
          typeof document.createElement("canvas").getContext === "function" &&
          Boolean(document.createElement("canvas").getContext("2d")),
      ),
    },
    {
      id: "imageBitmap",
      label: "Fast image thumbnails (createImageBitmap)",
      critical: false,
      ok: safe(() => typeof createImageBitmap === "function"),
    },
    {
      id: "projection",
      label: "Second-screen projection (Go Live)",
      critical: false,
      ok: safe(() => typeof window.open === "function"),
    },
    {
      id: "fullscreen",
      label: "Fullscreen presentation",
      critical: false,
      ok: safe(() => Boolean(document.documentElement.requestFullscreen)),
    },
    {
      id: "broadcastChannel",
      label: "Live output sync (BroadcastChannel)",
      critical: false,
      ok: safe(() => typeof BroadcastChannel !== "undefined"),
    },
    {
      id: "audio",
      label: "Background audio playback",
      critical: false,
      ok: safe(() => typeof Audio !== "undefined"),
    },
    {
      id: "webrtc",
      label: "Camera streaming (WebRTC)",
      critical: false,
      ok: safe(() => typeof RTCPeerConnection !== "undefined"),
    },
    {
      id: "camera",
      label: "Sharing this device's camera",
      critical: false,
      /* mediaDevices is withheld on an insecure origin, which is a connection
         problem the Stream page explains itself, not a missing browser feature. */
      ok: safe(
        () =>
          !window.isSecureContext ||
          typeof navigator.mediaDevices?.getUserMedia === "function",
      ),
    },
    {
      id: "worker",
      label: "Scanning pairing QR codes (Web Workers)",
      critical: false,
      ok: safe(() => typeof Worker !== "undefined"),
    },
    {
      id: "speech",
      label: "Reading scripture aloud (speech synthesis)",
      critical: false,
      ok: hasWindowProperty("speechSynthesis"),
    },
    {
      id: "serviceWorker",
      label: "Installing and offline mode (Service Worker)",
      critical: false,
      ok: safe(() => "serviceWorker" in navigator),
    },
  ];
};

export const missingCapabilities = (): Capability[] =>
  checkCapabilities().filter((capability) => !capability.ok);
