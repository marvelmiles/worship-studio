import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Film, Image as ImageIcon, ImagePlus, Pencil, Trash2, Upload, Wallpaper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { useStore } from "../../store/useStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatBytes } from "../../lib/storageStats";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import { imageDeckIndex } from "../presentation/useDeck";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LazyMount } from "../../components/ui/LazyMount";
import { Button, IconButton } from "../../components/ui/Button";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";
import { ImageEditorModal } from "./ImageEditorModal";
import { VideoEditorModal } from "./VideoEditorModal";

interface MediaPageConfig {
  kind: MediaKind;
  title: string;
  subtitle: string;
  uploadLabel: string;
  accept: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyIcon: LucideIcon;
}

const CONFIGS: Record<MediaKind, MediaPageConfig> = {
  image: {
    kind: "image",
    title: "Images",
    subtitle: "Upload, edit and project images. Presenting one flips through the library like a slideshow.",
    uploadLabel: "Upload Images",
    accept: "image/*",
    emptyTitle: "No images yet",
    emptyMessage: "Upload some to present them on screen or use them as slide backgrounds.",
    emptyIcon: ImageIcon,
  },
  video: {
    kind: "video",
    title: "Videos",
    subtitle: "Upload, trim and project videos with full playback control while live.",
    uploadLabel: "Upload Videos",
    accept: "video/*",
    emptyTitle: "No videos yet",
    emptyMessage: "Upload some to play them on the projector.",
    emptyIcon: Film,
  },
};

const itemSize = (item: MediaItem) => formatBytes(item.size || 0);

export function MediaLibraryPage({ kind }: { kind: MediaKind }) {
  const config = CONFIGS[kind];
  useDocumentTitle(`${config.title} · WorshipStudio`);

  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const removeMedia = useStore((s) => s.removeMedia);
  const startPresent = useStore((s) => s.startPresent);
  const useImageAsBackground = useStore((s) => s.useImageAsBackground);
  const pushToast = useStore((s) => s.pushToast);

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState<MediaItem | null>(null);

  // Deep-links (e.g. dashboard activities) land here with the item to open.
  const location = useLocation();
  const openId = (location.state as { openId?: string } | null)?.openId;
  useEffect(() => {
    if (!openId) return;
    const item = media.find((m) => m.id === openId && m.kind === kind);
    if (item) setEditing(item);
    window.history.replaceState({}, "");
  }, [openId, media, kind]);

  const list = useMemo(() => {
    let base = media.filter((m) => m.kind === kind);
    const term = query.trim().toLowerCase();
    if (term) base = base.filter((m) => m.name.toLowerCase().includes(term));
    return base.sort(sortMediaByRecency);
  }, [media, kind, query]);

  const present = (item: MediaItem, pip = false) => {
    const mode = pip ? "pip" : "stage";
    if (kind === "image") startPresent("image", item.id, imageDeckIndex(media, item.id), mode);
    else startPresent("video", item.id, 0, mode);
  };

  const asBackground = (item: MediaItem) => {
    const id = useImageAsBackground(item.id);
    if (id) pushToast(`Added "${item.name}" to your backgrounds.`);
  };

  return (
    <div className="ws-page">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            <Upload size={16} />
            {config.uploadLabel}
          </Button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) beginUpload(kind, files);
          e.target.value = "";
        }}
      />

      <div className="ws-row-wrap" style={{ marginBottom: 18 }}>
        <SearchInput value={query} onChange={setQuery} placeholder={`Search ${config.title.toLowerCase()}…`} />
      </div>

      {list.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={config.emptyIcon}
            title={`No ${config.title.toLowerCase()} match`}
            message="Try a different search."
          />
        ) : (
          <EmptyState
            icon={config.emptyIcon}
            title={config.emptyTitle}
            message={config.emptyMessage}
            action={
              <Button variant="primary" onClick={() => inputRef.current?.click()}>
                <ImagePlus size={15} />
                {config.uploadLabel}
              </Button>
            }
          />
        )
      ) : (
        <div className="ws-card-grid">
          {list.map((item) => (
            <div key={item.id} className="ws-glass ws-card">
              <div
                className="ws-thumb"
                onClick={() => setEditing(item)}
                style={{ cursor: "pointer" }}
                title="Open editor"
              >
                <LazyMount>
                  {item.kind === "image" ? (
                    <ImageSurface item={item} variant="thumb" />
                  ) : (
                    <>
                      <VideoThumb item={item} />
                      {item.duration !== undefined && (
                        <div className="ws-thumb-badge">{formatDuration(item.duration)}</div>
                      )}
                    </>
                  )}
                </LazyMount>
              </div>
              <div className="ws-card-body">
                <div className="ws-card-title ws-ellipsis" style={{ display: "block" }}>
                  {item.name}
                </div>
                <div className="ws-card-sub">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {itemSize(item)}
                </div>
                <div className="ws-card-actions">
                  <PresentMenu onPresent={({ pip }) => present(item, pip)} />
                  <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                    <Pencil size={13} />
                    Edit
                  </Button>
                  {item.kind === "image" && (
                    <IconButton icon={Wallpaper} title="Use as background" onClick={() => asBackground(item)} />
                  )}
                  <div style={{ marginLeft: "auto" }}>
                    <IconButton icon={Trash2} title="Delete" danger onClick={() => setDeleting(item)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {kind === "image" ? (
        <ImageEditorModal item={editing} onClose={() => setEditing(null)} />
      ) : (
        <VideoEditorModal item={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${kind}?`}
        message={`"${deleting?.name}" will be permanently removed. This can't be undone.`}
        onConfirm={() => {
          if (deleting) {
            void removeMedia(deleting.id);
            pushToast(`Deleted "${deleting.name}".`);
          }
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export const ImagesPage = () => <MediaLibraryPage kind="image" />;
export const VideosPage = () => <MediaLibraryPage kind="video" />;
