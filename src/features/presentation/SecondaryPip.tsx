import type { CSSProperties, ReactNode, Ref } from "react";
import type { PipPlacement } from "../../types";
import type {
  MediaPlayback,
  SecondaryPresentState,
} from "../../lib/presentChannel";
import { pipFrameStyle } from "../../lib/pipPlacement";
import { ImageSurface } from "../../components/media/ImageSurface";
import {
  VideoSurface,
  type VideoSurfaceHandle,
} from "../../components/media/VideoSurface";
import { StreamVideo } from "../stream/StreamVideo";
import { StreamOverlayLayers } from "../stream/StreamOverlayLayers";
import { StreamPipLayer, type StreamPipWindow } from "../stream/StreamPipLayer";
import type { StreamOverlay } from "../stream/lib/streamOverlay";

interface SecondaryPipContentProps {
  secondary: SecondaryPresentState;
  stream?: MediaStream | null;
  playback?: MediaPlayback;
  videoRef?: Ref<VideoSurfaceHandle>;
  onVideoTime?: (time: number, duration: number) => void;
  onVideoEnded?: () => void;
  forceMuted?: boolean;
  overlays?: StreamOverlay[];
  overlayPreview?: boolean;
  cameras?: StreamPipWindow[];
}

const FRAME_STYLE: CSSProperties = {
  overflow: "hidden",
  borderRadius: "2.5%",
  background: "#000",
  boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  outline: "1px solid rgba(255,255,255,0.22)",
  outlineOffset: -1,
  zIndex: 15,
  containerType: "inline-size",
};

const LABEL_STYLE: CSSProperties = {
  position: "absolute",
  left: "4%",
  bottom: "6%",
  maxWidth: "88%",
  padding: "1.5% 4%",
  borderRadius: 999,
  background: "rgba(0,0,0,0.6)",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
  fontSize: "clamp(8px, 7cqw, 13px)",
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  pointerEvents: "none",
};

const WAITING_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: "4%",
  textAlign: "center",
  color: "rgba(255,255,255,0.65)",
  fontFamily: "system-ui, sans-serif",
  fontSize: "clamp(8px, 6cqw, 13px)",
};

export const secondaryLabel = (secondary: SecondaryPresentState): string =>
  secondary.kind === "stream"
    ? "Live camera"
    : (secondary.item?.name ?? "Missing item");

export const SecondaryPipContent = ({
  secondary,
  stream,
  playback,
  videoRef,
  onVideoTime,
  onVideoEnded,
  forceMuted,
  overlays,
  overlayPreview,
  cameras,
}: SecondaryPipContentProps) => {
  const muted = forceMuted || secondary.muted;
  const item = secondary.item;

  if (secondary.kind === "stream") {
    if (!stream)
      return <div style={WAITING_STYLE}>Waiting for the camera…</div>;
    return (
      <>
        <StreamVideo stream={stream} muted={muted} />
        {cameras && <StreamPipLayer windows={cameras} forceMuted={muted} />}
        {overlays && overlays.length > 0 && (
          <StreamOverlayLayers
            overlays={overlays}
            live
            muted={muted}
            preview={overlayPreview}
          />
        )}
      </>
    );
  }
  if (!item) {
    return (
      <div style={WAITING_STYLE}>That item is no longer in the library.</div>
    );
  }
  if (secondary.kind === "image") return <ImageSurface item={item} />;
  return (
    <VideoSurface
      ref={videoRef}
      item={item}
      playback={playback}
      forceMuted={muted}
      onTimeUpdate={onVideoTime}
      onEnded={onVideoEnded}
    />
  );
};

export const SecondaryPipFrame = ({
  placement,
  label,
  children,
}: {
  placement: PipPlacement;
  label?: string;
  children: ReactNode;
}) => {
  return (
    <div style={{ ...pipFrameStyle(placement), ...FRAME_STYLE }}>
      {children}
      {label && <span style={LABEL_STYLE}>{label}</span>}
    </div>
  );
};

export const SecondaryPip = ({
  showLabel,
  ...content
}: SecondaryPipContentProps & { showLabel?: boolean }) => {
  return (
    <SecondaryPipFrame
      placement={content.secondary.placement}
      label={showLabel ? secondaryLabel(content.secondary) : undefined}
    >
      <SecondaryPipContent {...content} />
    </SecondaryPipFrame>
  );
};
