import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Film,
  Image as ImageIcon,
  RotateCw,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  ImageSettings,
  MediaItem,
  MediaKind,
  Slide,
  SlideMedia,
  VideoSettings,
} from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { formatDuration } from "../../lib/media";
import {
  createSlideMedia,
  DEFAULT_SLIDE_MEDIA_OPACITY,
  DEFAULT_SLIDE_MEDIA_RADIUS,
  placedImageSettings,
  placedVideoSettings,
} from "../../lib/slideMedia";
import { Button } from "../../components/ui/Button";
import { Field, Range, Select, Toggle } from "../../components/ui/Field";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";
import { AdjustmentControls } from "../../components/media/AdjustmentControls";
import { SlideMediaPicker } from "./SlideMediaPicker";
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

const MAX_RADIUS = 12;

const ROTATIONS: ImageSettings["rotate"][] = [0, 90, 180, 270];

const nextRotation = (
  rotate: ImageSettings["rotate"],
): ImageSettings["rotate"] =>
  ROTATIONS[(ROTATIONS.indexOf(rotate) + 1) % ROTATIONS.length];

interface SlideMediaPanelProps {
  slide: Slide;
  editor: DeckEditor;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * The inspector's side of placed media: what is on the slide, how it is
 * stacked, and every setting for the one being worked on. Position and size are
 * handled on the slide itself (features/editor/SlideMediaOverlay); this panel
 * owns everything a drag cannot express.
 */
export function SlideMediaPanel({
  slide,
  editor,
  selectedId,
  onSelect,
}: SlideMediaPanelProps) {
  const { colors, fonts } = useUITheme();
  const library = useStore((s) => s.media);
  const [picking, setPicking] = useState<MediaKind | null>(null);

  const media = slide.media ?? [];
  const selected = media.find((item) => item.id === selectedId) ?? null;
  const selectedItem = selected
    ? library.find((item) => item.id === selected.mediaId)
    : undefined;

  const add = (item: MediaItem) => {
    const placed = createSlideMedia(item);
    editor.addSlideMedia(slide.id, placed);
    onSelect(placed.id);
  };

  const patch = (changes: Partial<SlideMedia>) => {
    if (!selected) return;
    editor.updateSlideMedia(slide.id, selected.id, changes, {
      coalesceKey: `media:${slide.id}:${selected.id}:settings`,
    });
  };

  const patchImage = (changes: Partial<ImageSettings>) => {
    if (!selected) return;
    patch({ image: { ...placedImageSettings(selected), ...changes } });
  };

  const patchVideo = (changes: Partial<VideoSettings>) => {
    if (!selected) return;
    patch({ video: { ...placedVideoSettings(selected), ...changes } });
  };

  const remove = (mediaId: string) => {
    editor.removeSlideMedia(slide.id, mediaId);
    if (mediaId === selectedId) onSelect(null);
  };

  const duplicate = (mediaId: string) => {
    const copyId = editor.duplicateSlideMedia(slide.id, mediaId);
    if (copyId) onSelect(copyId);
  };

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
      </div>

      {media.length === 0 ? (
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            color: colors.dim,
            margin: "10px 0 0",
            lineHeight: 1.55,
          }}
        >
          Place a picture or clip on the slide, then drag it where the text
          leaves room. Each one keeps its own size, position and settings, so a
          slide can be laid out however the message needs.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          {/* Newest on top: the last entry is painted over the ones before it. */}
          {[...media].reverse().map((placed) => {
            const item = library.find((entry) => entry.id === placed.mediaId);
            const active = placed.id === selectedId;
            return (
              <div
                key={placed.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: 6,
                  borderRadius: 10,
                  background: active ? fade(colors.accent, 0.14) : colors.raise,
                  border: `1px solid ${active ? fade(colors.accent, 0.4) : colors.border}`,
                }}
              >
                <button
                  onClick={() => onSelect(active ? null : placed.id)}
                  title={item ? item.name : "Missing file"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      width: 46,
                      height: 30,
                      flex: "none",
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#000",
                      display: "block",
                    }}
                  >
                    {item &&
                      (item.kind === "image" ? (
                        <ImageSurface item={item} variant="thumb" />
                      ) : (
                        <VideoThumb item={item} />
                      ))}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: fonts.ui,
                      fontSize: 12.5,
                      color: item ? colors.text : colors.danger,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item?.name ?? "File missing from library"}
                    {item?.kind === "video" && item.duration !== undefined && (
                      <span style={{ color: colors.dim }}>
                        {" · "}
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </span>
                </button>
                <SmallButton
                  icon={ChevronUp}
                  label="Bring forward"
                  onClick={() =>
                    editor.reorderSlideMedia(slide.id, placed.id, 1)
                  }
                />
                <SmallButton
                  icon={ChevronDown}
                  label="Send backward"
                  onClick={() =>
                    editor.reorderSlideMedia(slide.id, placed.id, -1)
                  }
                />
                <SmallButton
                  icon={Copy}
                  label="Duplicate"
                  onClick={() => duplicate(placed.id)}
                />
                <SmallButton
                  icon={Trash2}
                  label="Remove from slide"
                  danger
                  onClick={() => remove(placed.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 16 }}>
          <Field label="Fit inside its box">
            <Select
              value={
                selected.kind === "image"
                  ? placedImageSettings(selected).fit
                  : placedVideoSettings(selected).fit
              }
              options={FIT_OPTIONS}
              onChange={(event) => {
                const fit = event.target.value as ImageSettings["fit"];
                if (selected.kind === "image") patchImage({ fit });
                else patchVideo({ fit });
              }}
            />
          </Field>
          <Field
            label={`Opacity (${selected.opacity ?? DEFAULT_SLIDE_MEDIA_OPACITY}%)`}
          >
            <Range
              value={selected.opacity ?? DEFAULT_SLIDE_MEDIA_OPACITY}
              min={10}
              max={100}
              suffix="%"
              onChange={(event) =>
                patch({ opacity: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Corner rounding">
            <Range
              value={selected.radius ?? DEFAULT_SLIDE_MEDIA_RADIUS}
              min={0}
              max={MAX_RADIUS}
              step={0.2}
              onChange={(event) =>
                patch({ radius: Number(event.target.value) })
              }
            />
          </Field>

          {selected.kind === "image" ? (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patchImage({
                    rotate: nextRotation(placedImageSettings(selected).rotate),
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
                  patchImage({ flipH: !placedImageSettings(selected).flipH })
                }
              >
                <FlipHorizontal size={14} />
                Flip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  patchImage({ flipV: !placedImageSettings(selected).flipV })
                }
              >
                <FlipVertical size={14} />
                Flip
              </Button>
            </div>
          ) : (
            <VideoPlacementControls
              settings={placedVideoSettings(selected)}
              duration={selectedItem?.duration}
              onChange={patchVideo}
            />
          )}

          <div style={{ marginTop: 14 }}>
            <AdjustmentControls
              value={
                selected.kind === "image"
                  ? placedImageSettings(selected)
                  : placedVideoSettings(selected)
              }
              onChange={(changes) =>
                selected.kind === "image"
                  ? patchImage(changes)
                  : patchVideo(changes)
              }
            />
          </div>
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
        The clip holds its first frame while you edit and plays once the slide
        is on the projector
        {duration === undefined ? "" : ` (${formatDuration(duration)} long)`}.
      </p>
    </>
  );
}

function SmallButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const { colors } = useUITheme();
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        width: 26,
        height: 26,
        flex: "none",
        padding: 0,
        borderRadius: 7,
        border: "none",
        cursor: "pointer",
        background: "transparent",
        color: danger ? colors.danger : colors.sub,
      }}
    >
      <Icon size={14} />
    </button>
  );
}
