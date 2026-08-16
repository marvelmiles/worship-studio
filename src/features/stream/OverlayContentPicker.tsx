import { useMemo, useState } from "react";
import { BookOpen, FileText, Image as ImageIcon, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContentKind, MediaItem } from "../../types";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { inputStyle } from "../../components/ui/Field";
import { ImageSurface } from "../../components/media/ImageSurface";

/** One thing that can be dropped onto the broadcast, flattened for the list. */
interface PickableItem {
  id: string;
  name: string;
  /** Only media carries a preview; a passage or manuscript is named, not shown. */
  media?: MediaItem;
}

const KIND_ICON: Record<ContentKind, LucideIcon> = {
  scripture: BookOpen,
  manuscript: FileText,
  image: ImageIcon,
  video: Video,
};

const KIND_TITLE: Record<ContentKind, string> = {
  scripture: "Add a passage",
  manuscript: "Add a manuscript",
  image: "Add a picture",
  video: "Add a clip",
};

const KIND_EMPTY: Record<ContentKind, string> = {
  scripture: "Save a passage from the Bible page and it will appear here.",
  manuscript: "Write a manuscript and it will appear here.",
  image: "Upload a picture in the Media library and it will appear here.",
  video: "Upload a clip in the Media library and it will appear here.",
};

/**
 * Picks the library item an overlay will show, without leaving the broadcast.
 *
 * Mid-service the operator cannot afford to navigate away from a running
 * camera to go and find a passage, so every kind the broadcast accepts is
 * offered from one list here. It reads the same store slices the Bible,
 * Manuscripts and Media pages read, so anything saved anywhere in the app is
 * immediately available to put on screen.
 */
export function OverlayContentPicker({
  kind,
  onPick,
  onClose,
}: {
  /** Null closes the picker; a kind opens it on that library. */
  kind: ContentKind | null;
  onPick: (kind: ContentKind, item: PickableItem) => void;
  onClose: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const scriptures = useStore((s) => s.scriptures);
  const manuscripts = useStore((s) => s.manuscripts);
  const media = useStore((s) => s.media);
  const [query, setQuery] = useState("");

  const items = useMemo<PickableItem[]>(() => {
    if (!kind) return [];
    if (kind === "scripture" || kind === "manuscript") {
      const docs = kind === "scripture" ? scriptures : manuscripts;
      return docs
        .filter((doc) => !doc.deleted)
        .map((doc) => ({ id: doc.id, name: doc.title }));
    }
    return media
      .filter((item) => item.kind === kind)
      .map((item) => ({ id: item.id, name: item.name, media: item }));
  }, [kind, scriptures, manuscripts, media]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  if (!kind) return null;
  const Icon = KIND_ICON[kind];

  return (
    <Modal open onClose={onClose} title={KIND_TITLE[kind]} width={470}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        aria-label={`Search ${kind === "scripture" ? "passages" : kind === "manuscript" ? "manuscripts" : "media"}`}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={items.length === 0 ? "Nothing here yet" : "No matches"}
          message={
            items.length === 0 ? KIND_EMPTY[kind] : "Try a different search."
          }
          compact
          bare
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onPick(kind, item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                textAlign: "left",
                padding: item.media ? 7 : "11px 12px",
                borderRadius: 11,
                cursor: "pointer",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontFamily: fonts.ui,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              {item.media ? (
                <span
                  style={{
                    width: 60,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 7,
                    overflow: "hidden",
                    background: colors.raise,
                    display: "grid",
                    placeItems: "center",
                    color: colors.dim,
                  }}
                >
                  {item.media.kind === "image" ? (
                    <ImageSurface item={item.media} variant="thumb" />
                  ) : (
                    <Video size={16} />
                  )}
                </span>
              ) : (
                <Icon size={16} color={colors.accentSoft} />
              )}
              <span className="ws-ellipsis" style={{ minWidth: 0 }}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
