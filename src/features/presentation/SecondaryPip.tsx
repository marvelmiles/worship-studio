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
  /** The live camera, when the window is showing the broadcast. */
  stream?: MediaStream | null;
  /** The operator's transport for a clip, mirrored onto every surface. */
  playback?: MediaPlayback;
  videoRef?: Ref<VideoSurfaceHandle>;
  onVideoTime?: (time: number, duration: number) => void;
  onVideoEnded?: () => void;
  /**
   * Silences the window whatever its own setting says, used on the operator's
   * copy while the projected one is carrying the sound to the room.
   */
  forceMuted?: boolean;
  /**
   * The stream module's overlays, so a camera shown here carries whatever the
   * broadcast is carrying. Passed in rather than read from the store because
   * the operator's window and the projection window get them from different
   * places: one holds the overlays, the other is sent a mirror of them.
   */
  overlays?: StreamOverlay[];
  /**
   * True on the operator's own copy, which draws live overlays with the edits
   * they have staged but not applied. The projected copy never does: that is
   * the room's, and it shows the last applied version.
   */
  overlayPreview?: boolean;
  /**
   * The stream module's own corner cameras, so this window mirrors the whole
   * broadcast rather than only its main camera.
   */
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

/**
 * What the second module is showing, filling whatever positioned box it is
 * dropped into.
 *
 * Kept apart from the box so the operator's own copy can be rendered once into
 * a portal host and only re-parented between the full stage and the floating
 * presenter. A clip or a camera that were unmounted and rebuilt at each would
 * stop and start again on every switch, which is the whole reason the main
 * stage does the same thing with its video (see hooks/usePortalHost.ts).
 */
export function SecondaryPipContent({
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
}: SecondaryPipContentProps) {
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
}

/**
 * Where the second module sits on the surface underneath it. The placement is
 * in percentages of that surface (see lib/pipPlacement.ts), so one arrangement
 * is right on the operator's stage, inside the floating presenter and on the
 * projector without any of them measuring anything.
 */
export function SecondaryPipFrame({
  placement,
  label,
  children,
}: {
  placement: PipPlacement;
  /** Named on the operator's surfaces; the projector shows the picture alone. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ ...pipFrameStyle(placement), ...FRAME_STYLE }}>
      {children}
      {label && <span style={LABEL_STYLE}>{label}</span>}
    </div>
  );
}

/**
 * A second module running in a corner of the stage while the main one holds the
 * screen: a picture, a clip, or the camera the stream module is receiving.
 */
export function SecondaryPip({
  showLabel,
  ...content
}: SecondaryPipContentProps & { showLabel?: boolean }) {
  return (
    <SecondaryPipFrame
      placement={content.secondary.placement}
      label={showLabel ? secondaryLabel(content.secondary) : undefined}
    >
      <SecondaryPipContent {...content} />
    </SecondaryPipFrame>
  );
}
