import type { PointerEvent, ReactNode } from "react";
import type { Background, ImageSettings, ResolvedStyle, Slide } from "../types";
import { UI } from "../theme/tokens";
import { backgroundImageSettings, isImageBackground } from "../lib/media";
import { BackgroundSurface } from "./media/BackgroundSurface";
import { SlideMediaLayers } from "./media/SlideMediaLayers";
import { SCRIM_GRADIENT } from "./media/ImageLayer";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { SlideTextBlock } from "./SlideTextBlock";
import { SlideTextBoxLayers } from "./SlideTextBoxLayers";

/** The margins the slide's own text is painted with. */
const BODY_PADDING = "7cqw 9cqw";

/** Where a click landed, so the editor can put the caret there. */
export interface ClickPoint {
  x: number;
  y: number;
}

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
  /** The text box `editing` is attached to, or null for the slide's own text. */
  editingTextBoxId?: string | null;
  /** Editor only: a text surface was clicked and should take over the caret. */
  onActivateText?: (boxId: string | null, point: ClickPoint) => void;
  /** The placed clip whose player controls are live (the editor's selection). */
  mediaControlsFor?: string | null;
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
 * A slide carries its text two ways: the slide's own lines, which fill it, and
 * text boxes placed anywhere on it the way a picture is. Sermon decks are built
 * out of boxes, lyrics out of the slide's own lines, and both are painted here
 * from the same block renderer.
 *
 * With `editing` attached one of those blocks becomes the editor: the caret sits
 * in the real slide, so what the writer types is already what the room will see.
 * `overlay` is where the editor hangs its drag surface for the placements, so
 * this component stays free of any editing behaviour.
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
  editingTextBoxId = null,
  onActivateText,
  mediaControlsFor,
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

  const textBoxes = slide.textBoxes ?? [];
  const bodyLines = slide.lines ?? [];
  // A slide whose words all live in boxes has no body left to paint, and an
  // empty one would only get in the way of clicking into the boxes.
  const showBody =
    !textBoxes.length || bodyLines.some((line) => line.trim() !== "");
  const bodyActive = editable && editingTextBoxId === null;

  const activate = (boxId: string | null, event: PointerEvent<HTMLElement>) => {
    if (!onActivateText) return;
    event.stopPropagation();
    onActivateText(boxId, { x: event.clientX, y: event.clientY });
  };

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
      {showBody && (
        <SlideTextBlock
          lines={bodyLines}
          style={style}
          lineStyles={lineStyles}
          selectedLine={bodyActive ? selectedLine : null}
          editing={bodyActive ? editing : undefined}
          marked={editable}
          padding={BODY_PADDING}
          onPointerDown={
            onActivateText ? (event) => activate(null, event) : undefined
          }
        />
      )}
      {slide.media && slide.media.length > 0 && (
        <SlideMediaLayers
          media={slide.media}
          live={live}
          controlsFor={mediaControlsFor}
        />
      )}
      {textBoxes.length > 0 && (
        <SlideTextBoxLayers
          boxes={textBoxes}
          style={style}
          editing={editing}
          editingBoxId={editingTextBoxId}
          selectedLine={selectedLine}
          marked={editable}
          onPointerDownBox={
            onActivateText
              ? (boxId, event) => activate(boxId, event)
              : undefined
          }
        />
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
