import type { PointerEvent, ReactNode } from "react";
import type {
  Background,
  ImageSettings,
  ResolvedStyle,
  Slide,
  VideoSettings,
} from "../types";
import { useUITheme } from "../theme/ThemeProvider";
import {
  backgroundImageSettings,
  isImageBackground,
  isVideoBackground,
} from "../lib/media";
import { BackgroundSurface } from "./media/BackgroundSurface";
import { SlideMediaLayers } from "./media/SlideMediaLayers";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { SlideTextBlock } from "./SlideTextBlock";
import { SlideTextBoxLayers } from "./SlideTextBoxLayers";
import { SLIDE_BODY_PADDING } from "../lib/slideLayout";

export interface ClickPoint {
  x: number;
  y: number;
}

interface SlideCanvasProps {
  slide: Slide;
  style: ResolvedStyle;
  bg: Background;
  bgImage?: ImageSettings | null;
  bgVideo?: VideoSettings | null;
  showLabel?: boolean;
  radius?: number;
  fill?: boolean;
  noBackground?: boolean;
  lineStyles?: ResolvedStyle[];
  selectedLine?: number | null;
  editing?: SlideTextEditing;
  editingTextBoxId?: string | null;
  onActivateText?: (boxId: string | null, point: ClickPoint) => void;
  mediaControlsFor?: string | null;
  live?: boolean;
  playBackground?: boolean;
  overlay?: ReactNode;
}

export const SlideCanvas = ({
  slide,
  style,
  bg,
  bgImage,
  bgVideo,
  showLabel,
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
  playBackground,
  overlay,
}: SlideCanvasProps) => {
  const { fonts } = useUITheme();
  const editable = Boolean(editing);
  const paintsPicture = !noBackground && isImageBackground(bg);
  const paintsVideo = !noBackground && isVideoBackground(bg);
  const pictureSettings = paintsPicture
    ? (bgImage ?? backgroundImageSettings(bg))
    : null;
  const bgStyle =
    noBackground || paintsPicture || paintsVideo
      ? {}
      : bg?.type === "solid"
        ? { background: bg.color }
        : { background: bg?.css || "#111" };

  const textBoxes = slide.textBoxes ?? [];
  const bodyLines = slide.lines ?? [];
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
      {paintsVideo && (
        <BackgroundSurface
          background={bg}
          videoSettings={bgVideo}
          variant={playBackground || live ? "full" : "thumb"}
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
          padding={SLIDE_BODY_PADDING}
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
            fontFamily: fonts.ui,
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
};
