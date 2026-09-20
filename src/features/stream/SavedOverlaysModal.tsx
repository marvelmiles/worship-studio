import { useMemo, useState } from "react";
import {
  BookOpen,
  Bookmark,
  Check,
  FileText,
  Image as ImageIcon,
  Megaphone,
  Pencil,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SearchInput } from "../../components/ui/SearchInput";
import { TextInput } from "../../components/ui/Field";
import {
  fromSavedOverlay,
  isSavedMarquee,
  isSavedOverlayReady,
  type SavedOverlay,
  type StreamOverlayPreset,
} from "./lib/overlayPresets";
import type { StreamOverlay, StreamOverlayKind } from "./lib/streamOverlay";

const KIND_ICON: Record<StreamOverlayKind, LucideIcon> = {
  scripture: BookOpen,
  manuscript: FileText,
  image: ImageIcon,
  video: Video,
  marquee: Megaphone,
};

const KIND_NOUN: Record<StreamOverlayKind, string> = {
  scripture: "Passage",
  manuscript: "Manuscript",
  image: "Picture",
  video: "Clip",
  marquee: "Announcement",
};

const MISSING_NOTE: Record<StreamOverlayKind, string> = {
  scripture: "The passage this was saved from is gone",
  manuscript: "The manuscript this was saved from is gone",
  image: "The picture this was saved from is gone",
  video: "The clip this was saved from is gone",
  marquee: "",
};

const describe = (saved: SavedOverlay): string =>
  isSavedMarquee(saved) ? saved.text : saved.label;

interface SavedOverlaysModalProps {
  open: boolean;
  onClose: () => void;
  onUse: (overlay: StreamOverlay) => void;
}

export const SavedOverlaysModal = ({
  open,
  onClose,
  onUse,
}: SavedOverlaysModalProps) => {
  const presets = useStore((s) => s.overlayPresets);
  const manuscripts = useStore((s) => s.manuscripts);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const removeOverlayPreset = useStore((s) => s.removeOverlayPreset);
  const pushToast = useStore((s) => s.pushToast);
  const [query, setQuery] = useState("");
  const [pendingRemoval, setPendingRemoval] =
    useState<StreamOverlayPreset | null>(null);

  const library = useMemo(
    () => ({ manuscripts, scriptures, media, backgrounds }),
    [manuscripts, scriptures, media, backgrounds],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return presets;
    return presets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(needle) ||
        describe(preset.overlay).toLowerCase().includes(needle),
    );
  }, [presets, query]);

  if (!open) return null;

  const use = (preset: StreamOverlayPreset) => {
    if (!isSavedOverlayReady(preset.overlay, library)) {
      pushToast(
        `"${preset.name}" can't be used: ${MISSING_NOTE[preset.overlay.kind].toLowerCase()}.`,
        "error",
      );
      return;
    }
    onUse(fromSavedOverlay(preset.overlay));
    onClose();
  };

  const remove = () => {
    if (!pendingRemoval) return;
    removeOverlayPreset(pendingRemoval.id);
    pushToast(`"${pendingRemoval.name}" removed.`);
    setPendingRemoval(null);
  };

  return (
    <>
      <Modal open onClose={onClose} title="Saved overlays" width={470}>
        {presets.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            message="Select an element on the broadcast and choose Save overlay to keep it for another service."
            compact
            bare
          />
        ) : (
          <>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search saved overlays…"
              style={{ minWidth: 0, marginBottom: 12 }}
            />
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No matches"
                message="Try a different search."
                compact
                bare
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 360,
                  overflowY: "auto",
                }}
              >
                {filtered.map((preset) => (
                  <PresetRow
                    key={preset.id}
                    preset={preset}
                    ready={isSavedOverlayReady(preset.overlay, library)}
                    onUse={() => use(preset)}
                    onRemove={() => setPendingRemoval(preset)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove saved overlay?"
        message={`"${pendingRemoval?.name ?? ""}" is removed from your saved overlays. Anything already on the broadcast stays where it is.`}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setPendingRemoval(null)}
      />
    </>
  );
};

interface PresetRowProps {
  preset: StreamOverlayPreset;
  ready: boolean;
  onUse: () => void;
  onRemove: () => void;
}

const PresetRow = ({ preset, ready, onUse, onRemove }: PresetRowProps) => {
  const { colors, fonts } = useUITheme();
  const renameOverlayPreset = useStore((s) => s.renameOverlayPreset);
  const [draftName, setDraftName] = useState<string | null>(null);
  const Icon = KIND_ICON[preset.overlay.kind];

  const commitRename = () => {
    if (draftName !== null) renameOverlayPreset(preset.id, draftName);
    setDraftName(null);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 9px 8px 11px",
        borderRadius: 11,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        opacity: ready ? 1 : 0.6,
      }}
    >
      {draftName === null ? (
        <button
          onClick={onUse}
          title={
            ready
              ? `Add "${preset.name}" to the broadcast`
              : MISSING_NOTE[preset.overlay.kind]
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: 1,
            minWidth: 0,
            padding: 0,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <Icon size={15} color={colors.accentSoft} style={{ flexShrink: 0 }} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span
              className="ws-ellipsis"
              style={{
                display: "block",
                fontFamily: fonts.ui,
                fontSize: 13.5,
                fontWeight: 600,
                color: colors.text,
              }}
            >
              {preset.name}
            </span>
            <span
              className="ws-ellipsis"
              style={{
                display: "block",
                fontFamily: fonts.ui,
                fontSize: 11.5,
                color: ready ? colors.dim : colors.warning,
              }}
            >
              {ready
                ? `${KIND_NOUN[preset.overlay.kind]} · ${describe(preset.overlay)}`
                : MISSING_NOTE[preset.overlay.kind]}
            </span>
          </span>
        </button>
      ) : (
        <TextInput
          value={draftName}
          autoFocus
          style={{ flex: 1, minWidth: 0, padding: "6px 9px", fontSize: 13 }}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setDraftName(null);
          }}
        />
      )}

      {draftName === null ? (
        <>
          <RowButton
            icon={Pencil}
            label={`Rename "${preset.name}"`}
            onClick={() => setDraftName(preset.name)}
          />
          <RowButton
            icon={Trash2}
            label={`Remove "${preset.name}"`}
            danger
            onClick={onRemove}
          />
        </>
      ) : (
        <>
          <RowButton
            icon={Check}
            label="Save the name"
            onClick={commitRename}
          />
          <RowButton
            icon={X}
            label="Keep the old name"
            onClick={() => setDraftName(null)}
          />
        </>
      )}
    </div>
  );
};

const RowButton = ({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) => {
  const { colors } = useUITheme();
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 27,
        height: 27,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        background: "transparent",
        color: danger ? colors.danger : colors.sub,
      }}
    >
      <Icon size={14} />
    </button>
  );
};
