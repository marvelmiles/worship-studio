import type { Background, ResolvedStyle, Slide } from "../../types";
import { C, UI } from "../../theme/tokens";
import { SlideCanvas } from "../../components/SlideCanvas";
import { inputStyle } from "../../components/ui/Field";

interface PreviewPanelProps {
  slide: Slide;
  style: ResolvedStyle;
  background: Background;
  onChangeLines: (lines: string[]) => void;
  onChangeLabel: (label: string) => void;
}

export function PreviewPanel({ slide, style, background, onChangeLines, onChangeLabel }: PreviewPanelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 24,
        background: "radial-gradient(circle at 50% 0%,rgba(255,255,255,0.02),transparent 60%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "auto",
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
          borderRadius: 14,
        }}
      >
        <SlideCanvas slide={slide} bg={background} style={style} showLabel scrim={slide.overrides?.scrim} />
      </div>
      <div style={{ maxWidth: 820, margin: "18px auto 0", width: "100%" }}>
        <span
          style={{
            fontFamily: UI,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: C.dim,
          }}
        >
          Slide Text
        </span>
        <textarea
          value={(slide.lines || []).join("\n")}
          onChange={(e) => onChangeLines(e.target.value.split("\n"))}
          style={{ ...inputStyle, marginTop: 8, minHeight: 92, lineHeight: 1.7, resize: "vertical", fontSize: 15 }}
        />
        <input
          value={slide.label}
          onChange={(e) => onChangeLabel(e.target.value)}
          placeholder="Slide label"
          style={{ ...inputStyle, marginTop: 8, fontSize: 13 }}
        />
      </div>
    </div>
  );
}
