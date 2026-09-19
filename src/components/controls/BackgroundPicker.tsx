import { useMemo, useRef, useState, type ReactNode } from "react";
import { Library, Palette, Pencil, Upload } from "lucide-react";
import type {
  Background,
  ImageSettings,
  MediaItem,
  VideoSettings,
} from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  backgroundImageSettings,
  backgroundVideoSettings,
  isImageBackground,
  isVideoBackground,
  snapshotBackgroundImage,
} from "../../lib/media";
import { mostRecent } from "../../lib/recentItems";
import type { AssetUsageRequest } from "../../lib/assetUsage";
import { Field, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { ImageSurface } from "../media/ImageSurface";
import { VideoThumb } from "../media/VideoThumb";
import { LazyMount } from "../ui/LazyMount";
import { CustomColorPicker } from "./CustomColorPicker";
import { BgSwatch } from "./BgSwatch";

/** The panel is a column beside the slide, so it shows what was added most
 *  recently and leaves the whole library to the dropdown above it. */
export const BACKGROUND_PICKER_LIMIT = 20;

interface BackgroundPickerProps {
  backgrounds: Background[];
  value: string;
  onSelect: (id: string, image?: ImageSettings) => void;
  inheritLabel?: string;
  highlightId?: string;
  onUploaded?: (id: string, image?: ImageSettings) => void;
  onAddColor?: (value: string, name?: string) => void;
  onManage?: () => void;
  imageSettings?: ImageSettings | null;
  videoSettings?: VideoSettings | null;
  /** Opens the asset's own editor for the one place this picker edits. */
  onEditUsage?: (request: AssetUsageRequest) => void;
  /** How many tiles to show at most, newest first. */
  limit?: number;
}

/** A background in the library, or a picture or clip that can become one. */
type PickerEntry =
  | { source: "library"; background: Background }
  | { source: "module"; item: MediaItem };

const entryId = (entry: PickerEntry): string =>
  entry.source === "library" ? entry.background.id : entry.item.id;

const entryName = (entry: PickerEntry): string =>
  entry.source === "library" ? entry.background.name : entry.item.name;

const entryCreatedAt = (entry: PickerEntry): string | undefined =>
  entry.source === "library"
    ? entry.background.createdAt
    : entry.item.createdAt;

/* Which file an entry stands for, so the same picture or clip is listed once
   however it got here. A background names its file with blobId or mediaId
   depending on when it was made, and a colour stands only for itself. */
const entryFileId = (entry: PickerEntry): string =>
  entry.source === "library"
    ? (entry.background.blobId ??
      entry.background.mediaId ??
      entry.background.id)
    : entry.item.id;

const backgroundFileIds = (backgrounds: Background[]): Set<string> =>
  new Set(
    backgrounds.flatMap((background) =>
      [background.blobId, background.mediaId].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

/** The library entry wins, so its name and settings are the ones on show. */
const withoutRepeats = (entries: PickerEntry[]): PickerEntry[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const fileId = entryFileId(entry);
    if (seen.has(fileId)) return false;
    seen.add(fileId);
    return true;
  });
};

export const BackgroundPicker = ({
  backgrounds,
  value,
  onSelect,
  inheritLabel,
  highlightId,
  onUploaded,
  onAddColor,
  onManage,
  imageSettings,
  videoSettings,
  onEditUsage,
  limit = BACKGROUND_PICKER_LIMIT,
}: BackgroundPickerProps) => {
  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const attachImageBackground = useStore((s) => s.attachImageBackground);
  const attachVideoBackground = useStore((s) => s.attachVideoBackground);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showColor, setShowColor] = useState(false);

  const activeId = highlightId ?? value;

  const clipFor = (background?: Background) =>
    background?.mediaId
      ? media.find((item) => item.id === background.mediaId)
      : undefined;

  /* Pictures and clips already attached as backgrounds are listed once, so the
     modules below only offer what is not in the library yet. */
  const attachedFileIds = useMemo(
    () => backgroundFileIds(backgrounds),
    [backgrounds],
  );

  const unattached = useMemo(
    () => media.filter((item) => !attachedFileIds.has(item.id)),
    [media, attachedFileIds],
  );

  /* Colors, pictures and clips share one newest-first list: what a background
     is made of is a detail of the tile, not a reason to split the panel up. */
  const entries = useMemo<PickerEntry[]>(() => {
    const all: PickerEntry[] = [
      ...backgrounds.map(
        (background) => ({ source: "library", background }) as PickerEntry,
      ),
      ...unattached.map((item) => ({ source: "module", item }) as PickerEntry),
    ];
    return mostRecent(withoutRepeats(all), {
      limit,
      createdAt: entryCreatedAt,
      keep: (entry) => entryId(entry) === activeId,
    });
  }, [activeId, backgrounds, limit, unattached]);

  const options = [
    ...(inheritLabel ? [{ value: "", label: inheritLabel }] : []),
    ...backgrounds.map((bg) => ({
      value: bg.id,
      label: `${bg.name} (${bg.category})`,
    })),
    ...unattached.map((item) => ({
      value: `${item.kind}:${item.id}`,
      label: `${item.name} (${item.kind === "image" ? "Images" : "Videos"})`,
    })),
  ];

  const selectBackground = (id: string) => {
    const background = backgrounds.find((bg) => bg.id === id);
    onSelect(id, snapshotBackgroundImage(background));
  };

  /**
   * Editing a background hands the whole choice over: the settings come back
   * with the background itself, so what is tuned is what ends up in use.
   */
  const editBackground = (background: Background) => {
    if (!onEditUsage) return;
    const inUse = background.id === activeId;
    if (isImageBackground(background)) {
      const defaults = backgroundImageSettings(background);
      onEditUsage({
        assetId: background.id,
        kind: "image",
        inUse,
        settings: (inUse ? imageSettings : null) ?? defaults,
        defaults,
      });
      return;
    }
    const clip = clipFor(background);
    if (!clip) return;
    const defaults = backgroundVideoSettings(clip);
    onEditUsage({
      assetId: background.id,
      kind: "video",
      inUse,
      settings: (inUse ? videoSettings : null) ?? defaults,
      defaults,
    });
  };

  /** Brings a picture or clip in from its module as a background. */
  const attachFromModule = (item: MediaItem): string =>
    item.kind === "image"
      ? attachImageBackground(item.id)
      : attachVideoBackground(item.id);

  const selectFromModule = (item: MediaItem) => {
    const id = attachFromModule(item);
    if (!id) return;
    onSelect(
      id,
      item.kind === "image"
        ? (item.image ?? { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS })
        : undefined,
    );
  };

  /* A picture or clip has to be a background before it can carry settings for
     one slide, so the pencil attaches it first and then opens its editor. */
  const editFromModule = (item: MediaItem) => {
    if (!onEditUsage) return;
    const assetId = attachFromModule(item);
    if (!assetId) return;
    const inUse = assetId === activeId;
    if (item.kind === "image") {
      const defaults: ImageSettings = {
        ...DEFAULT_BACKGROUND_IMAGE_SETTINGS,
        ...item.image,
      };
      onEditUsage({
        assetId,
        kind: "image",
        inUse,
        settings: defaults,
        defaults,
      });
      return;
    }
    const defaults = backgroundVideoSettings(item);
    onEditUsage({
      assetId,
      kind: "video",
      inUse,
      settings: defaults,
      defaults,
    });
  };

  const canEdit = (entry: PickerEntry): boolean => {
    if (!onEditUsage) return false;
    if (entry.source === "module") return true;
    const { background } = entry;
    return (
      isImageBackground(background) ||
      (isVideoBackground(background) && Boolean(clipFor(background)))
    );
  };

  const selectOption = (option: string) => {
    const [prefix, mediaId] = option.split(":");
    if (prefix !== "image" && prefix !== "video") {
      selectBackground(option);
      return;
    }
    const item = media.find((entry) => entry.id === mediaId);
    if (item) selectFromModule(item);
  };

  return (
    <>
      <Field label="Background">
        <Select
          value={value}
          options={options}
          onChange={(e) => selectOption(e.target.value)}
        />
      </Field>

      <SwatchGrid>
        {entries.map((entry) => (
          <SwatchTile
            key={entryId(entry)}
            name={entryName(entry)}
            active={activeId === entryId(entry)}
            onPick={() =>
              entry.source === "library"
                ? selectBackground(entry.background.id)
                : selectFromModule(entry.item)
            }
            onEdit={
              canEdit(entry)
                ? () =>
                    entry.source === "library"
                      ? editBackground(entry.background)
                      : editFromModule(entry.item)
                : undefined
            }
          >
            {entry.source === "library" ? (
              <BgSwatch
                bg={entry.background}
                settings={
                  activeId === entry.background.id ? imageSettings : undefined
                }
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <ModuleThumb item={entry.item} />
            )}
          </SwatchTile>
        ))}
      </SwatchGrid>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {onManage && (
          <Button variant="ghost" size="sm" onClick={onManage}>
            <Library size={14} />
            Manage backgrounds
          </Button>
        )}
        {onUploaded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            Upload image
          </Button>
        )}
        {onAddColor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColor((v) => !v)}
          >
            <Palette size={14} />
            Solid / custom color
          </Button>
        )}
      </div>

      {onAddColor && showColor && (
        <div style={{ marginTop: 10 }}>
          <CustomColorPicker
            onAdd={(value, name) => {
              onAddColor(value, name);
              setShowColor(false);
            }}
          />
        </div>
      )}

      {onUploaded && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length)
              beginUpload(
                "background",
                files,
                (ids) =>
                  ids[0] &&
                  onUploaded(ids[0], { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS }),
              );
            e.target.value = "";
          }}
        />
      )}
    </>
  );
};

