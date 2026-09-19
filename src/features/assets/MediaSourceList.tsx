import { useMemo, useRef, useState } from "react";
import {
  Check,
  Film,
  Image as ImageIcon,
  Layers,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MediaKind } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import routes from "../../routes";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { LazyMount } from "../../components/ui/LazyMount";
import { LibrarySection } from "../../components/ui/LibrarySection";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";
import type { AssetSection } from "./assetLibraryNavigation";
import { useOpenAssetEditor } from "./assetLibraryNavigation";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";

type SourceFilter = "all" | "added";

interface KindCopy {
  icon: LucideIcon;
  libraryLabel: string;
  uploadLabel: string;
  accept: string;
  editTitle: string;
  emptyTitle: string;
}

const COPY: Record<MediaKind, KindCopy> = {
  image: {
    icon: ImageIcon,
    libraryLabel: "Images library",
    uploadLabel: "Upload images",
    accept: "image/*",
    editTitle: "Edit in Images",
    emptyTitle: "No images here",
  },
  video: {
    icon: Film,
    libraryLabel: "Videos library",
    uploadLabel: "Upload videos",
    accept: "video/*",
    editTitle: "Edit in Videos",
    emptyTitle: "No videos here",
  },
};

interface MediaSourceListProps {
  kind: MediaKind;
  title: string;
  description: string;
  attentionId: string | null;
  /** Media already pulled into this part of the library, by the id it was given. */
  addedByMediaId: Map<string, string>;
  onAdd: (mediaId: string) => void;
  onRemove: (entryId: string) => void;
  addLabel: string;
  addedLabel: string;
  addedFilterLabel: string;
  section: AssetSection;
  filterable?: boolean;
  emptyMessage: string;
}

/**
 * The Images or Videos module, shown inside the asset library. Uploading here
 * adds to that module, and the pencil opens that module's own editor page, so
 * there is one library and one editor per kind of file rather than a copy of
 * each living in the asset library.
 */
export const MediaSourceList = ({
  kind,
  title,
  description,
  attentionId,
  addedByMediaId,
  onAdd,
  onRemove,
  addLabel,
  addedLabel,
  addedFilterLabel,
  section,
  filterable,
  emptyMessage,
}: MediaSourceListProps) => {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const openEditor = useOpenAssetEditor();
  const fileInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<SourceFilter>("all");

  const copy = COPY[kind];

  const library = useMemo(
    () => media.filter((item) => item.kind === kind).sort(sortMediaByRecency),
    [media, kind],
  );

  const items = useMemo(
    () =>
      filter === "all"
        ? library
        : library.filter((item) => addedByMediaId.has(item.id)),
    [addedByMediaId, filter, library],
  );

  const upload = (files: File[]) =>
    beginUpload(kind, files, (ids) => {
      for (const id of ids) if (id) onAdd(id);
    });

  return (
    <LibrarySection
      title={title}
      meta={`${items.length} of ${library.length}`}
      description={description}
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={14} />
          {copy.uploadLabel}
        </Button>
      }
    >
      <input
        ref={fileInput}
        type="file"
        accept={copy.accept}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) upload(files);
          event.target.value = "";
        }}
      />

      {filterable && (
        <div style={{ marginBottom: 14 }}>
          <SegmentedTabs<SourceFilter>
            ariaLabel={`${copy.libraryLabel} filter`}
            tabs={[
              {
                id: "all",
                label: copy.libraryLabel,
                icon: copy.icon,
                count: library.length,
              },
              {
                id: "added",
                label: addedFilterLabel,
                icon: Layers,
                count: addedByMediaId.size,
              },
            ]}
            value={filter}
            onChange={setFilter}
            minSegmentWidth={150}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={copy.icon}
          title={copy.emptyTitle}
          message={emptyMessage}
          compact
          bare
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
            gap: 10,
          }}
        >
          {items.map((item) => {
            const entryId = addedByMediaId.get(item.id);
            const added = Boolean(entryId);
            return (
              <div
                key={item.id}
                {...attentionAttribute(item.id)}
                className={
                  item.id === attentionId ? ATTENTION_CLASS : undefined
                }
                style={{ position: "relative", borderRadius: 11 }}
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "16/9",
                    borderRadius: 9,
                    overflow: "hidden",
                    background: "#000",
                    border: `1.5px solid ${added ? colors.accent : colors.border}`,
                  }}
                >
                  <LazyMount>
                    {item.kind === "image" ? (
                      <ImageSurface item={item} variant="thumb" />
                    ) : (
                      <VideoThumb item={item} applySettings />
                    )}
                  </LazyMount>
                  <button
                    onClick={() =>
                      openEditor(routes.mediaItem(item.kind, item.id), section)
                    }
                    aria-label={`Edit ${item.name}`}
                    title={copy.editTitle}
                    style={{
                      ...CARD_OVERLAY_BUTTON,
                      position: "absolute",
                      top: 6,
                      right: 6,
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="ws-ellipsis"
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 12,
                        color: colors.text,
                      }}
                    >
                      {item.name}
                    </div>
                    {item.duration ? (
                      <div
                        style={{
                          fontFamily: fonts.ui,
                          fontSize: 11.5,
                          color: colors.sub,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatDuration(item.duration)}
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={() =>
                      entryId ? onRemove(entryId) : onAdd(item.id)
                    }
                    aria-pressed={added}
                    title={
                      added ? `Remove ${item.name}` : `${addLabel} ${item.name}`
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                      padding: "4px 9px",
                      borderRadius: 999,
                      cursor: "pointer",
                      fontFamily: fonts.ui,
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: `1px solid ${added ? fade(colors.accent, 0.4) : colors.border}`,
                      background: added
                        ? fade(colors.accent, 0.16)
                        : "transparent",
                      color: added ? colors.accentSoft : colors.sub,
                    }}
                  >
                    {added ? <Check size={12} /> : <Plus size={12} />}
                    {added ? addedLabel : addLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LibrarySection>
  );
};
