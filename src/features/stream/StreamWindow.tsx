import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * Renders in the popup opened by the stream's Go Live button. It projects the
 * live camera and nothing else — no controls, no app chrome. The stream is
 * pulled by reference from the opener window (see streamLive.ts); this window
 * never touches signalling or WebRTC, it only displays.
 */
export function StreamWindow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const hideTimer = useRef<number>();

  // The opener registers the stream just before opening this window, but the
  // reference may not be readable on the very first tick, so retry briefly.
  useEffect(() => {
    const pull = () => {
      try {
        const s = window.opener?.__wsStreamLive?.getStream() ?? null;
        if (s) {
          setStream(s);
          return true;
        }
      } catch {
        /* opener gone or cross-origin; give up */
      }
      return false;
    };
    if (pull()) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (pull() || tries > 40) window.clearInterval(id);
    }, 150);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (stream && el && el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    document.title = "WorshipStudio · Live camera";
    document.body.style.background = "#000";
    document.body.style.margin = "0";
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
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

  // A programmatically opened, auto-fullscreened popup on a second monitor
  // sometimes doesn't get OS activation from a plain click (a Windows/Chrome
  // fullscreen quirk). Focusing from a real pointerdown here claims it, and it
  // also gives the browser the gesture it may want before playing audio.
  const claimFocus = () => {
    try {
      window.focus();
    } catch {
      /* ignore */
    }
    void videoRef.current?.play().catch(() => {});
  };

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      /* fullscreen can be blocked; ignore */
    }
  };

  return (
    <div onPointerMove={wake} onPointerDown={claimFocus} style={{ position: "fixed", inset: 0, background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
      />

      {!stream && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.6)", fontFamily: "system-ui, sans-serif", fontSize: 15 }}>
          Waiting for the camera…
        </div>
      )}

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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
}
