import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Maximize2,
  MonitorOff,
  MonitorUp,
  Pause,
  Play,
  StickyNote,
  X,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { SlideCanvas } from "../../components/SlideCanvas";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoSurface } from "../../components/media/VideoSurface";
import type { StageFrame } from "./stageContent";

const WIDTH = 320;
const MARGIN = 16;

interface PresenterPipProps {
  title: string;
  currentLabel: string;
  /** Presenter notes for the current slide, shown only when there are any. */
  notes?: string;
  frame: StageFrame;
  slideIndex: number;
  total: number;
  paused: boolean;
  isLive: boolean;
  /** Owned by the parent so it can gate presentation shortcuts on focus. */
  rootRef: RefObject<HTMLDivElement>;
  onPrev: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  onOpenStage: () => void;
  onGoLive: () => void;
  /** Ends the projection but keeps the presentation running here. */
  onStopLive: () => void;
  onExit: () => void;
}

/**
 * A small, draggable presenter that floats over the app while a presentation
 * runs, so the operator can keep working (searching the next manuscript, editing a
 * passage) without dropping what the audience sees.
 *
 * It is focusable: while it holds focus the presentation keyboard shortcuts
 * are live, so Ctrl+3, the arrow keys and so on drive the stage from here.
 * Focus goes back to the page the moment the user clicks anything else, which
 * is what keeps those keys from hijacking normal typing.
 */
