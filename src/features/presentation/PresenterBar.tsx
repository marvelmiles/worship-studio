import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Background, ResolvedStyle, Slide, Song } from "../../types";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { fmtClock } from "../../lib/id";
import { useViewport } from "../../hooks/useViewport";
import { PCtl } from "../../components/ui/Button";
import { SlideCanvas } from "../../components/SlideCanvas";

interface PresenterBarProps {
  song: Song;
  cur: Slide;
  next?: Slide;
  nextStyle?: ResolvedStyle;
  nextLineStyles?: ResolvedStyle[];
  nextBackground?: Background;
  idx: number;
  total: number;
  elapsed: number;
  paused: boolean;
  visible: boolean;
  onHoverChange: (hovering: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
}

const labelStyle = {
  fontFamily: UI,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase" as const,
  color: C.gold,
};

export function PresenterBar({
  song,
  cur,
  next,
  nextStyle,
  nextLineStyles,
  nextBackground,
  idx,
  total,
  elapsed,
  paused,
  visible,
  onHoverChange,
  onPrev,
  onNext,
}: PresenterBarProps) {
  const { width } = useViewport();
  const showNext = width >= 720;

  return (
    <div
      className="wf-controls"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        display: "grid",
        gridTemplateColumns: showNext ? "1fr 220px auto" : "1fr auto",
        gap: 16,
        alignItems: "center",
        padding: "12px 18px",
        background: "rgba(10,9,14,0.82)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={labelStyle}>{song.title} · {cur.label}</div>
        <div
          style={{
            fontFamily: UI,
            fontSize: 13.5,
            color: cur.notes ? "#fff" : C.dim,
            marginTop: 4,
            lineHeight: 1.45,
            maxHeight: 44,
            overflow: "hidden",
          }}
        >
          {cur.notes || "No presenter notes for this slide."}
        </div>
      </div>

      {showNext && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 5 }}>Up Next</div>
          {next && nextStyle && nextBackground ? (
            <div style={{ width: 220, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
              <SlideCanvas slide={next} style={nextStyle} lineStyles={nextLineStyles} bg={nextBackground} radius={7} />
            </div>
          ) : (
            <div
              style={{
                width: 220,
                aspectRatio: "16/9",
                borderRadius: 7,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.05)",
                color: C.dim,
                fontFamily: UI,
                fontSize: 13,
              }}
            >
              End of song
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {fmtClock(elapsed)}
          </div>
          <div style={{ fontFamily: UI, fontSize: 12, color: C.sub, fontVariantNumeric: "tabular-nums" }}>
            {idx + 1} / {total}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 7,
            opacity: paused ? 0.4 : 1,
            pointerEvents: paused ? "none" : "auto",
          }}
        >
          <PCtl icon={ChevronLeft} title="Previous" onClick={onPrev} />
          <PCtl icon={ChevronRight} title="Next" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}
