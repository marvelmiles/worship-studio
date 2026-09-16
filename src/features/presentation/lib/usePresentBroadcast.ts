import { useEffect, useRef, type RefObject } from "react";
import {
  MEDIA_SYNC_INTERVAL_MS,
  openPresentChannel,
  type PresentState,
} from "../../../lib/presentChannel";

export interface MediaSyncSource {
  isActive: boolean;
  playing: boolean;
  rate: number;
  getTime: () => number;
}

type ChannelRef = RefObject<BroadcastChannel | null>;

const useMediaSync = (
  channelRef: ChannelRef,
  isLive: boolean,
  target: "main" | "secondary",
  { isActive, playing, rate, getTime }: MediaSyncSource,
) => {
  useEffect(() => {
    if (!isLive || !isActive) return;
    const publish = () =>
      channelRef.current?.postMessage({
        type: "media-sync",
        target,
        sync: { time: getTime(), at: Date.now(), playing, rate },
      });
    publish();
    const timer = window.setInterval(publish, MEDIA_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [channelRef, isLive, isActive, playing, rate, getTime, target]);
};

/**
 * Keeps the projected window in step: it answers a window that asks for the
 * state on open, and ticks clip positions out while one is playing.
 */
export const usePresentBroadcast = (
  isLive: boolean,
  state: PresentState | null,
  mainMedia: MediaSyncSource,
  secondaryMedia: MediaSyncSource,
) => {
  const stateRef = useRef<PresentState | null>(state);
  const channelRef = useRef<BroadcastChannel | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (state) channelRef.current?.postMessage({ type: "state", state });
  }, [state]);

  useEffect(() => {
    if (!isLive) return;
    const channel = openPresentChannel((message) => {
      if (message.type === "request-state" && stateRef.current) {
        channel.postMessage({ type: "state", state: stateRef.current });
      }
    });
    channelRef.current = channel;
    if (stateRef.current) {
      channel.postMessage({ type: "state", state: stateRef.current });
    }
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [isLive]);

  useMediaSync(channelRef, isLive, "main", mainMedia);
  useMediaSync(channelRef, isLive, "secondary", secondaryMedia);
};
