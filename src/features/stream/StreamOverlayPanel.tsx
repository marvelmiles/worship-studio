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
import type { ContentKind } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { inputStyle } from "../../components/ui/Field";
import { useDeck } from "../presentation/useDeck";
import { OverlayContentPicker } from "./OverlayContentPicker";
import {
  createContentOverlay,
  createMarqueeOverlay,
  isMarquee,
  isMediaKind,
  overlayVisibility,
  MAX_MARQUEE_SECONDS,
  MIN_MARQUEE_SECONDS,
  type ContentOverlay,
  type MarqueeOverlay,
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
  updateStreamOverlay,
} from "./lib/streamOverlayStore";

const KIND_ICON: Record<StreamOverlayKind, LucideIcon> = {
  scripture: BookOpen,
  manuscript: FileText,
  image: ImageIcon,
  video: Video,
  marquee: Megaphone,
};

const ADD_BUTTONS: { kind: ContentKind; label: string }[] = [
  { kind: "scripture", label: "Passage" },
  { kind: "manuscript", label: "Manuscript" },
  { kind: "image", label: "Picture" },
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
 * every further change to it lands immediately — at that point the operator is
 * adjusting what the room is already looking at, and waiting for a second
 * confirmation would only be in the way.
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
  const [picking, setPicking] = useState<ContentKind | null>(null);
  const selected =
    overlays.find((overlay) => overlay.id === selectedId) ?? null;
  // Status, not the eye: a hidden element that was put on air still has an
  // on-air status for "take all off air" to clear.
  const anyOnAir = overlays.some((overlay) => overlay.status === "live");

  // The list reads front-to-back: the last overlay painted is the one on top,
  // so it belongs at the head of a layers list.
  const stacked = [...overlays].reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <SectionLabel>Add to the broadcast</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
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
            <SectionLabel>Elements</SectionLabel>
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

      {selected && <OverlaySettings overlay={selected} />}

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

function SectionLabel({ children }: { children: string }) {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        fontFamily: fonts.ui,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: colors.dim,
        marginBottom: 7,
      }}
    >
      {children}
    </div>
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
        <StatusChip visibility={visibility} />
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
 */
