import { useState } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  Film,
  Image as ImageIcon,
  RotateCw,
  Type,
} from "lucide-react";
import type {
  ImageSettings,
  Slide,
  SlideMedia,
  SlideTextBox,
  VerticalAlign,
  VideoSettings,
} from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { formatDuration } from "../../lib/media";
import {
  createSlideMedia,
  DEFAULT_SLIDE_MEDIA_OPACITY,
  DEFAULT_SLIDE_MEDIA_RADIUS,
  placedImageSettings,
  placedMediaSource,
  placedVideoSettings,
} from "../../lib/slideMedia";
import type { SlideMediaChoice } from "../../lib/slideMedia";
import { Button } from "../../components/ui/Button";
import { Field, Range, Select, Toggle } from "../../components/ui/Field";
import { AdjustmentControls } from "../../components/media/AdjustmentControls";
import { SlideMediaPicker } from "./SlideMediaPicker";
import type { SlideElementRef } from "./SlideElementOverlay";
import type { DeckEditor } from "./useDeckEditor";

const FIT_OPTIONS = [
  { value: "cover", label: "Cover (fill the box, may crop)" },
  { value: "contain", label: "Contain (fit inside the box)" },
  { value: "fill", label: "Fill (stretch)" },
];

const RATE_OPTIONS = ["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => ({
  value,
  label: `${value}×`,
}));

const VERTICAL_ALIGN_OPTIONS: { value: VerticalAlign; label: string }[] = [
  { value: "top", label: "Top of the box" },
  { value: "middle", label: "Middle of the box" },
  { value: "bottom", label: "Bottom of the box" },
];

const MAX_RADIUS = 12;

const ROTATIONS: ImageSettings["rotate"][] = [0, 90, 180, 270];

const nextRotation = (
  rotate: ImageSettings["rotate"],
): ImageSettings["rotate"] =>
  ROTATIONS[(ROTATIONS.indexOf(rotate) + 1) % ROTATIONS.length];

const HINTS = {
  none: "Place a picture, clip or text box on the slide, then drag it where the layout needs it. Each one keeps its own size, position and settings, so a slide can be laid out however the message needs.",
  media:
    "Drag the picture or clip on the slide to move it, its corners to resize it, and the arrow keys to nudge it.",
  text: "Write straight into the box on the slide. Drag its edge to move it, its corners to resize it, and style the words from the Text section above.",
} as const;

interface SlideElementsPanelProps {
  slide: Slide;
  editor: DeckEditor;
  selected: SlideElementRef | null;
  onSelect: (element: SlideElementRef | null) => void;
  /** True on prose documents, where text is laid out in blocks rather than sung. */
  allowTextBoxes: boolean;
  onAddTextBox: () => void;
}

/**
 * The inspector's side of everything placed on a slide: what to add, and every
 * setting for the one being worked on. Position, size and stacking are handled
 * on the slide itself (features/editor/SlideElementOverlay); this panel owns
 * what a drag cannot express.
 */
