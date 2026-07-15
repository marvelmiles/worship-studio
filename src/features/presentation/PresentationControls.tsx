import { useEffect, useRef, useState } from "react";
import {
  Check,
  Expand,
  Maximize,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorUp,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  RotateCcw,
  Scan,
  Square,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PresentationView } from "../../types";
import { C, UI } from "../../theme/tokens";
import { PCtl } from "../../components/ui/Button";

const VIEW_OPTIONS: { value: PresentationView; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "normal", label: "Normal", hint: "Fit, letterboxed", icon: RectangleHorizontal },
  { value: "cover", label: "Cover", hint: "Fill, may crop", icon: Maximize },
  { value: "fill", label: "Fill", hint: "Stretch to screen", icon: Expand },
];

interface PresentationControlsProps {
  paused: boolean;
  view: PresentationView;
  zoom: number;
  showInfo: boolean;
  isFullscreen: boolean;
  visible: boolean;
  isExternal: boolean;
  isLive: boolean;
  isRevealed: boolean;
  /** Shown only when the deck supports read-aloud (scripture). */
  canRead?: boolean;
  reading?: boolean;
  onToggleRead?: () => void;
  onHoverChange: (hovering: boolean) => void;
  onGoLive: () => void;
  onToggleReveal: () => void;
  onTogglePause: () => void;
  onSetView: (view: PresentationView) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleInfo: () => void;
  onToggleFullscreen: () => void;
  onExit: () => void;
}

export function PresentationControls({
  paused,
  view,
  zoom,
  showInfo,
  isFullscreen,
  visible,
  isExternal,
  isLive,
  isRevealed,
  canRead,
  reading,
  onToggleRead,
  onHoverChange,
  onGoLive,
  onToggleReveal,
  onTogglePause,
  onSetView,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleInfo,
  onToggleFullscreen,
  onExit,
}: PresentationControlsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!viewRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [menuOpen]);

  return (
    <div
      className="wf-controls"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 20,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 7,
        maxWidth: "calc(100vw - 32px)",
        padding: 7,
        borderRadius: 14,
        background: "rgba(10,9,14,0.55)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.1)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      <PCtl
        icon={MonitorUp}
        title={isLive ? "Live — projecting to external display" : isExternal ? "Go Live on external display" : "Go Live / project"}
        active={isLive}
        onClick={onGoLive}
      />
      {isLive && (
        <PCtl
          icon={PictureInPicture2}
          title={isRevealed ? "Send projected window back to the display" : "Bring projected window to this screen"}
          active={isRevealed}
          onClick={onToggleReveal}
        />
      )}
      <PCtl icon={paused ? Play : Pause} title={paused ? "Resume (P)" : "Pause (P)"} active={paused} onClick={onTogglePause} />
      {canRead && (
        <PCtl
          icon={reading ? Square : Volume2}
          title={reading ? "Stop reading (R)" : "Read passage aloud (R)"}
          active={reading}
          onClick={onToggleRead}
        />
      )}

      <div ref={viewRef} style={{ position: "relative" }}>
        <PCtl icon={Scan} title="Screen fit (V)" active={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: 48,
              right: 0,
              minWidth: 196,
              padding: 6,
              borderRadius: 12,
              background: "rgba(22,20,28,0.98)",
              border: `1px solid ${C.border}`,
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                fontFamily: UI,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: C.dim,
                padding: "6px 9px 8px",
              }}
            >
              Screen Fit
            </div>
            {VIEW_OPTIONS.map((option) => {
              const active = view === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onSetView(option.value);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    border: "none",
                    background: active ? "rgba(216,162,74,0.16)" : "transparent",
                    color: active ? C.goldSoft : C.text,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <option.icon size={16} />
                  <span style={{ flex: 1 }}>
                    <span style={{ fontFamily: UI, fontSize: 13.5, fontWeight: 600, display: "block" }}>
                      {option.label}
                    </span>
                    <span style={{ fontFamily: UI, fontSize: 11.5, color: active ? C.goldSoft : C.sub }}>
                      {option.hint}
                    </span>
                  </span>
                  {active && <Check size={15} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <PCtl icon={ZoomOut} title="Zoom out (-)" onClick={onZoomOut} />
        <button
          onClick={onResetZoom}
          title="Reset zoom (0)"
          style={{
            minWidth: 48,
            height: 40,
            padding: "0 8px",
            borderRadius: 10,
            cursor: "pointer",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.12)",
            fontFamily: UI,
            fontSize: 12.5,
            fontVariantNumeric: "tabular-nums",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <RotateCcw size={13} />
          {Math.round(zoom * 100)}%
        </button>
        <PCtl icon={ZoomIn} title="Zoom in (+)" onClick={onZoomIn} />
      </span>

      <PCtl icon={Monitor} title="Presenter bar (I)" active={showInfo} onClick={onToggleInfo} />
      <PCtl
        icon={isFullscreen ? Minimize2 : Maximize2}
        title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
        onClick={onToggleFullscreen}
      />
      <PCtl icon={X} title="Exit (Esc)" onClick={onExit} />
    </div>
  );
}
