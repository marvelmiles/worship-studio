import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Film,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Trash2,
  Upload,
  Wallpaper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { useStore } from "../../store/useStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatBytes } from "../../lib/storageStats";
import { formatDuration, sortMediaByRecency } from "../../lib/media";
import { sortPinnedFirst } from "../../lib/pinning";
import { imageDeckIndex } from "../presentation/useDeck";
import { PageHeader } from "../../components/ui/PageHeader";
import { SearchInput } from "../../components/ui/SearchInput";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { LazyMount } from "../../components/ui/LazyMount";
import { Button } from "../../components/ui/Button";
import { MoreMenu } from "../../components/ui/MoreMenu";
import { PinBadge, usePinAction } from "../../components/ui/PinControl";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { ImageSurface } from "../../components/media/ImageSurface";
import { VideoThumb } from "../../components/media/VideoThumb";

interface MediaPageConfig {
  kind: MediaKind;
  title: string;
  subtitle: string;
  uploadLabel: string;
  accept: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyIcon: LucideIcon;
  /** Where one of these opens for editing. */
  editPath: string;
}

const CONFIGS: Record<MediaKind, MediaPageConfig> = {
  image: {
    kind: "image",
    title: "Images",
    subtitle:
      "Upload, edit and project images. Presenting one flips through the library like a slideshow.",
    uploadLabel: "Upload Images",
    accept: "image/*",
    emptyTitle: "No images yet",
    emptyMessage:
      "Upload some to present them on screen or use them as slide backgrounds.",
    emptyIcon: ImageIcon,
    editPath: "/images",
  },
  video: {
    kind: "video",
    title: "Videos",
    subtitle:
      "Upload, trim and project videos with full playback control while live.",
    uploadLabel: "Upload Videos",
    accept: "video/*",
    emptyTitle: "No videos yet",
    emptyMessage: "Upload some to play them on the projector.",
    emptyIcon: Film,
    editPath: "/videos",
  },
};

export function MediaLibraryPage({ kind }: { kind: MediaKind }) {
  const config = CONFIGS[kind];
  useDocumentTitle(`${config.title} · WorshipStudio`);

  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const beginUpload = useStore((s) => s.beginUpload);
  const removeMedia = useStore((s) => s.removeMedia);
  const startPresent = useStore((s) => s.startPresent);
  const toggleImageBackground = useStore((s) => s.toggleImageBackground);
  const pushToast = useStore((s) => s.pushToast);

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<MediaItem | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const openEditor = (item: MediaItem) =>
    navigate(`${config.editPath}/${item.id}`);

  // Deep-links written before the editor had a page of its own still arrive
  // carrying an item id. Both hand-offs replace this entry rather than stacking
  // one, so Back returns where the link was followed from instead of bouncing
  // straight into the editor again.
  const openId = (location.state as { openId?: string } | null)?.openId;
  const handedOff = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || handedOff.current === openId) return;
    handedOff.current = openId;
    const known = media.some((m) => m.id === openId && m.kind === kind);
    navigate(known ? `${config.editPath}/${openId}` : location.pathname, {
      replace: true,
      state: null,
    });
  }, [openId, media, kind, navigate, location.pathname, config.editPath]);

  const library = useMemo(
    () => media.filter((m) => m.kind === kind),
    [media, kind],
  );

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = term
      ? library.filter((m) => m.name.toLowerCase().includes(term))
      : library;
    const ordered = [...base].sort(sortMediaByRecency);
    // A search is answered by what matches it; pins only order the library.
    return term ? ordered : sortPinnedFirst(ordered);
  }, [library, query]);

  // The image ids currently mirrored as backgrounds, so each card's toggle can
  // show whether that image is already in use.
  const backgroundImageIds = useMemo(
    () =>
      new Set(
        backgrounds
          .map((b) => b.blobId)
          .filter((id): id is string => Boolean(id)),
      ),
    [backgrounds],
  );

  const present = (item: MediaItem, pip: boolean) => {
    const mode = pip ? "pip" : "stage";
    if (kind === "image")
      startPresent("image", item.id, imageDeckIndex(media, item.id), mode);
    else startPresent("video", item.id, 0, mode);
  };

  const toggleBackground = (item: MediaItem) => {
    const nowBackground = toggleImageBackground(item.id);
    pushToast(
      nowBackground
        ? `Added "${item.name}" to your backgrounds.`
        : `Removed "${item.name}" from your backgrounds.`,
    );
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
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search ${config.title.toLowerCase()}…`}
        />
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
              <Button
                variant="primary"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus size={15} />
                {config.uploadLabel}
              </Button>
            }
          />
        )
      ) : (
        <div className="ws-card-grid">
          {list.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              library={library}
              isBackground={backgroundImageIds.has(item.id)}
              onOpen={() => openEditor(item)}
              onPresent={(pip) => present(item, pip)}
              onToggleBackground={() => toggleBackground(item)}
              onDelete={() => setDeleting(item)}
            />
          ))}
        </div>
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

interface MediaCardProps {
  item: MediaItem;
  /** Everything of this kind, so the pin budget can be read off the library. */
  library: MediaItem[];
  isBackground: boolean;
  onOpen: () => void;
  onPresent: (pip: boolean) => void;
  onToggleBackground: () => void;
  onDelete: () => void;
}

function MediaCard({
  item,
  library,
  isBackground,
  onOpen,
  onPresent,
  onToggleBackground,
  onDelete,
}: MediaCardProps) {
  const pinAction = usePinAction(item.kind, item, library);

  return (
    <div className="ws-glass ws-card">
      <div
        className="ws-thumb"
        onClick={onOpen}
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
                <div className="ws-thumb-badge">
                  {formatDuration(item.duration)}
                </div>
              )}
            </>
          )}
        </LazyMount>
      </div>
      <div className="ws-card-body">
        <div className="ws-card-title">
          <span className="ws-ellipsis">{item.name}</span>
          <PinBadge item={item} />
        </div>
        <div className="ws-card-sub">
          {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
          {formatBytes(item.size || 0)}
        </div>
        <div className="ws-card-actions">
          <PresentMenu onPresent={({ pip }) => onPresent(pip)} />
          <Button size="sm" variant="ghost" onClick={onOpen}>
            <Pencil size={13} />
            Edit
          </Button>
          <MoreMenu
            size="sm"
            items={[
              pinAction,
              ...(item.kind === "image"
                ? [
                    {
                      label: isBackground
                        ? "Remove from backgrounds"
                        : "Use as background",
                      icon: Wallpaper,
                      active: isBackground,
                      onClick: onToggleBackground,
                    },
                  ]
                : []),
              { divider: true },
              {
                label: "Delete",
                icon: Trash2,
                danger: true,
                onClick: onDelete,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export const ImagesPage = () => <MediaLibraryPage kind="image" />;
export const VideosPage = () => <MediaLibraryPage kind="video" />;
