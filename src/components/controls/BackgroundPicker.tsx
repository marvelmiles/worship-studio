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

type PickerEntry =
  | { group: "library"; background: Background }
  | { group: "pictures" | "clips"; item: MediaItem };

const GROUP_TITLE: Record<PickerEntry["group"], string> = {
  library: "Asset library",
  pictures: "Images",
  clips: "Videos",
};

const entryId = (entry: PickerEntry): string =>
  entry.group === "library" ? entry.background.id : entry.item.id;

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
  limit,
}: BackgroundPickerProps) => {
  const { colors, fonts } = useUITheme();
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

  /** Whether this background carries settings a single use can adjust. */
  const canEdit = (background: Background): boolean =>
    Boolean(onEditUsage) &&
    (isImageBackground(background) ||
      (isVideoBackground(background) && Boolean(clipFor(background))));

  /* Pictures and clips already attached as backgrounds are listed once, under
     the asset library, so the modules below only offer what is not there yet. */
  const attachedBlobIds = useMemo(
    () => new Set(backgrounds.map((bg) => bg.blobId).filter(Boolean)),
    [backgrounds],
  );

  const unattached = useMemo(
    () => media.filter((item) => !attachedBlobIds.has(item.id)),
    [media, attachedBlobIds],
  );

  const modulePictures = useMemo(
    () => unattached.filter((item) => item.kind === "image"),
    [unattached],
  );
  const moduleClips = useMemo(
    () => unattached.filter((item) => item.kind === "video"),
    [unattached],
  );

  /* One capped, newest-first list across all three groups, so the panel stays
     short while the whole library is still a dropdown away. */
  const entries = useMemo<PickerEntry[]>(() => {
    const all: PickerEntry[] = [
      ...backgrounds.map(
        (background) => ({ group: "library", background }) as PickerEntry,
      ),
      ...modulePictures.map(
        (item) => ({ group: "pictures", item }) as PickerEntry,
      ),
      ...moduleClips.map((item) => ({ group: "clips", item }) as PickerEntry),
    ];
    return mostRecent(all, {
      limit,
      createdAt: (entry) =>
        entry.group === "library"
          ? entry.background.createdAt
          : entry.item.createdAt,
      keep: (entry) => entryId(entry) === activeId,
    });
  }, [activeId, backgrounds, limit, modulePictures, moduleClips]);

  const groups = useMemo(
    () =>
      (["library", "pictures", "clips"] as const)
        .map((group) => ({
          group,
          entries: entries.filter((entry) => entry.group === group),
        }))
        .filter((section) => section.entries.length > 0),
    [entries],
  );

  const options = [
    ...(inheritLabel ? [{ value: "", label: inheritLabel }] : []),
    ...backgrounds.map((bg) => ({
      value: bg.id,
      label: `${bg.name} (${bg.category})`,
    })),
    ...modulePictures.map((item) => ({
      value: `image:${item.id}`,
      label: `${item.name} (Images)`,
    })),
    ...moduleClips.map((item) => ({
      value: `video:${item.id}`,
      label: `${item.name} (Videos)`,
    })),
  ];

  const total = backgrounds.length + unattached.length;

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
      settings: (inUse ? videoSettings : null) ?? defaults,
      defaults,
    });
  };

  /** Brings a picture or clip in from its module, then selects it. */
  const selectFromModule = (item: MediaItem) => {
    const id =
      item.kind === "image"
        ? attachImageBackground(item.id)
        : attachVideoBackground(item.id);
    if (!id) return;
    onSelect(
      id,
      item.kind === "image"
        ? (item.image ?? { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS })
        : undefined,
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

      {groups.map(({ group, entries: tiles }) => (
        <div key={group} style={{ marginBottom: 12 }}>
          <GroupLabel title={GROUP_TITLE[group]} count={tiles.length} />
          <SwatchGrid>
            {tiles.map((entry) =>
              entry.group === "library" ? (
                <SwatchTile
                  key={entry.background.id}
                  name={entry.background.name}
                  active={activeId === entry.background.id}
                  onPick={() => selectBackground(entry.background.id)}
                  onEdit={
                    canEdit(entry.background)
                      ? () => editBackground(entry.background)
                      : undefined
                  }
                >
                  <BgSwatch
                    bg={entry.background}
                    settings={
                      activeId === entry.background.id
                        ? imageSettings
                        : undefined
                    }
                    style={{ width: "100%", height: "100%" }}
                  />
                </SwatchTile>
              ) : (
                <SwatchTile
                  key={entry.item.id}
                  name={entry.item.name}
                  active={false}
                  onPick={() => selectFromModule(entry.item)}
                >
                  <ModuleThumb item={entry.item} />
                </SwatchTile>
              ),
            )}
          </SwatchGrid>
        </div>
      ))}

      {entries.length < total && (
        <p
          style={{
            margin: "0 0 10px",
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: colors.sub,
          }}
        >
          Showing the {entries.length} most recent. The dropdown above lists all{" "}
          {total}.
        </p>
      )}

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

const GroupLabel = ({ title, count }: { title: string; count: number }) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 8,
        fontFamily: fonts.ui,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: colors.sub,
        margin: "2px 0 7px",
      }}
    >
      <span>{title}</span>
      <span style={{ fontWeight: 600, letterSpacing: 0 }}>{count}</span>
    </div>
  );
};

const SwatchGrid = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 6,
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
