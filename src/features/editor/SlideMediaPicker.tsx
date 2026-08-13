import { useMemo, useRef, useState } from "react";
import { Film, Image as ImageIcon, Upload } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { LazyMount } from "../../components/ui/LazyMount";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";

interface SlideMediaPickerProps {
  kind: MediaKind;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}

const COPY: Record<
  MediaKind,
  { title: string; upload: string; empty: string }
> = {
  image: {
    title: "Add Image to Slide",
    upload: "Upload image",
    empty: "Upload a picture to place it on the slide.",
  },
  video: {
    title: "Add Video to Slide",
    upload: "Upload video",
    empty: "Upload a clip to place it on the slide.",
  },
};

/**
 * Picks a picture or clip out of the media library to place on a slide. Files
 * uploaded from here land in the library like any other, so the same file can
 * be reused on other slides instead of being stored twice.
 */
export function SlideMediaPicker({
  kind,
  onPick,
  onClose,
}: SlideMediaPickerProps) {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return media
      .filter(
        (item) =>
          item.kind === kind &&
          (!term || item.name.toLowerCase().includes(term)),
      )
      .sort(sortMediaByRecency);
  }, [media, kind, query]);

  const pick = (item: MediaItem) => {
    onPick(item);
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
      if (saved) pick(saved);
    });
  };

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

      {list.length === 0 ? (
        <EmptyState
          icon={kind === "image" ? ImageIcon : Film}
          title={query.trim() ? "Nothing matches" : "Library is empty"}
          message={query.trim() ? "Try a different search." : COPY[kind].empty}
          compact
          bare
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
            gap: 12,
          }}
        >
          {list.map((item) => (
            <button
              key={item.id}
              onClick={() => pick(item)}
              title={item.name}
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
                (event.currentTarget.style.borderColor = fade(
                  colors.accent,
                  0.5,
                ))
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
                <LazyMount>
                  {item.kind === "image" ? (
                    <ImageSurface item={item} variant="thumb" />
                  ) : (
                    <VideoThumb item={item} />
                  )}
                </LazyMount>
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
                {item.name}
                {item.kind === "video" && item.duration !== undefined && (
                  <span style={{ color: colors.dim }}>
                    {" · "}
                    {formatDuration(item.duration)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
