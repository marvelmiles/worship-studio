import type { PipPlacement } from "../../../types";
import { createLiveWindow } from "../../../lib/liveWindow";

const STREAM_WINDOW_NAME = "worship-studio-stream-output";

export interface LiveStreamWindow {
  id: string;
  label: string;
  stream: MediaStream | null;
  placement: PipPlacement;
  muted: boolean;
}

export interface LiveComposition {
  primary: MediaStream | null;
  secondaries: LiveStreamWindow[];
}

export const EMPTY_LIVE_COMPOSITION: LiveComposition = {
  primary: null,
  secondaries: [],
};

export interface StreamLiveBridge {
  version: number;
  getComposition: () => LiveComposition;
}

let composition: LiveComposition = EMPTY_LIVE_COMPOSITION;
let version = 0;

export const streamLiveWindow = createLiveWindow(
  "/stream-live",
  STREAM_WINDOW_NAME,
);

declare global {
  interface Window {
    __wsStreamLive?: StreamLiveBridge;
  }
}

const install = (): void => {
  version += 1;
  window.__wsStreamLive = {
    version,
    getComposition: () => composition,
  };
};

export const setLiveComposition = (next: LiveComposition | null): void => {
  composition = next ?? EMPTY_LIVE_COMPOSITION;
  install();
};
