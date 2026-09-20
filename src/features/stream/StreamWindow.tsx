import { useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useAutoHideChrome } from "../../hooks/useAutoHideChrome";
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

const HINT_DELAY_MS = 2500;

export const StreamWindow = () => {
  const overlays = useMirroredStreamOverlays();
  useOverlayContentSync(overlays);
  const composition = useOpenerLiveComposition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useProjectionFullscreen();
  useViewShortcuts({ onToggleFullscreen: toggleFullscreen });
  /* A window that is not filling the display keeps its fullscreen button in
     view: that button is the way back onto the projector. */
  const { visible: isChromeVisible } = useAutoHideChrome({
    enabled: isFullscreen,
    delayMs: HINT_DELAY_MS,
  });
  const stream = composition.primary;

  useEffect(() => {
    document.title = documentTitle("Live camera");
    document.body.style.background = "#000";
    document.body.style.margin = "0";
  }, []);

  const claimFocus = () => {
    try {
      window.focus();
    } catch {}
    void videoRef.current?.play().catch(() => {});
  };

  return (
    <div
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
          opacity: isChromeVisible ? 1 : 0,
          pointerEvents: isChromeVisible ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </div>
  );
};
