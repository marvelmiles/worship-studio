import type { Background, ResolvedStyle, Slide } from "../types";
import { UI } from "../theme/tokens";

interface SlideCanvasProps {
  slide: Slide;
  style: ResolvedStyle;
  bg: Background;
  showLabel?: boolean;
  scrim?: boolean;
  radius?: number;
  fill?: boolean;
  noBackground?: boolean;
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
}: SlideCanvasProps) {
  const bgStyle = noBackground
    ? {}
    : bg?.type === "image"
    ? {
        backgroundImage: `url(${bg.dataUrl})`,
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
        ...(fill ? { width: "100%", height: "100%" } : { aspectRatio: "16 / 9" }),
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
            background: "linear-gradient(0deg,rgba(0,0,0,0.55),rgba(0,0,0,0.25))",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent:
            style.align === "left"
              ? "flex-start"
              : style.align === "right"
              ? "flex-end"
              : "center",
          padding: "7cqw 9cqw",
          textAlign: style.align || "center",
        }}
      >
        <div
          style={{
            color: style.color,
            fontFamily: `'${style.fontFamily}', serif`,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: `${style.letterSpacing || 0}cqw`,
            textShadow: style.textShadow,
            textTransform: style.uppercase ? "uppercase" : "none",
            maxWidth: "100%",
          }}
        >
          {lines.map((ln, i) => (
            <div key={i} style={{ fontSize: `${style.fontSize}cqw` }}>
              {ln || "\u00A0"}
            </div>
          ))}
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