function StatusChip({ visibility }: { visibility: OverlayVisibility }) {
  const { colors, fonts } = useUITheme();
  const onAir = visibility === "live";
  return (
    <span
      style={{
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "1px 7px",
        borderRadius: 999,
        background: onAir ? fade(colors.accent, 0.18) : "transparent",
        border: `1px solid ${onAir ? colors.accent : colors.border}`,
        color: onAir ? colors.accentSoft : colors.dim,
        fontFamily: fonts.ui,
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {VISIBILITY_LABEL[visibility]}
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

/** The selected overlay's own settings, which differ by what it is showing. */
function OverlaySettings({ overlay }: { overlay: StreamOverlay }) {
  const { colors } = useUITheme();
  const live = overlay.status === "live";
  return (
    <div
      style={{
        padding: 13,
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <SectionLabel>Selected element</SectionLabel>

      {/* The apply control leads, because this block is where an operator lands
          the moment they insert something: arrange it here, then put it up. */}
      <Button
        variant={live ? "danger" : "primary"}
        size="sm"
        onClick={() => toggleStreamOverlayLive(overlay.id)}
        style={{ width: "100%" }}
        title={
          live
            ? "Remove this from the broadcast. It keeps its placement."
            : "Put this on the broadcast now, everywhere it is shown."
        }
      >
        {live ? <MonitorX size={14} /> : <MonitorPlay size={14} />}
        {live ? "Take off the broadcast" : "Show on the broadcast"}
      </Button>

      {/* A live element that is switched off looks identical to one that was
          never put up, so the discrepancy is named rather than left to be
          worked out from two controls disagreeing. */}
      {live && overlay.hidden && (
        <Button
          variant="subtle"
          size="sm"
          onClick={() => toggleStreamOverlayHidden(overlay.id)}
          style={{ width: "100%" }}
        >
          <Eye size={14} />
          Hidden. Show it again
        </Button>
      )}

      <Slider
        label="Opacity"
        value={overlay.opacity}
        min={10}
        max={100}
        suffix="%"
        onChange={(opacity) => updateStreamOverlay(overlay.id, { opacity })}
      />

      {isMarquee(overlay) ? (
        <MarqueeSettings overlay={overlay} />
      ) : (
        <ContentSettings overlay={overlay} />
      )}
    </div>
  );
}

function MarqueeSettings({ overlay }: { overlay: MarqueeOverlay }) {
  const { colors, fonts } = useUITheme();
  return (
    <>
      <label style={{ display: "block" }}>
        <span
          style={{
            display: "block",
            fontFamily: fonts.ui,
            fontSize: 12,
            fontWeight: 600,
            color: colors.sub,
            marginBottom: 6,
          }}
        >
          Announcement
        </span>
        <textarea
          value={overlay.text}
          onChange={(event) =>
            updateStreamOverlay(overlay.id, { text: event.target.value })
          }
          rows={2}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      </label>
      {/* Seconds per pass runs backwards from "speed", so the slider is
          inverted: dragging right reads as faster, which is what an operator
          means when they reach for it. */}
      <Slider
        label="Speed"
        value={
          MIN_MARQUEE_SECONDS + MAX_MARQUEE_SECONDS - overlay.durationSeconds
        }
        min={MIN_MARQUEE_SECONDS}
        max={MAX_MARQUEE_SECONDS}
        onChange={(value) =>
          updateStreamOverlay(overlay.id, {
            durationSeconds: MIN_MARQUEE_SECONDS + MAX_MARQUEE_SECONDS - value,
          })
        }
      />
    </>
  );
}

function ContentSettings({ overlay }: { overlay: ContentOverlay }) {
  const { colors, fonts } = useUITheme();
  const showsText = !isMediaKind(overlay.kind);
  const deck = useDeck(overlay.kind, overlay.contentId);
  // A media overlay shows one file, so useDeck's whole-library slideshow count
  // says nothing about it. Only a document has slides worth paging through.
  const slideCount = showsText ? (deck?.slides.length ?? 0) : 1;

  const step = (direction: number) => {
    if (slideCount === 0) return;
    const next = (overlay.slideIndex + direction + slideCount) % slideCount;
    updateStreamOverlay(overlay.id, { slideIndex: next });
  };

  return (
    <>
      {slideCount > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.sub,
            }}
          >
            Slide {overlay.slideIndex + 1} of {slideCount}
          </span>
          <span style={{ display: "flex", gap: 6 }}>
            <Button variant="subtle" size="sm" onClick={() => step(-1)}>
              Previous
            </Button>
            <Button variant="subtle" size="sm" onClick={() => step(1)}>
              Next
            </Button>
          </span>
        </div>
      )}

      {showsText && (
        <Button
          variant={overlay.opaque ? "primary" : "subtle"}
          size="sm"
          onClick={() =>
            updateStreamOverlay(overlay.id, { opaque: !overlay.opaque })
          }
          title={
            overlay.opaque
              ? "The words sit on their own panel. Click to float them straight on the camera."
              : "The words float on the camera. Click to put a readable panel behind them."
          }
        >
          {overlay.opaque ? "Panel behind text" : "Text on camera"}
        </Button>
      )}

      {!deck && (
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 12.5,
            color: colors.danger,
          }}
        >
          This item is no longer in the library.
        </span>
      )}
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: fonts.ui,
          fontSize: 12,
          fontWeight: 600,
          color: colors.sub,
          marginBottom: 5,
        }}
      >
        {label}
        {suffix && (
          <span style={{ color: colors.dim }}>{`${value}${suffix}`}</span>
        )}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", accentColor: colors.accent }}
      />
    </label>
  );
}
