import { useMemo, useRef, useState } from "react";
import { Check, Film, Pencil, Plus, Upload } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { LazyMount } from "../../components/ui/LazyMount";
import { PillTabs } from "../../components/ui/PillTabs";
import { VideoThumb } from "../../components/media/VideoThumb";
import type { AssetSection } from "./assetLibraryNavigation";
import { useOpenAssetEditor } from "./assetLibraryNavigation";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";

type VideoSource = "all" | "backgrounds";

interface VideoSourceListProps {
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

  const videos = useMemo(() => {
    const backgroundClips = new Set(
      backgrounds.flatMap((bg) =>
        bg.type === "video" && bg.mediaId ? [bg.mediaId] : [],
      ),
    );
    return media
      .filter(
        (item) =>
          item.kind === "video" &&
          (source === "all" || backgroundClips.has(item.id)),
      )
      .sort(sortMediaByRecency);
  }, [media, backgrounds, source]);

  const upload = (files: File[]) =>
    beginUpload("video", files, (ids) => {
      for (const id of ids) if (id) onAdd(id);
    });

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        {filterable ? (
          <PillTabs<VideoSource>
            ariaLabel="Video source"
            tabs={[
              { id: "all", label: "Videos library" },
              { id: "backgrounds", label: "Background videos" },
            ]}
            value={source}
            onChange={setSource}
          />
        ) : (
          <span
            style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.dim }}
          >
            From your Videos library
          </span>
        )}
        <Button variant="primary" onClick={() => videoInput.current?.click()}>
          <Upload size={15} />
          Upload video
        </Button>
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
      </div>

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
            gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
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
                      style={{
                        fontFamily: fonts.ui,
                        fontSize: 11.5,
                        color: colors.sub,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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
    </>
  );
};