const SwatchGrid = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 6,
      marginBottom: 12,
    }}
  >
    {children}
  </div>
);

interface SwatchTileProps {
  name: string;
  active: boolean;
  onPick: () => void;
  onEdit?: () => void;
  children: ReactNode;
}

const SwatchTile = ({
  name,
  active,
  onPick,
  onEdit,
  children,
}: SwatchTileProps) => {
  const { colors } = useUITheme();
  return (
    <div
      className={`ws-reveal-host${active ? " is-active" : ""}`}
      style={{ position: "relative" }}
    >
      <button
        title={name}
        onClick={onPick}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: 7,
          cursor: "pointer",
          padding: 0,
          overflow: "hidden",
          background: "transparent",
          border: `1.5px solid ${active ? colors.accent : colors.border}`,
        }}
      >
        {children}
      </button>
      {onEdit && (
        <button
          className="ws-reveal"
          onClick={onEdit}
          title="Edit for this use"
          aria-label={`Edit ${name} for this use`}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: 6,
            background: "rgba(0,0,0,0.62)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            padding: 0,
          }}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
};

const ModuleThumb = ({ item }: { item: MediaItem }) => (
  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100%",
      background: "#000",
    }}
  >
    <LazyMount>
      {item.kind === "image" ? (
        <ImageSurface item={item} variant="thumb" />
      ) : (
        <VideoThumb item={item} />
      )}
    </LazyMount>
  </div>
);
