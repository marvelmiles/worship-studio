import { useState } from "react";
import type { Background, ResolvedStyle, Slide } from "../types";
import { colors, fade, UI } from "../theme/tokens";
import { useThumbUrl } from "../lib/blobUrls";
import { FormattedText } from "./FormattedText";

interface SlideCanvasProps {
  slide: Slide;
  style: ResolvedStyle;
  bg: Background;
  showLabel?: boolean;
  scrim?: boolean;
  radius?: number;
  fill?: boolean;
  noBackground?: boolean;
  /** Per-line resolved style, same length/order as `slide.lines`. Falls back to `style` per line when absent. */
  lineStyles?: ResolvedStyle[];
  /** Index of the line currently being formatted. Enables click-to-select when provided. */
  selectedLine?: number | null;
  /** Called with a line index on click (toggling off if already selected), or `null` when clicking elsewhere on the slide. */
  onLineClick?: (index: number | null) => void;
}

/**
 * Renders a single 16:9 slide. Text is sized in container-query units (cqw),
 * so the same slide scales perfectly from a tiny thumbnail to a fullscreen
 * projection without any per-context font math. When `fill` is set the slide
 * fills its container instead of enforcing the 16:9 aspect ratio.
 */
export function SlideCanvas({
  slide,
  style,
  bg,
  showLabel,
  scrim,
  radius = 14,
  fill,
  noBackground,
  lineStyles,
  selectedLine,
  onLineClick,
}: SlideCanvasProps) {
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const interactive = Boolean(onLineClick);
  const bgBlobUrl = useThumbUrl(noBackground ? null : bg?.blobId);
  const bgImageUrl = bg?.blobId ? bgBlobUrl : bg?.dataUrl;
  const bgStyle = noBackground
    ? {}
    : bg?.type === "image"
      ? {
          backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
          backgroundColor: "#0a0a0c",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : bg?.type === "solid"
        ? { background: bg.color }
        : { background: bg?.css || "#111" };

  const wantScrim = !noBackground && (scrim ?? bg?.type === "image");
  const lines = slide.lines && slide.lines.length ? slide.lines : [""];

  return (
    <div
      style={{
        containerType: "inline-size",
        ...(fill
          ? { width: "100%", height: "100%" }
          : { aspectRatio: "16 / 9" }),
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        ...bgStyle,
      }}
    >
      {wantScrim && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(0deg,rgba(0,0,0,0.55),rgba(0,0,0,0.25))",
          }}
        />
      )}
      <div
        onClick={interactive ? () => onLineClick!(null) : undefined}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "7cqw 9cqw",
        }}
      >
        <div style={{ width: "100%" }}>
          {lines.map((ln, i) => {
            const lineStyle = lineStyles?.[i] ?? style;
            const selected = selectedLine === i;
            const hovered = interactive && hoverLine === i && !selected;
            return (
              <div
                key={i}
                onClick={
                  interactive
                    ? (e) => {
                        e.stopPropagation();
                        onLineClick!(selected ? null : i);
                      }
                    : undefined
                }
                onMouseEnter={interactive ? () => setHoverLine(i) : undefined}
                onMouseLeave={
                  interactive ? () => setHoverLine(null) : undefined
                }
                style={{
                  textAlign: lineStyle.align || "center",
                  color: lineStyle.color,
                  fontFamily: `'${lineStyle.fontFamily}', serif`,
                  fontWeight: lineStyle.fontWeight,
                  fontSize: `${lineStyle.fontSize}cqw`,
                  lineHeight: lineStyle.lineHeight,
                  letterSpacing: `${lineStyle.letterSpacing || 0}cqw`,
                  textShadow: lineStyle.textShadow,
                  textTransform: lineStyle.uppercase ? "uppercase" : "none",
                  cursor: interactive ? "pointer" : undefined,
                  borderRadius: 6,
                  padding: interactive ? "0.3cqw 0.6cqw" : undefined,
                  margin: interactive ? "-0.3cqw -0.6cqw" : undefined,
                  outline: selected
                    ? `0.25cqw solid ${colors.accent}`
                    : hovered
                      ? `0.25cqw dashed ${fade(colors.accent, 0.55)}`
                      : interactive
                        ? "0.25cqw dashed transparent"
                        : undefined,
                  outlineOffset: 2,
                  background: selected ? fade(colors.accent, 0.14) : undefined,
                  transition: interactive
                    ? "outline-color .15s ease, background .15s ease"
                    : undefined,
                }}
              >
                {ln ? <FormattedText text={ln} /> : "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
      {showLabel && slide.label && (
        <div
          style={{
            position: "absolute",
            left: "3.5cqw",
            bottom: "3cqw",
            fontFamily: UI,
            fontWeight: 600,
            fontSize: "2.2cqw",
            letterSpacing: "0.15cqw",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
            background: "rgba(0,0,0,0.32)",
            padding: "0.6cqw 1.4cqw",
            borderRadius: 999,
            backdropFilter: "blur(4px)",
          }}
        >
          {slide.label}
        </div>
      )}
    </div>
  );
}
