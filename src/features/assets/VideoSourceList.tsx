import { useMemo, useRef, useState } from "react";
import { Check, Film, Layers, Pencil, Plus, Upload } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { LazyMount } from "../../components/ui/LazyMount";
import { LibrarySection } from "../../components/ui/LibrarySection";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { VideoThumb } from "../../components/media/VideoThumb";
import type { AssetSection } from "./assetLibraryNavigation";
import { useOpenAssetEditor } from "./assetLibraryNavigation";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";

type VideoSource = "all" | "backgrounds";

interface VideoSourceListProps {
  title: string;
  description: string;
  attentionId: string | null;
  addedByMediaId: Map<string, string>;
  onAdd: (mediaId: string) => void;
  onRemove: (entryId: string) => void;
  addLabel: string;
  addedLabel: string;
  section: AssetSection;
  filterable?: boolean;
  emptyMessage: string;
}

export const VideoSourceList = ({
  title,
  description,
  attentionId,
  addedByMediaId,
  onAdd,
  onRemove,
  addLabel,
  addedLabel,
  section,
  filterable,
  emptyMessage,
}: VideoSourceListProps) => {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const beginUpload = useStore((s) => s.beginUpload);
  const openEditor = useOpenAssetEditor();
  const videoInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<VideoSource>("all");

  const backgroundClips = useMemo(
    () =>
      new Set(
        backgrounds.flatMap((bg) =>
          bg.type === "video" && bg.mediaId ? [bg.mediaId] : [],
        ),
      ),
    [backgrounds],
  );

  const library = useMemo(
    () =>
      media.filter((item) => item.kind === "video").sort(sortMediaByRecency),
    [media],
  );

  const videos = useMemo(
    () =>
      source === "all"
        ? library
        : library.filter((item) => backgroundClips.has(item.id)),
    [backgroundClips, library, source],
  );

  const upload = (files: File[]) =>
    beginUpload("video", files, (ids) => {
      for (const id of ids) if (id) onAdd(id);
    });

  return (
    <LibrarySection
      title={title}
      meta={`${videos.length} of ${library.length}`}
      description={description}
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => videoInput.current?.click()}
        >
          <Upload size={14} />
          Upload video
        </Button>
      }
    >
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
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
          <SegmentedTabs<VideoSource>
            ariaLabel="Video source"
            tabs={[
              {
                id: "all",
                label: "Videos library",
                icon: Film,
                count: library.length,
              },
              {
                id: "backgrounds",
                label: "Background videos",
                icon: Layers,
                count: backgroundClips.size,
              },
            ]}
            value={source}
            onChange={setSource}
            minSegmentWidth={150}
          />
        </div>
      )}

      {videos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No videos here"
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
          {videos.map((item) => {
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
                    <VideoThumb item={item} applySettings />
                  </LazyMount>
                  <button
                    onClick={() => openEditor(`/videos/${item.id}`, section)}
                    aria-label={`Edit ${item.name}`}
                    title="Edit video"
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
                        fontSize: 11.5,
                        color: colors.sub,
                      }}
                    >
                      {item.name}
                    </div>
                    {item.duration ? (
                      <div
                        style={{
                          fontFamily: fonts.ui,
                          fontSize: 11,
                          color: colors.dim,
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
