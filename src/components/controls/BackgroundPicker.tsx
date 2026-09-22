import { useMemo, useRef, useState, type ReactNode } from "react";
import { Library, Palette, Pencil, Upload } from "lucide-react";
import type {
  Background,
  ImageSettings,
  MediaItem,
  VideoSettings,
} from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
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
import { Button } from "../ui/Button";
import { ImageSurface } from "../media/ImageSurface";
import { VideoThumb } from "../media/VideoThumb";
import { LazyMount } from "../ui/LazyMount";
import { CustomColorPicker } from "./CustomColorPicker";
import { BgSwatch } from "./BgSwatch";
import { RadioDot } from "./RadioDot";

/** The tiles scroll rather than run down the panel, so the whole library is
 *  one list however long it gets. */
const GRID_MAX_HEIGHT = 244;

/** The choice that hands the background back to whatever this place inherits. */
export interface InheritedBackground {
  label: string;
  background?: Background;
  imageSettings?: ImageSettings | null;
  videoSettings?: VideoSettings | null;
}

interface BackgroundPickerProps {
  backgrounds: Background[];
  value: string;
  onSelect: (id: string, image?: ImageSettings) => void;
  inherit?: InheritedBackground;
  highlightId?: string;
  onUploaded?: (id: string, image?: ImageSettings) => void;
  onAddColor?: (value: string, name?: string) => void;
  onManage?: () => void;
  imageSettings?: ImageSettings | null;
  videoSettings?: VideoSettings | null;
  /** Opens the asset's own editor for the one place this picker edits. */
  onEditUsage?: (request: AssetUsageRequest) => void;
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
      [background.blobId, background.mediaId].filter((id): id is string =>
        Boolean(id),
      ),
    ),
  );

/* The same file uploaded twice, or brought in once as a background and again
   into its module, is stored under two ids, so its kind, name and size stand
   in for the file itself. */
const entryFingerprint = (entry: PickerEntry): string | null => {
  const { kind, name, size } =
    entry.source === "library"
      ? {
          kind: entry.background.type,
          name: entry.background.name,
          size: entry.background.size,
        }
      : { kind: entry.item.kind, name: entry.item.name, size: entry.item.size };
  if (!size || (kind !== "image" && kind !== "video")) return null;
  return `${kind}:${size}:${name.trim().toLowerCase()}`;
};

/** The entry in use wins, then the library entry, so its name and settings
 *  are the ones on show. */
const withoutRepeats = (
  entries: PickerEntry[],
  activeId: string,
): PickerEntry[] => {
  const seen = new Set<string>();
  const inUseFirst = [
    ...entries.filter((entry) => entryId(entry) === activeId),
    ...entries.filter((entry) => entryId(entry) !== activeId),
  ];
  return inUseFirst.filter((entry) => {
    const keys = [entryFileId(entry), entryFingerprint(entry)].filter(
      (key): key is string => Boolean(key),
    );
    if (keys.some((key) => seen.has(key))) return false;
    for (const key of keys) seen.add(key);
    return true;
  });
};

export const BackgroundPicker = ({
  backgrounds,
  value,
  onSelect,
  inherit,
  highlightId,
  onUploaded,
  onAddColor,
  onManage,
  imageSettings,
  videoSettings,
  onEditUsage,
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
    return mostRecent(withoutRepeats(all, activeId), {
      createdAt: entryCreatedAt,
    });
  }, [backgrounds, unattached, activeId]);

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

  return (
    <>
      {inherit && (
        <InheritOption
          inherit={inherit}
          selected={value === ""}
          onSelect={() => onSelect("")}
        />
      )}

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
      maxHeight: GRID_MAX_HEIGHT,
      overflowY: "auto",
      alignContent: "start",
    }}
  >
    {children}
  </div>
);

interface InheritOptionProps {
  inherit: InheritedBackground;
  selected: boolean;
  onSelect: () => void;
}

/** Hands the choice back to whatever this slide, document or theme inherits,
 *  previewing the background that would take over. */
const InheritOption = ({ inherit, selected, onSelect }: InheritOptionProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <button
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        marginBottom: 8,
        padding: "8px 10px",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        background: selected ? fade(colors.accent, 0.12) : "transparent",
        border: `1px solid ${selected ? colors.accent : colors.border}`,
        color: selected ? colors.accentSoft : colors.text,
        fontFamily: fonts.ui,
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <RadioDot selected={selected} />
      <span className="ws-ellipsis" style={{ flex: 1, minWidth: 0 }}>
        {inherit.label}
      </span>
      <BgSwatch
        bg={inherit.background}
        settings={inherit.imageSettings}
        videoSettings={inherit.videoSettings}
        style={{
          width: 34,
          height: 20,
          flexShrink: 0,
          borderRadius: 5,
          border: `1px solid ${colors.border}`,
        }}
      />
    </button>
  );
};

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
        aria-pressed={active}
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
