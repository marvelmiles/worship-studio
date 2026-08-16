import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Film, Image as ImageIcon, Upload } from "lucide-react";
import type { MediaKind } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import {
  formatDuration,
  isImageBackground,
  sortMediaByRecency,
} from "../../lib/media";
import { backgroundChoice, mediaItemChoice } from "../../lib/slideMedia";
import type { SlideMediaChoice } from "../../lib/slideMedia";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { LazyMount } from "../../components/ui/LazyMount";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";

interface SlideMediaPickerProps {
  kind: MediaKind;
  onPick: (choice: SlideMediaChoice) => void;
  onClose: () => void;
}

const COPY: Record<
  MediaKind,
  { title: string; upload: string; empty: string }
> = {
  image: {
    title: "Add Image to Slide",
    upload: "Upload image",
    empty:
      "Upload a picture, or add one to the asset library, to place it on the slide.",
  },
  video: {
    title: "Add Video to Slide",
    upload: "Upload video",
    empty: "Upload a clip to place it on the slide.",
  },
};

const matches = (name: string, term: string): boolean =>
  !term || name.toLowerCase().includes(term);

/**
 * Picks a picture or clip to place on a slide. Pictures come from both places
 * the studio keeps them: the media library, and the picture backgrounds in the
 * asset library, so one already behind a slide can be placed on another without
 * being uploaded twice. Files uploaded from here land in the media library like
 * any other, so the same file can be reused instead of being stored again.
 */
export function SlideMediaPicker({
  kind,
  onPick,
  onClose,
}: SlideMediaPickerProps) {
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();

  const uploads = useMemo(
    () =>
      media
        .filter((item) => item.kind === kind && matches(item.name, term))
        .sort(sortMediaByRecency),
    [media, kind, term],
  );

  const assets = useMemo(
    () =>
      kind === "image"
        ? backgrounds.filter(
            (background) =>
              isImageBackground(background) && matches(background.name, term),
          )
        : [],
    [backgrounds, kind, term],
  );

  const pick = (choice: SlideMediaChoice) => {
    onPick(choice);
    onClose();
  };

  // The upload flow labels the files first, so the freshly saved records are
  // read back from the store once it reports the ids it wrote.
  const upload = (files: File[]) => {
    if (!files.length) return;
    beginUpload(kind, files, (ids) => {
      const saved = useStore
        .getState()
        .media.find((item) => item.id === ids[0]);
      if (saved) pick(mediaItemChoice(saved));
    });
  };

  const grouped = uploads.length > 0 && assets.length > 0;

  return (
    <Modal open onClose={onClose} title={COPY[kind].title} width={720}>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={`Search ${kind === "image" ? "images" : "videos"}…`}
          />
        </div>
        <Button variant="primary" onClick={() => inputRef.current?.click()}>
          <Upload size={15} />
          {COPY[kind].upload}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={`${kind}/*`}
        hidden
        onChange={(event) => {
          upload(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />

      {!uploads.length && !assets.length ? (
        <EmptyState
          icon={kind === "image" ? ImageIcon : Film}
          title={term ? "Nothing matches" : "Nothing to place yet"}
          message={term ? "Try a different search." : COPY[kind].empty}
          compact
          bare
        />
      ) : (
        <>
          {uploads.length > 0 && (
            <PickerGroup title={grouped ? "Media library" : null}>
              {uploads.map((item) => (
                <PickerTile
                  key={item.id}
                  name={item.name}
                  meta={
                    item.kind === "video"
                      ? formatDuration(item.duration)
                      : undefined
                  }
                  onPick={() => pick(mediaItemChoice(item))}
                >
                  {item.kind === "image" ? (
                    <ImageSurface item={item} variant="thumb" />
                  ) : (
                    <VideoThumb item={item} />
                  )}
                </PickerTile>
              ))}
            </PickerGroup>
          )}
          {assets.length > 0 && (
            <PickerGroup title={grouped ? "Asset library" : null}>
              {assets.map((background) => (
                <PickerTile
                  key={background.id}
                  name={background.name}
                  meta={background.builtIn ? "default" : undefined}
                  onPick={() => pick(backgroundChoice(background))}
                >
                  <BgSwatch
                    bg={background}
                    style={{ position: "absolute", inset: 0 }}
                  />
                </PickerTile>
              ))}
            </PickerGroup>
          )}
        </>
      )}
    </Modal>
  );
}

/** A run of tiles under its heading, which only appears once there are two. */
function PickerGroup({
  title,
  children,
}: {
  title: string | null;
  children: ReactNode;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div style={{ marginBottom: 16 }}>
      {title && (
        <div
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: colors.dim,
            marginBottom: 10,
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PickerTile({
  name,
  meta,
  onPick,
  children,
}: {
  name: string;
  meta?: string;
  onPick: () => void;
  children: ReactNode;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <button
      onClick={onPick}
      title={name}
      style={{
        padding: 0,
        borderRadius: 11,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        background: colors.raise,
        border: `1px solid ${colors.border}`,
      }}
      onMouseEnter={(event) =>
        (event.currentTarget.style.borderColor = fade(colors.accent, 0.5))
      }
      onMouseLeave={(event) =>
        (event.currentTarget.style.borderColor = colors.border)
      }
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          background: "#000",
        }}
      >
        <LazyMount>{children}</LazyMount>
      </div>
      <div
        style={{
          padding: "8px 10px",
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: colors.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
        {meta && (
          <span style={{ color: colors.dim }}>
            {" · "}
            {meta}
          </span>
        )}
      </div>
    </button>
  );
}