export function SlideElementsPanel({
  slide,
  editor,
  selected,
  onSelect,
  allowTextBoxes,
  onAddTextBox,
}: SlideElementsPanelProps) {
  const { colors, fonts } = useUITheme();
  const library = useStore((s) => s.media);
  const [picking, setPicking] = useState<"image" | "video" | null>(null);

  const media =
    selected && selected.kind !== "text"
      ? ((slide.media ?? []).find((item) => item.id === selected.id) ?? null)
      : null;
  const textBox =
    selected?.kind === "text"
      ? ((slide.textBoxes ?? []).find((box) => box.id === selected.id) ?? null)
      : null;

  const add = (choice: SlideMediaChoice) => {
    const placed = createSlideMedia(choice);
    editor.addSlideMedia(slide.id, placed);
    onSelect({ id: placed.id, kind: placed.kind });
  };

  const patchMedia = (changes: Partial<SlideMedia>) => {
    if (!media) return;
    editor.updateSlideMedia(slide.id, media.id, changes, {
      coalesceKey: `media:${slide.id}:${media.id}:settings`,
    });
  };

  const patchImage = (changes: Partial<ImageSettings>) => {
    if (!media) return;
    patchMedia({ image: { ...placedImageSettings(media), ...changes } });
  };

  const patchVideo = (changes: Partial<VideoSettings>) => {
    if (!media) return;
    patchMedia({ video: { ...placedVideoSettings(media), ...changes } });
  };

  const patchTextBox = (changes: Partial<SlideTextBox>) => {
    if (!textBox) return;
    editor.updateSlideTextBox(slide.id, textBox.id, changes);
  };

  // Only media-library uploads record a length; asset-library pictures are
  // never clips, so nothing is lost by looking there alone.
  const duration =
    media && placedMediaSource(media) === "media"
      ? library.find((item) => item.id === media.mediaId)?.duration
      : undefined;

  const hint = media ? HINTS.media : textBox ? HINTS.text : HINTS.none;

  return (
    <>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Button variant="ghost" size="sm" onClick={() => setPicking("image")}>
          <ImageIcon size={14} />
          Add image
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPicking("video")}>
          <Film size={14} />
          Add video
        </Button>
        {allowTextBoxes && (
          <Button variant="ghost" size="sm" onClick={onAddTextBox}>
            <Type size={14} />
            Add text box
          </Button>
        )}
      </div>

      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 11.5,
          color: colors.dim,
          margin: "10px 0 0",
          lineHeight: 1.55,
        }}
      >
        {hint}
      </p>

      {media && (
        <div style={{ marginTop: 16 }}>
          <Field label="Fit inside its box">
            <Select
              value={
                media.kind === "image"
                  ? placedImageSettings(media).fit
                  : placedVideoSettings(media).fit
              }
              options={FIT_OPTIONS}
              onChange={(event) => {
                const fit = event.target.value as ImageSettings["fit"];
                if (media.kind === "image") patchImage({ fit });
                else patchVideo({ fit });
              }}
            />
          </Field>
          <Field
            label={`Opacity (${media.opacity ?? DEFAULT_SLIDE_MEDIA_OPACITY}%)`}
          >
            <Range
              value={media.opacity ?? DEFAULT_SLIDE_MEDIA_OPACITY}
              min={10}
              max={100}
              suffix="%"
              onChange={(event) =>
                patchMedia({ opacity: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Corner rounding">
            <Range
              value={media.radius ?? DEFAULT_SLIDE_MEDIA_RADIUS}
              min={0}
              max={MAX_RADIUS}
              step={0.2}
              onChange={(event) =>
                patchMedia({ radius: Number(event.target.value) })
              }
            />
          </Field>

          {media.kind === "image" ? (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patchImage({
                    rotate: nextRotation(placedImageSettings(media).rotate),
                  })
                }
              >
                <RotateCw size={14} />
                Rotate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patchImage({ flipH: !placedImageSettings(media).flipH })
                }
              >
                <FlipHorizontal size={14} />
                Flip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patchImage({ flipV: !placedImageSettings(media).flipV })
                }
              >
                <FlipVertical size={14} />
                Flip
              </Button>
            </div>
          ) : (
            <VideoPlacementControls
              settings={placedVideoSettings(media)}
              duration={duration}
              onChange={patchVideo}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <AdjustmentControls
              value={
                media.kind === "image"
                  ? placedImageSettings(media)
                  : placedVideoSettings(media)
              }
              onChange={(changes) =>
                media.kind === "image"
                  ? patchImage(changes)
                  : patchVideo(changes)
              }
            />
          </div>
        </div>
      )}

      {textBox && (
        <div style={{ marginTop: 16 }}>
          <Field label="Text sits at">
            <Select
              value={textBox.verticalAlign ?? "middle"}
              options={VERTICAL_ALIGN_OPTIONS}
              onChange={(event) =>
                patchTextBox({
                  verticalAlign: event.target.value as VerticalAlign,
                })
              }
            />
          </Field>
        </div>
      )}

      {picking && (
        <SlideMediaPicker
          kind={picking}
          onPick={add}
          onClose={() => setPicking(null)}
        />
      )}
    </>
  );
}

interface VideoPlacementControlsProps {
  settings: VideoSettings;
  duration?: number;
  onChange: (changes: Partial<VideoSettings>) => void;
}

function VideoPlacementControls({
  settings,
  duration,
  onChange,
}: VideoPlacementControlsProps) {
  const { colors, fonts } = useUITheme();
  return (
    <>
      <Field label="Speed">
        <Select
          value={String(settings.playbackRate)}
          options={RATE_OPTIONS}
          onChange={(event) =>
            onChange({ playbackRate: Number(event.target.value) })
          }
        />
      </Field>
      <Field label={`Volume (${settings.volume}%)`}>
        <Range
          value={settings.volume}
          min={0}
          max={100}
          suffix="%"
          onChange={(event) => onChange({ volume: Number(event.target.value) })}
        />
      </Field>
      <Toggle
        label="Muted"
        checked={settings.muted}
        onChange={(muted) => onChange({ muted })}
      />
      <Toggle
        label="Loop"
        checked={settings.loop}
        onChange={(loop) => onChange({ loop })}
      />
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 11.5,
          color: colors.dim,
          margin: "8px 0 0",
          lineHeight: 1.55,
        }}
      >
        While the clip is selected its own player is live on the slide, so it
        can be played, scrubbed, muted or thrown fullscreen from there. On the
        projector it starts itself as the slide comes up
        {duration === undefined ? "" : ` (${formatDuration(duration)} long)`}.
      </p>
    </>
  );
}