export function PresenterPip({
  title,
  currentLabel,
  notes,
  frame,
  slideIndex,
  total,
  paused,
  isLive,
  rootRef,
  onPrev,
  onNext,
  onTogglePause,
  onOpenStage,
  onGoLive,
  onStopLive,
  onExit,
}: PresenterPipProps) {
  const { colors, fonts } = useUITheme();
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN),
    y: MARGIN,
  }));
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Focus on mount so the shortcuts work immediately after switching here.
  useEffect(() => {
    rootRef.current?.focus();
  }, [rootRef]);

  // Keep the window on screen when the viewport shrinks under it.
  useEffect(() => {
    const onResize = () => {
      const height = rootRef.current?.offsetHeight ?? 260;
      setPos((p) => ({
        x: Math.min(p.x, Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)),
        y: Math.min(
          p.y,
          Math.max(MARGIN, window.innerHeight - height - MARGIN),
        ),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rootRef]);

  const startDrag = (e: React.PointerEvent) => {
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDrag = (e: React.PointerEvent) => {
    const offset = drag.current;
    if (!offset) return;
    const height = rootRef.current?.offsetHeight ?? 260;
    setPos({
      x: Math.max(
        0,
        Math.min(window.innerWidth - WIDTH, e.clientX - offset.dx),
      ),
      y: Math.max(
        0,
        Math.min(window.innerHeight - height, e.clientY - offset.dy),
      ),
    });
  };
  const endDrag = () => {
    drag.current = null;
  };

  const { content } = frame;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label="Floating presenter"
      // Any click inside claims focus, which is what arms the shortcuts.
      onPointerDown={() => rootRef.current?.focus()}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocused(false);
      }}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: WIDTH,
        zIndex: 160,
        borderRadius: 14,
        overflow: "hidden",
        background: fade(colors.panelSolid, 0.96),
        backdropFilter: "blur(18px) saturate(150%)",
        WebkitBackdropFilter: "blur(18px) saturate(150%)",
        border: `1px solid ${focused ? fade(colors.accent, 0.55) : colors.border}`,
        boxShadow: focused
          ? `0 20px 55px rgba(0,0,0,0.6), 0 0 0 3px ${fade(colors.accent, 0.18)}`
          : "0 18px 45px rgba(0,0,0,0.5)",
        outline: "none",
        transition: "border-color .15s ease, box-shadow .15s ease",
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 10px",
          cursor: drag.current ? "grabbing" : "grab",
          borderBottom: `1px solid ${colors.border}`,
          touchAction: "none",
        }}
      >
        <GripHorizontal
          size={14}
          color={colors.dim}
          style={{ flexShrink: 0 }}
        />
        <span
          className="ws-ellipsis"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {title}
        </span>
        {isLive && (
          <span
            title="Projecting to the audience display"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 999,
              fontFamily: fonts.ui,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: colors.onAccent,
              background: colors.danger,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: colors.onAccent,
              }}
            />
            LIVE
          </span>
        )}
      </div>

      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: "#000",
        }}
      >
        {content.kind === "text" && (
          <SlideCanvas
            slide={content.slide}
            style={content.style}
            lineStyles={content.lineStyles}
            bg={content.background}
            scrim={content.slide.overrides?.scrim}
            radius={0}
            fill
          />
        )}
        {content.kind === "image" && (
          <ImageSurface item={content.item} variant="thumb" />
        )}
        {content.kind === "video" && (
          // Muted: the projected window is the one that plays sound.
          <VideoSurface item={content.item} forceMuted />
        )}
      </div>

      {notes && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 7,
            padding: "8px 10px",
            borderTop: `1px solid ${colors.border}`,
            background: fade(colors.accent, 0.09),
          }}
        >
          <StickyNote
            size={13}
            color={colors.accentSoft}
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <div
            style={{
              flex: 1,
              minWidth: 0,
              maxHeight: 66,
              overflowY: "auto",
              fontFamily: fonts.ui,
              fontSize: 11.5,
              fontWeight: 500,
              lineHeight: 1.45,
              color: colors.text,
              whiteSpace: "pre-line",
            }}
          >
            {notes}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "8px 9px",
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <MiniButton
          icon={ChevronLeft}
          title="Previous slide (←)"
          onClick={onPrev}
        />
        <MiniButton
          icon={paused ? Play : Pause}
          title={paused ? "Resume (P)" : "Pause (P)"}
          active={paused}
          onClick={onTogglePause}
        />
        <MiniButton
          icon={ChevronRight}
          title="Next slide (→)"
          onClick={onNext}
        />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            fontFamily: fonts.ui,
            fontSize: 10.5,
            fontWeight: 600,
            color: colors.dim,
            fontVariantNumeric: "tabular-nums",
          }}
          className="ws-ellipsis"
        >
          {slideIndex + 1}/{total}
          {currentLabel ? ` · ${currentLabel}` : ""}
        </span>
        {isLive ? (
          <MiniButton
            icon={MonitorOff}
            title="Stop live — close the audience display"
            danger
            onClick={onStopLive}
          />
        ) : (
          <MiniButton
            icon={MonitorUp}
            title="Go live on the audience display"
            onClick={onGoLive}
          />
        )}
        <MiniButton
          icon={Maximize2}
          title="Open the full presentation view"
          onClick={onOpenStage}
        />
        <MiniButton
          icon={X}
          title="End presentation (Esc)"
          danger
          onClick={onExit}
        />
      </div>

      <div
        style={{
          padding: "0 10px 9px",
          fontFamily: fonts.ui,
          fontSize: 10,
          lineHeight: 1.45,
          color: focused ? colors.accentSoft : colors.dim,
        }}
      >
        {focused
          ? "Shortcuts active — arrows, Ctrl+number, P, Esc."
          : "Click this window to use presentation shortcuts."}
      </div>
    </div>
  );
}

function MiniButton({
  icon: Icon,
  title,
  onClick,
  active,
  danger,
}: {
  icon: typeof ChevronLeft;
  title: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const { colors } = useUITheme();
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 8,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        background: active ? fade(colors.accent, 0.18) : "transparent",
        color: danger ? colors.danger : active ? colors.accentSoft : colors.sub,
        border: `1px solid ${active ? fade(colors.accent, 0.3) : "transparent"}`,
      }}
    >
      <Icon size={15} />
    </button>
  );
}
