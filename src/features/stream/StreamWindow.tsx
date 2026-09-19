import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useProjectionFullscreen } from "../../hooks/useProjectionFullscreen";
import { useViewShortcuts } from "../../hooks/useViewShortcuts";
import { viewCommandTitle } from "../../lib/viewCommands";
import { StreamOverlayLayers } from "./StreamOverlayLayers";
import { StreamPipLayer } from "./StreamPipLayer";
import { StreamVideo } from "./StreamVideo";
import { useMirroredStreamOverlays } from "./lib/streamOverlayStore";
import { useOpenerLiveComposition } from "./lib/useOpenerComposition";
import { useOverlayContentSync } from "./lib/useOverlayContentSync";
import { documentTitle } from "../../lib/appInfo";

export const StreamWindow = () => {
  const overlays = useMirroredStreamOverlays();
  useOverlayContentSync(overlays);
  const composition = useOpenerLiveComposition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useProjectionFullscreen();
  useViewShortcuts({ onToggleFullscreen: toggleFullscreen });
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef<number>();
  const stream = composition.primary;

  useEffect(() => {
    document.title = documentTitle("Live camera");
    document.body.style.background = "#000";
    document.body.style.margin = "0";
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  const wake = () => {
    setHintVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHintVisible(false), 2500);
  };

  const claimFocus = () => {
    try {
      window.focus();
    } catch {}
    void videoRef.current?.play().catch(() => {});
  };

  return (
    <div
      onPointerMove={wake}
      onPointerDown={claimFocus}
      style={{ position: "fixed", inset: 0, background: "#000" }}
    >
      <StreamVideo ref={videoRef} stream={stream} />

      <StreamPipLayer windows={composition.secondaries} />

      <StreamOverlayLayers overlays={overlays} live />

      {!stream && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 15,
          }}
        >
          Waiting for the camera…
        </div>
      )}

      <button
        onClick={toggleFullscreen}
        title={viewCommandTitle(
          isFullscreen ? "Exit fullscreen" : "Fullscreen",
          "fullscreen",
        )}
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          zIndex: 10,
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          borderRadius: 10,
          cursor: "pointer",
          background: "rgba(20,20,22,0.6)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.16)",
          color: "#fff",
          opacity: hintVisible ? 1 : 0,
          pointerEvents: hintVisible ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
};
