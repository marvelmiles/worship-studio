import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MonitorPlay,
  MonitorX,
  Trash2,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { keepsSelectionProps } from "../../lib/selectionScope";
import {
  OverlayContentPicker,
  type PickableKind,
} from "./OverlayContentPicker";
import { OverlayImagePicker } from "./OverlayImagePicker";
import { OverlayPassagePicker } from "./OverlayPassagePicker";
import { OverlaySectionLabel } from "./OverlayControls";
import { OverlaySettingsPanel } from "./OverlaySettingsPanel";
import {
  createContentOverlay,
  createMarqueeOverlay,
  hasStagedEdits,
  isMarquee,
  overlayVisibility,
  type OverlayVisibility,
  type StreamOverlay,
  type StreamOverlayKind,
} from "./lib/streamOverlay";
import {
  addStreamOverlay,
  clearStreamOverlays,
  moveStreamOverlay,
  removeStreamOverlay,
  takeAllStreamOverlaysOffAir,
  toggleStreamOverlayHidden,
  toggleStreamOverlayLive,
} from "./lib/streamOverlayStore";

const KIND_ICON: Record<StreamOverlayKind, LucideIcon> = {
  scripture: BookOpen,
  manuscript: FileText,
  image: ImageIcon,
  video: Video,
  marquee: Megaphone,
};

const ADD_BUTTONS: { kind: PickableKind; label: string }[] = [
  { kind: "manuscript", label: "Manuscript" },
  { kind: "video", label: "Clip" },
];

const DEFAULT_MARQUEE_TEXT =
  "Welcome. Please silence your phones during the service.";

/**
 * The operator's controls for what sits over the live camera.
 *
 * Rendered in two places from one implementation: as a drawer on the projection
 * stage, and as a section on the Stream page so it is still reachable once the
 * camera has been popped out to the floating PiP and the operator is using the
 * rest of the app. Everything it does goes through the app-wide overlay store,
 * so both copies and all four broadcast surfaces stay in step.
 *
 * Nothing added here goes out on its own. An element is staged, arranged, and
 * only then put on air by hand, so the room never watches a passage being
 * dragged into place or a verse being paged to. Once something *is* on air,
 * further changes to it are held back too and go out together on Apply now
 * (see OverlaySettingsPanel) — unless the operator has asked that element to
 * sync as they work.
 */
export function StreamOverlayPanel({
  overlays,
  selectedId,
  onSelect,
}: {
  overlays: StreamOverlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [picking, setPicking] = useState<PickableKind | null>(null);
  const [pickingPicture, setPickingPicture] = useState(false);
  const [pickingPassage, setPickingPassage] = useState(false);
  const selected =
    overlays.find((overlay) => overlay.id === selectedId) ?? null;
  // Status, not the eye: a hidden element that was put on air still has an
  // on-air status for "take all off air" to clear.
  const anyOnAir = overlays.some((overlay) => overlay.status === "live");

  // The list reads front-to-back: the last overlay painted is the one on top,
  // so it belongs at the head of a layers list.
  const stacked = [...overlays].reverse();

  return (
    // Reaching for these controls is not letting go of the element they belong
    // to, so the frame on the broadcast surface stays up while they are used.
    <div
      {...keepsSelectionProps}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div>
        <OverlaySectionLabel>Add to the broadcast</OverlaySectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setPickingPassage(true)}
          >
            <BookOpen size={14} />
            Passage
          </Button>
          {ADD_BUTTONS.map(({ kind, label }) => {
            const Icon = KIND_ICON[kind];
            return (
              <Button
                key={kind}
                variant="subtle"
                size="sm"
                onClick={() => setPicking(kind)}
              >
                <Icon size={14} />
                {label}
              </Button>
            );
          })}
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setPickingPicture(true)}
          >
            <ImageIcon size={14} />
            Picture
          </Button>
          <Button
            variant="subtle"
            size="sm"
            onClick={() =>
              addStreamOverlay(createMarqueeOverlay(DEFAULT_MARQUEE_TEXT))
            }
          >
            <Megaphone size={14} />
            Announcement
          </Button>
        </div>
      </div>

      {overlays.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nothing staged yet"
          message="Add a passage, a manuscript, a picture, a clip or a scrolling announcement. It stays off air while you place it, until you show it on the broadcast."
          compact
          bare
        />
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <OverlaySectionLabel>Elements</OverlaySectionLabel>
            <span style={{ display: "flex", gap: 12, marginBottom: 7 }}>
              {anyOnAir && (
                <TextAction
                  label="Clear the broadcast, keeping every element staged"
                  onClick={takeAllStreamOverlaysOffAir}
                >
                  Take all off air
                </TextAction>
              )}
              <TextAction
                label="Remove every element"
                onClick={() => {
                  clearStreamOverlays();
                  onSelect(null);
                }}
              >
                Remove all
              </TextAction>
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stacked.map((overlay) => (
              <OverlayRow
                key={overlay.id}
                overlay={overlay}
                selected={overlay.id === selectedId}
                onSelect={() =>
                  onSelect(overlay.id === selectedId ? null : overlay.id)
                }
              />
            ))}
          </div>
        </div>
      )}

      {selected && <OverlaySettingsPanel overlay={selected} />}

      <OverlayContentPicker
        kind={picking}
        onClose={() => setPicking(null)}
        onPick={(kind, item) => {
          const overlay = createContentOverlay(kind, item.id, item.name);
          addStreamOverlay(overlay);
          onSelect(overlay.id);
          setPicking(null);
        }}
      />

      <OverlayPassagePicker
        open={pickingPassage}
        onClose={() => setPickingPassage(false)}
        onPick={(choice) => {
          const overlay = createContentOverlay(
            "scripture",
            choice.contentId,
            choice.label,
          );
          addStreamOverlay(overlay);
          onSelect(overlay.id);
          setPickingPassage(false);
        }}
      />

      <OverlayImagePicker
        open={pickingPicture}
        onClose={() => setPickingPicture(false)}
        onPick={(choice) => {
          const overlay = createContentOverlay(
            "image",
            choice.id,
            choice.name,
            choice.source,
          );
          addStreamOverlay(overlay);
          onSelect(overlay.id);
          setPickingPicture(false);
        }}
      />
    </div>
  );
}

function TextAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 600,
        color: colors.dim,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function OverlayRow({
  overlay,
  selected,
  onSelect,
}: {
  overlay: StreamOverlay;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const Icon = KIND_ICON[overlay.kind];
  const visibility = overlayVisibility(overlay);
  // The on-air control reflects the status switch itself, so hiding something
  // never silently rewrites what taking it off air would do.
  const live = overlay.status === "live";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 7px 6px 10px",
        borderRadius: 10,
        background: colors.bg,
        border: `1px solid ${selected ? colors.accent : colors.border}`,
        opacity: overlay.hidden ? 0.55 : 1,
      }}
    >
      <button
        onClick={onSelect}
        aria-pressed={selected}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flex: 1,
          minWidth: 0,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: colors.text,
          fontFamily: fonts.ui,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Icon size={14} color={colors.accentSoft} style={{ flexShrink: 0 }} />
        <span className="ws-ellipsis" style={{ minWidth: 0, flex: 1 }}>
          {isMarquee(overlay) ? overlay.text : overlay.label}
        </span>
        <StatusChip visibility={visibility} staged={hasStagedEdits(overlay)} />
      </button>
      <RowButton
        icon={overlay.hidden ? EyeOff : Eye}
        label={
          overlay.hidden
            ? "Show this element again"
            : "Hide this element without changing whether it is on air"
        }
        onClick={() => toggleStreamOverlayHidden(overlay.id)}
      />
      <RowButton
        icon={live ? MonitorX : MonitorPlay}
        label={live ? "Take off the broadcast" : "Show on the broadcast now"}
        accent={!live}
        onClick={() => toggleStreamOverlayLive(overlay.id)}
      />
      <RowButton
        icon={ChevronUp}
        label="Bring forward"
        onClick={() => moveStreamOverlay(overlay.id, 1)}
      />
      <RowButton
        icon={ChevronDown}
        label="Send backward"
        onClick={() => moveStreamOverlay(overlay.id, -1)}
      />
      <RowButton
        icon={Trash2}
        label="Remove from the broadcast"
        danger
        onClick={() => removeStreamOverlay(overlay.id)}
      />
    </div>
  );
}

const VISIBILITY_LABEL: Record<OverlayVisibility, string> = {
  live: "On air",
  draft: "Draft",
  hidden: "Hidden",
};

/**
 * Says what the element is doing right now, across both switches. "Hidden"
 * takes precedence over the other two: an element switched off is not on air
 * whatever its status says, and reading "On air" next to something the room
 * cannot see would be the one genuinely dangerous thing this panel could claim.
 *
 * An element with work waiting on it says so here rather than only in its own
 * settings, so an operator scanning the list can see that what they arranged
 * has not gone out yet.
 */
function StatusChip({
  visibility,
  staged,
}: {
  visibility: OverlayVisibility;
  staged: boolean;
}) {
  const { colors, fonts } = useUITheme();
  const onAir = visibility === "live";
  const waiting = onAir && staged;
  const tone = waiting ? colors.warning : colors.accent;
  return (
    <span
      title={
        waiting
          ? "Changes are waiting to be applied to the broadcast"
          : undefined
      }
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        borderRadius: 999,
        background: onAir ? fade(tone, 0.18) : "transparent",
        border: `1px solid ${onAir ? tone : colors.border}`,
        color: onAir ? tone : colors.dim,
        fontFamily: fonts.ui,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {waiting ? "Not applied" : VISIBILITY_LABEL[visibility]}
    </span>
  );
}

function RowButton({
  icon: Icon,
  label,
  onClick,
  danger,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  const { colors } = useUITheme();
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 25,
        height: 25,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 7,
        border: "none",
        cursor: "pointer",
        background: "transparent",
        color: danger ? colors.danger : accent ? colors.accentSoft : colors.sub,
      }}
    >
      <Icon size={13} />
    </button>
  );
}
