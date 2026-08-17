import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Undo2 } from "lucide-react";
import type { MediaItem, MediaKind } from "../../types";
import { colors, DISPLAY, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useViewport } from "../../hooks/useViewport";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  useUnsavedChanges,
  UNSAVED_CHANGES_MESSAGE,
} from "../../hooks/useUnsavedChanges";
import { useBlobUrl } from "../../lib/blobUrls";
import { buildFilter, formatDuration } from "../../lib/media";
import { formatBytes } from "../../lib/storageStats";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EditorTopBar } from "../../components/layout/EditorTopBar";
import { ImageLayer } from "../../components/media/ImageLayer";
import { ImageSettingsControls } from "../../components/media/ImageSettingsControls";
import { VideoSettingsControls } from "../../components/media/VideoSettingsControls";
import { useMediaEditor } from "./useMediaEditor";

const LIBRARY_PATH: Record<MediaKind, string> = {
  image: "/images",
  video: "/videos",
};

const BACK_TITLE: Record<MediaKind, string> = {
  image: "Back to images",
  video: "Back to videos",
};

/**
 * The editor a picture or a clip opens into: the media itself on the left at
 * the size it will be looked at, every setting in the sidebar beside it, and
 * the studio's own editor header over both, so tuning a clip works the way
 * writing a manuscript does.
 */
export function MediaEditorPage({ kind }: { kind: MediaKind }) {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const item = useStore((s) =>
    s.media.find((entry) => entry.id === mediaId && entry.kind === kind),
  );
  // Keeps the last known copy so a deletion from elsewhere unmounts cleanly
  // instead of crashing mid-edit.
  const lastRef = useRef(item);
  if (item) lastRef.current = item;

  if (!lastRef.current) {
    const label = kind === "image" ? "Image" : "Video";
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: DISPLAY, color: colors.text }}>
            {label} not found
          </h2>
          <p style={{ fontFamily: UI, color: colors.sub }}>
            It may have been deleted.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(LIBRARY_PATH[kind])}
          >
            <ArrowLeft size={15} />
            {BACK_TITLE[kind]}
          </Button>
        </div>
      </div>
    );
  }

  return <MediaWorkspace key={lastRef.current.id} item={lastRef.current} />;
}

function MediaWorkspace({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const { width } = useViewport();
  const stacked = width < 1080;
  const compact = width < 560;
  const pushToast = useStore((s) => s.pushToast);
  const editor = useMediaEditor(item);
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = useBlobUrl(item.id);
  const leaveGuard = useUnsavedChanges(editor.dirty);

  useDocumentTitle(`${editor.draft.name} · WorshipStudio`);

  const isImage = item.kind === "image";
  const duration = item.duration || videoRef.current?.duration || 0;

  // A refused save (storage full) raises its own alert from the store, so the
  // editor stays dirty and says nothing rather than claiming it wrote.
  const handleSave = () => {
    if (editor.save()) pushToast(isImage ? "Image saved." : "Video saved.");
  };

  const handleUpdatePresentation = () => {
    if (editor.updatePresentation()) pushToast("Presentation updated.");
  };

  const preview = (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: stacked ? 16 : 24,
        minHeight: 0,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "100%",
          aspectRatio: "16/9",
          borderRadius: 14,
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          background: "#000",
        }}
      >
        {isImage ? (
          <ImageLayer src={src} alt={item.name} settings={editor.draft.image} />
        ) : (
          <video
            ref={videoRef}
            src={src || undefined}
            controls
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: editor.draft.video.fit,
              filter: buildFilter(editor.draft.video),
            }}
          />
        )}
      </div>
    </div>
  );

  const sidebar = (
    <div style={{ padding: 18 }}>
      <p
        style={{
          fontFamily: UI,
          fontSize: 12,
          color: colors.dim,
          margin: "0 0 4px",
          lineHeight: 1.6,
        }}
      >
        {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
        {formatBytes(item.size || 0)}
        {duration ? ` · ${formatDuration(duration)}` : ""}
      </p>
      {isImage ? (
        <ImageSettingsControls
          settings={editor.draft.image}
          onChange={editor.patchImage}
          narrow
        />
      ) : (
        <VideoSettingsControls
          settings={editor.draft.video}
          onChange={editor.patchVideo}
          duration={duration}
          playheadTime={() => videoRef.current?.currentTime ?? 0}
          narrow
        />
      )}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <EditorTopBar
        title={editor.draft.name}
        onTitle={editor.setName}
        compact={compact}
        backTitle={BACK_TITLE[item.kind]}
        onBack={() => navigate(LIBRARY_PATH[item.kind])}
        onPresent={editor.present}
        actions={
          compact ? (
            <IconButton
              icon={Undo2}
              title="Reset all settings"
              onClick={editor.resetSettings}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={editor.resetSettings}>
              <Undo2 size={14} />
              Reset all
            </Button>
          )
        }
        dirty={editor.dirty}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onSave={handleSave}
        onUpdatePresentation={
          editor.isPresenting ? handleUpdatePresentation : undefined
        }
      />

      {stacked ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {preview}
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            {sidebar}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 340px",
          }}
        >
          <div style={{ overflow: "hidden" }}>{preview}</div>
          <div
            style={{
              overflow: "auto",
              borderLeft: `1px solid ${colors.border}`,
            }}
          >
            {sidebar}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={leaveGuard.prompting}
        title="Unsaved changes"
        message={UNSAVED_CHANGES_MESSAGE}
        confirmLabel="Leave without saving"
        onConfirm={leaveGuard.discard}
        onCancel={leaveGuard.cancel}
      />
    </div>
  );
}

export const ImageEditorPage = () => <MediaEditorPage kind="image" />;
export const VideoEditorPage = () => <MediaEditorPage kind="video" />;
