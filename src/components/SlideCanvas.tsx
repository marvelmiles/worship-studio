import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Background, ImageSettings, ResolvedStyle, Slide } from "../types";
import { colors, fade, UI } from "../theme/tokens";
import { backgroundImageSettings, isImageBackground } from "../lib/media";
import { BackgroundSurface } from "./media/BackgroundSurface";
import { SlideMediaLayers } from "./media/SlideMediaLayers";
import { SCRIM_GRADIENT } from "./media/ImageLayer";
import { lineContentOffsets } from "../lib/inlineDocument";
import { analyzeLines, listMarkerLabel } from "../lib/lists";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { FormattedText } from "./FormattedText";

/** One indent level, in the same container-query unit the text is sized in. */
const INDENT_STEP_CQW = 3.2;

const FLEX_ALIGN = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
} as const;

interface SlideCanvasProps {
  slide: Slide;
  style: ResolvedStyle;
  bg: Background;
  /** Picture settings for this usage of `bg`; defaults to the asset library's own. */
  bgImage?: ImageSettings | null;
  showLabel?: boolean;
  scrim?: boolean;
  radius?: number;
  fill?: boolean;
  noBackground?: boolean;
  /** Per-line resolved style, same length/order as `slide.lines`. Falls back to `style` per line when absent. */
  lineStyles?: ResolvedStyle[];
  /** Index of the line the inspector is styling, outlined so the scope is visible. */
  selectedLine?: number | null;
  /** Makes the slide's text the editable surface, see hooks/useSlideTextEditor. */
  editing?: SlideTextEditing;
  /** True on the projector, where placed clips play instead of holding a frame. */
  live?: boolean;
  /** Drawn over the slide, above the placed media (the editor's drag surface). */
  overlay?: ReactNode;
}

/**
 * Renders a single 16:9 slide. Text is sized in container-query units (cqw),
 * so the same slide scales perfectly from a tiny thumbnail to a fullscreen
 * projection without any per-context font math. When `fill` is set the slide
 * fills its container instead of enforcing the 16:9 aspect ratio.
 *
 * With `editing` attached the text block itself becomes the editor: the caret
 * sits in the real slide, so what the writer types is already what the room
 * will see.
 *
 * Pictures and clips placed on the slide are painted over the text in the order
 * they are stacked; `overlay` is where the editor hangs its drag surface for
 * them, so this component stays free of any editing behaviour.
 */
export function SlideCanvas({
  slide,
  style,
  bg,
  bgImage,
  showLabel,
  scrim,
  radius = 14,
  fill,
  noBackground,
  lineStyles,
  selectedLine,
  editing,
  live,
  overlay,
}: SlideCanvasProps) {
  const editable = Boolean(editing);
  const paintsPicture = !noBackground && isImageBackground(bg);
  // Callers that resolved the settings pass them in; the rest fall back to the
  // asset's own, with the legacy per-slide darken toggle layered on top.
  const pictureSettings = paintsPicture
    ? (bgImage ?? {
        ...backgroundImageSettings(bg),
        ...(scrim === undefined ? {} : { scrim }),
      })
    : null;
  const bgStyle =
    noBackground || paintsPicture
      ? {}
      : bg?.type === "solid"
        ? { background: bg.color }
        : { background: bg?.css || "#111" };

  const wantScrim = !noBackground && !paintsPicture && scrim === true;
  const lines = useMemo(
    () => (slide.lines && slide.lines.length ? slide.lines : [""]),
    [slide.lines],
  );
  const items = useMemo(() => analyzeLines(lines), [lines]);
  const sourceOffsets = useMemo(
    () => (editable ? lineContentOffsets(lines) : null),
    [editable, lines],
  );

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
      {pictureSettings && (
        <BackgroundSurface
          background={bg}
          settings={pictureSettings}
          variant="thumb"
        />
      )}
      {wantScrim && (
        <div
          style={{ position: "absolute", inset: 0, background: SCRIM_GRADIENT }}
        />
      )}
      <div
        ref={editing?.ref}
        contentEditable={editable || undefined}
        suppressContentEditableWarning={editable}
        spellCheck={editable ? false : undefined}
        role={editable ? "textbox" : undefined}
        aria-multiline={editable || undefined}
        aria-label={editable ? "Slide text" : undefined}
        onKeyDown={editing?.onKeyDown}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "7cqw 9cqw",
          outline: "none",
          cursor: editable ? "text" : undefined,
        }}
      >
        <div style={{ width: "100%" }}>
          {items.map((item, i) => {
            const lineStyle = lineStyles?.[i] ?? style;
            const selected = selectedLine === i;
            const align = lineStyle.align || "center";
            const marked = editable || selectedLine != null;
            const content =
              sourceOffsets || item.content ? (
                <FormattedText
                  text={item.content}
                  baseWeight={lineStyle.fontWeight}
                  sourceBase={sourceOffsets?.[i]}
                />
              ) : (
                "\u00A0"
              );
            return (
              <div
                key={i}
                style={{
                  textAlign: align,
                  color: lineStyle.color,
                  fontFamily: `'${lineStyle.fontFamily}', serif`,
                  fontWeight: lineStyle.fontWeight,
                  fontSize: `${lineStyle.fontSize}cqw`,
                  lineHeight: lineStyle.lineHeight,
                  letterSpacing: `${lineStyle.letterSpacing || 0}cqw`,
                  textShadow: lineStyle.textShadow,
                  textTransform: lineStyle.uppercase ? "uppercase" : "none",
                  whiteSpace: editable ? "pre-wrap" : undefined,
                  borderRadius: 6,
                  padding: marked ? "0.3cqw 0.6cqw" : undefined,
                  margin: marked ? "-0.3cqw -0.6cqw" : undefined,
                  paddingInlineStart: item.level
                    ? `${item.level * INDENT_STEP_CQW + (marked ? 0.6 : 0)}cqw`
                    : undefined,
                  outline: selected
                    ? `0.25cqw solid ${colors.accent}`
                    : marked
                      ? "0.25cqw dashed transparent"
                      : undefined,
                  outlineOffset: 2,
                  background: selected ? fade(colors.accent, 0.14) : undefined,
                  transition: marked
                    ? "outline-color .15s ease, background .15s ease"
                    : undefined,
                }}
              >
                {item.kind ? (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.9cqw",
                      justifyContent: FLEX_ALIGN[align],
                      textAlign: "start",
                    }}
                  >
                    <span
                      aria-hidden
                      contentEditable={false}
                      style={{
                        flex: "none",
                        minWidth: "2.6cqw",
                        textAlign: "end",
                        fontVariantNumeric: "tabular-nums",
                        userSelect: editable ? "none" : undefined,
                      }}
                    >
                      {listMarkerLabel(item.kind, item.index, item.level)}
                    </span>
                    <span>{content}</span>
                  </span>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      </div>
      {slide.media && slide.media.length > 0 && (
        <SlideMediaLayers media={slide.media} live={live} />
      )}
      {overlay}
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
