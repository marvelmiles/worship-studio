import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, DISPLAY, UI } from "../../theme/tokens";
import { fmtClock } from "../../lib/id";
import { useViewport } from "../../hooks/useViewport";
import { PCtl } from "../../components/ui/Button";
import { SlideCanvas } from "../../components/SlideCanvas";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";
import type { StageFrame } from "./stageContent";

interface PresenterBarProps {
  title: string;
  currentLabel: string;
  notes?: string;
  nextFrame: StageFrame | null;
  endLabel: string;
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

function NextPreview({ frame, endLabel }: { frame: StageFrame | null; endLabel: string }) {
  if (!frame) {
    return (
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
        {endLabel}
      </div>
    );
  }
  const { content } = frame;
  return (
    <div style={{ width: 220, boxShadow: "0 6px 18px rgba(0,0,0,0.5)" }}>
      {content.kind === "text" ? (
        <SlideCanvas
          slide={content.slide}
          style={content.style}
          lineStyles={content.lineStyles}
          bg={content.background}
          radius={7}
        />
      ) : (
        <div
          style={{
            position: "relative",
            aspectRatio: "16/9",
            borderRadius: 7,
            overflow: "hidden",
          }}
        >
          {content.kind === "image" ? (
            <ImageSurface item={content.item} variant="thumb" />
          ) : (
            <VideoThumb item={content.item} />
          )}
        </div>
      )}
    </div>
  );
}

export function PresenterBar({
  title,
  currentLabel,
  notes,
  nextFrame,
  endLabel,
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
        <div style={labelStyle}>
          {title} · {currentLabel}
        </div>
        <div
          style={{
            fontFamily: UI,
            fontSize: 13.5,
            color: notes ? "#fff" : C.dim,
            marginTop: 4,
            lineHeight: 1.45,
            maxHeight: 44,
            overflow: "hidden",
          }}
        >
          {notes || "No presenter notes for this slide."}
        </div>
      </div>

      {showNext && (
        <div>
          <div style={{ ...labelStyle, marginBottom: 5 }}>Up Next</div>
          <NextPreview frame={nextFrame} endLabel={endLabel} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 22,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
            }}
          >
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
