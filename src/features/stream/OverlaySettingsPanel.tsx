import { useState } from "react";
import {
  Baseline,
  Eye,
  Image as ImageIcon,
  MonitorPlay,
  MonitorX,
  Pause,
  Play,
  RotateCcw,
  Repeat,
  SkipBack,
  SkipForward,
  Square,
  Tag,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Align } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { FONTS, FONT_WEIGHT_OPTIONS } from "../../theme/tokens";
import { ANIMATION_OPTIONS } from "../../lib/animation";
import { formatDuration } from "../../lib/media";
import { Button } from "../../components/ui/Button";
import { inputStyle } from "../../components/ui/Field";
import { useDeck } from "../presentation/useDeck";
import {
  OverlayCheckbox,
  OverlayColorField,
  OverlayImageField,
  OverlaySectionLabel,
  OverlaySelect,
  OverlaySettingsGroup,
  OverlaySlider,
} from "./OverlayControls";
import { OverlayImagePicker } from "./OverlayImagePicker";
import { useOverlayImageName } from "./lib/useOverlayImageName";
import type {
  OverlayBadgeStyle,
  OverlayBlockStyle,
  OverlayImageRef,
  OverlaySurfaceStyle,
} from "./lib/overlayAppearance";
import {
  editedOverlay,
  hasStagedEdits,
  isMarquee,
  MAX_MARQUEE_CROSS_SECONDS,
  MIN_MARQUEE_CROSS_SECONDS,
  type ContentOverlay,
  type MarqueeOverlay,
  type StreamOverlay,
} from "./lib/streamOverlay";
import {
  applyStreamOverlayEdits,
  discardStreamOverlayEdits,
  editStreamOverlay,
  pageStreamOverlay,
  seekStreamOverlayVideo,
  setStreamOverlayAutoSync,
  setStreamOverlayVideo,
  toggleStreamOverlayHidden,
  toggleStreamOverlayLive,
} from "./lib/streamOverlayStore";
import { useOverlayVideoProgress } from "./lib/overlayVideoProgress";
import { useOverlayBlocks } from "./lib/useOverlayBlocks";

const FONT_OPTIONS = FONTS.map((font) => ({ value: font, label: font }));

const ALIGN_OPTIONS: { value: Align; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

const LAYOUT_OPTIONS = [
  { value: "block", label: "Block over the camera" },
  { value: "slide", label: "The document's own slide" },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => ({
  value: String(rate),
  label: `${rate}x`,
}));

/** Seconds a jump button moves an overlay clip by. */
const JUMP_SECONDS = 5;

/**
 * Everything the selected element can be told to do.
 *
 * Two rules shape the layout. The controls that change the service — put it up,
 * apply what I have changed, page to the next block, pause the clip — are at the
 * top and never fold away, because they are reached for with a room waiting.
 * Everything that dresses the element is grouped and closed, because it is set
 * once before anything goes on air.
 *
 * The panel always reads the edited overlay (what the operator is arranging) and
 * always writes through editStreamOverlay (which decides whether that reaches
 * the broadcast now or waits for Apply now), so no control here has to know
 * anything about staging.
 */
export function OverlaySettingsPanel({ overlay }: { overlay: StreamOverlay }) {
  const { colors, fonts } = useUITheme();
  const edited = editedOverlay(overlay);
  const live = overlay.status === "live";
  const staged = hasStagedEdits(overlay);

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
      <OverlaySectionLabel>Selected element</OverlaySectionLabel>

      {/* The air switch leads, because this block is where an operator lands
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

      {/* Applying only means something while the room is looking: off air the
          element already is whatever the operator just made it. */}
      {live && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 7 }}>
            <Button
              variant="primary"
              size="sm"
              disabled={!staged}
              onClick={() => applyStreamOverlayEdits(overlay.id)}
              style={{ flex: 1 }}
              title={
                staged
                  ? "Put every change you have made on the broadcast now"
                  : "Nothing has changed since this went on air"
              }
            >
              <MonitorPlay size={14} />
              Apply now
            </Button>
            {staged && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => discardStreamOverlayEdits(overlay.id)}
                title="Throw the changes away and go back to what is on air"
              >
                <RotateCcw size={14} />
                Revert
              </Button>
            )}
          </div>
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 11.5,
              lineHeight: 1.45,
              color: staged ? colors.warning : colors.dim,
            }}
          >
            {staged
              ? "Changes are waiting. The broadcast still shows the last version you applied."
              : "The broadcast matches what you are looking at."}
          </span>
        </div>
      )}

      <OverlayCheckbox
        label="Auto sync"
        hint="While this is on air, send every change straight to the broadcast instead of waiting for Apply now."
        checked={overlay.autoSync}
        onChange={(autoSync) => setStreamOverlayAutoSync(overlay.id, autoSync)}
      />

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

      {isMarquee(edited) ? (
        <MarqueeSettings overlay={edited} />
      ) : (
        <ContentSettings overlay={edited} />
      )}

      <OverlaySettingsGroup title="Frame" icon={Square}>
        <OverlaySlider
          label="Opacity"
          value={edited.opacity}
          min={10}
          max={100}
          suffix="%"
          onChange={(opacity) => editStreamOverlay(overlay.id, { opacity })}
        />
        <OverlaySlider
          label="Corner rounding"
          value={edited.radius}
          min={0}
          max={8}
          step={0.2}
          onChange={(radius) => editStreamOverlay(overlay.id, { radius })}
        />
      </OverlaySettingsGroup>
    </div>
  );
}

/** Routes the selected element to the settings its kind actually has. */
function ContentSettings({ overlay }: { overlay: ContentOverlay }) {
  if (overlay.kind === "video") return <VideoSettings overlay={overlay} />;
  if (overlay.kind === "image") return <PictureSettings overlay={overlay} />;
  return <TextSettings overlay={overlay} />;
}

function MissingContent() {
  const { colors, fonts } = useUITheme();
  return (
    <span
      style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.danger }}
    >
      This item is no longer in the library.
    </span>
  );
}

/**
 * Paging through a passage or manuscript. Blocks are what the broadcast lays
 * out (see useOverlayBlocks), so a passage that needs four of them to stay
 * readable in its frame is paged four times, whatever the document's own slides
 * happen to be.
 */
function BlockStepper({
  overlay,
  count,
  noun,
}: {
  overlay: ContentOverlay;
  count: number;
  noun: string;
}) {
  const { colors, fonts } = useUITheme();
  if (count <= 1) return null;
  const index = Math.min(Math.max(overlay.slideIndex, 0), count - 1);
  const step = (direction: number) =>
    pageStreamOverlay(overlay.id, (index + direction + count) % count);

  return (
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
        {noun} {index + 1} of {count}
      </span>
      <span style={{ display: "flex", gap: 6 }}>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => step(-1)}
          title="Go back one. Paging goes out straight away."
        >
          Previous
        </Button>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => step(1)}
          title="Show the next one. Paging goes out straight away."
        >
          Next
        </Button>
      </span>
    </div>
  );
}

function TextSettings({ overlay }: { overlay: ContentOverlay }) {
  const deck = useDeck(overlay.kind, overlay.contentId);
  const blocks = useOverlayBlocks(overlay);
  const block = overlay.layout === "block";
  const count = block ? blocks.length : (deck?.slides.length ?? 0);

  return (
    <>
      {!deck && <MissingContent />}

      <BlockStepper
        overlay={overlay}
        count={count}
        noun={block ? "Block" : "Slide"}
      />

      <OverlaySelect
        label="Layout"
        value={overlay.layout}
        options={LAYOUT_OPTIONS}
        onChange={(value) =>
          editStreamOverlay(overlay.id, {
            layout: value === "slide" ? "slide" : "block",
          })
        }
      />

      {count > 1 && (
        <OverlaySelect
          label="Between blocks"
          value={overlay.animation}
          options={ANIMATION_OPTIONS}
          onChange={(value) =>
            editStreamOverlay(overlay.id, {
              animation: value as ContentOverlay["animation"],
            })
          }
        />
      )}

      {block ? (
        <>
          <BlockStyleGroup overlay={overlay} />
          <BadgeStyleGroup overlay={overlay} />
        </>
      ) : (
        <Button
          variant={overlay.opaque ? "primary" : "subtle"}
          size="sm"
          onClick={() =>
            editStreamOverlay(overlay.id, { opaque: !overlay.opaque })
          }
          title={
            overlay.opaque
              ? "The words sit on the slide's own background. Click to float them straight on the camera."
              : "The words float on the camera. Click to paint the slide's background behind them."
          }
        >
          {overlay.opaque ? "Slide background" : "Text on camera"}
        </Button>
      )}
    </>
  );
}

/**
 * The panel the words sit in. Everything here is a broadcast decision rather
 * than a library one: nothing it changes reaches the passage or the manuscript
 * it is showing.
 */
function BlockStyleGroup({ overlay }: { overlay: ContentOverlay }) {
  const patch = (style: Partial<OverlayBlockStyle>) =>
    editStreamOverlay(overlay.id, { block: { ...overlay.block, ...style } });

  return (
    <>
      <OverlaySettingsGroup title="Panel" icon={ImageIcon}>
        <OverlayColorField
          label="Background"
          value={overlay.block.background}
          onChange={(background) => patch({ background })}
        />
        <SurfacePictureField
          label="Background picture"
          image={overlay.block.backgroundImage}
          onChange={(backgroundImage) => patch({ backgroundImage })}
        />
        <OverlaySlider
          label="Space around the text"
          value={overlay.block.padding}
          min={0}
          max={6}
          step={0.1}
          onChange={(padding) => patch({ padding })}
        />
      </OverlaySettingsGroup>

      <OverlaySettingsGroup title="Text" icon={Type}>
        <OverlayColorField
          label="Text colour"
          value={overlay.block.textColor}
          onChange={(textColor) => patch({ textColor })}
          clearLabel="Inherit"
        />
        <OverlaySelect
          label="Font"
          value={overlay.block.fontFamily}
          options={FONT_OPTIONS}
          onChange={(fontFamily) => patch({ fontFamily })}
        />
        <OverlaySelect
          label="Weight"
          value={String(overlay.block.fontWeight)}
          options={FONT_WEIGHT_OPTIONS}
          onChange={(value) => patch({ fontWeight: Number(value) })}
        />
        {/* Sizing splits the passage rather than shrinking it: bigger text
            simply means more blocks to page through. */}
        <OverlaySlider
          label="Size"
          value={overlay.block.fontSize}
          min={0.8}
          max={9}
          step={0.1}
          onChange={(fontSize) => patch({ fontSize })}
        />
        <OverlaySlider
          label="Line spacing"
          value={overlay.block.lineHeight}
          min={1}
          max={2}
          step={0.02}
          onChange={(lineHeight) => patch({ lineHeight })}
        />
        <OverlaySelect
          label="Alignment"
          value={overlay.block.align}
          options={ALIGN_OPTIONS}
          onChange={(value) => patch({ align: value as Align })}
        />
      </OverlaySettingsGroup>
    </>
  );
}

function BadgeStyleGroup({ overlay }: { overlay: ContentOverlay }) {
  const patch = (style: Partial<OverlayBadgeStyle>) =>
    editStreamOverlay(overlay.id, { badge: { ...overlay.badge, ...style } });

  return (
    <OverlaySettingsGroup
      title={overlay.kind === "scripture" ? "Verse badge" : "Section badge"}
      icon={Tag}
    >
      <OverlayCheckbox
        label="Show the badge"
        checked={overlay.badge.show}
        onChange={(show) => patch({ show })}
      />
      {overlay.badge.show && (
        <>
          <OverlayColorField
            label="Badge background"
            value={overlay.badge.background}
            onChange={(background) => patch({ background })}
          />
          <SurfacePictureField
            label="Badge picture"
            image={overlay.badge.backgroundImage}
            onChange={(backgroundImage) => patch({ backgroundImage })}
          />
          <OverlayColorField
            label="Badge text"
            value={overlay.badge.textColor}
            onChange={(textColor) => patch({ textColor })}
          />
          <OverlaySelect
            label="Badge font"
            value={overlay.badge.fontFamily}
            options={FONT_OPTIONS}
            onChange={(fontFamily) => patch({ fontFamily })}
          />
          <OverlaySlider
            label="Badge size"
            value={overlay.badge.fontSize}
            min={0.6}
            max={5}
            step={0.1}
            onChange={(fontSize) => patch({ fontSize })}
          />
        </>
      )}
    </OverlaySettingsGroup>
  );
}

/** A picture field wired to the two-library picker. */
function SurfacePictureField({
  label,
  image,
  onChange,
}: {
  label: string;
  image: OverlayImageRef | null;
  onChange: (image: OverlayImageRef | null) => void;
}) {
  const [picking, setPicking] = useState(false);
  const name = useOverlayImageName(image);

  return (
    <>
      <OverlayImageField
        label={label}
        pictureName={name}
        onChoose={() => setPicking(true)}
        onClear={() => onChange(null)}
      />
      <OverlayImagePicker
        open={picking}
        title={label}
        onClose={() => setPicking(false)}
        onClear={() => onChange(null)}
        onPick={(choice) => {
          onChange({ id: choice.id, source: choice.source });
          setPicking(false);
        }}
      />
    </>
  );
}

function PictureSettings({ overlay }: { overlay: ContentOverlay }) {
  const [picking, setPicking] = useState(false);
  const name = useOverlayImageName({
    id: overlay.contentId,
    source: overlay.source,
  });

  return (
    <>
      {!name && <MissingContent />}
      <OverlayImageField
        label="Picture"
        pictureName={name}
        onChoose={() => setPicking(true)}
        onClear={() => setPicking(true)}
      />
      <OverlayImagePicker
        open={picking}
        title="Change the picture"
        onClose={() => setPicking(false)}
        onPick={(choice) => {
          editStreamOverlay(overlay.id, {
            contentId: choice.id,
            source: choice.source,
            label: choice.name,
          });
          setPicking(false);
        }}
      />
    </>
  );
}

/**
 * The clip's transport.
 *
 * Overlay clips default to auto sync (see createContentOverlay), so these move
 * the broadcast as they are pressed: pausing a clip a second after it should
 * have stopped is a mistake the room sees, and staging that press would only
 * add a second one.
 */
function VideoSettings({ overlay }: { overlay: ContentOverlay }) {
  const { colors, fonts } = useUITheme();
  const { time, duration } = useOverlayVideoProgress(overlay.id);
  const { video } = overlay;
  const end = duration > 0 ? duration : Math.max(time, 0.1);

  const jump = (seconds: number) =>
    seekStreamOverlayVideo(
      overlay.id,
      Math.min(end, Math.max(0, time + seconds)),
    );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <TransportButton
          icon={video.playing ? Pause : Play}
          label={video.playing ? "Pause the clip" : "Play the clip"}
          accent={!video.playing}
          onClick={() =>
            setStreamOverlayVideo(overlay.id, { playing: !video.playing })
          }
        />
        <TransportButton
          icon={SkipBack}
          label={`Jump back ${JUMP_SECONDS} seconds`}
          onClick={() => jump(-JUMP_SECONDS)}
        />
        <TransportButton
          icon={SkipForward}
          label={`Jump forward ${JUMP_SECONDS} seconds`}
          onClick={() => jump(JUMP_SECONDS)}
        />
        <TransportButton
          icon={RotateCcw}
          label="Start the clip again"
          onClick={() => seekStreamOverlayVideo(overlay.id, 0)}
        />
        <TransportButton
          icon={video.muted ? VolumeX : Volume2}
          label={video.muted ? "Unmute the clip" : "Mute the clip"}
          onClick={() =>
            setStreamOverlayVideo(overlay.id, { muted: !video.muted })
          }
        />
        <TransportButton
          icon={Repeat}
          label={video.loop ? "Stop looping the clip" : "Loop the clip"}
          accent={video.loop}
          onClick={() =>
            setStreamOverlayVideo(overlay.id, { loop: !video.loop })
          }
        />
      </div>

      {/* Dragging the bar scrubs the broadcast copy, which is what makes it a
          control rather than a progress read-out. */}
      <label style={{ display: "block" }}>
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 600,
            color: colors.dim,
            fontVariantNumeric: "tabular-nums",
            marginBottom: 4,
          }}
        >
          <span>{formatDuration(time)}</span>
          <span>
            {duration > 0 ? formatDuration(duration) : formatDuration(0)}
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={end}
          step={0.1}
          value={Math.min(time, end)}
          aria-label="Clip position"
          onChange={(event) =>
            seekStreamOverlayVideo(overlay.id, Number(event.target.value))
          }
          style={{ width: "100%", accentColor: colors.accent }}
        />
      </label>

      <OverlaySlider
        label="Volume"
        value={video.volume}
        min={0}
        max={100}
        suffix="%"
        onChange={(volume) => setStreamOverlayVideo(overlay.id, { volume })}
      />

      <OverlaySelect
        label="Speed"
        value={String(video.rate)}
        options={SPEED_OPTIONS}
        onChange={(value) =>
          setStreamOverlayVideo(overlay.id, { rate: Number(value) })
        }
      />
    </>
  );
}

function TransportButton({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  const { colors } = useUITheme();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 8,
        cursor: "pointer",
        background: colors.raise,
        border: `1px solid ${accent ? colors.accent : colors.border}`,
        color: accent ? colors.accentSoft : colors.sub,
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function MarqueeSettings({ overlay }: { overlay: MarqueeOverlay }) {
  const { colors, fonts } = useUITheme();
  const patch = (style: Partial<OverlaySurfaceStyle>) =>
    editStreamOverlay(overlay.id, { style: { ...overlay.style, ...style } });

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
            editStreamOverlay(overlay.id, { text: event.target.value })
          }
          rows={2}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
      </label>

      {/* Seconds per crossing runs backwards from "speed", so the slider is
          inverted: dragging right reads as faster, which is what an operator
          means when they reach for it. The band scrolls at this pace whatever
          the announcement's length. */}
      <OverlaySlider
        label="Scrolling speed"
        value={
          MIN_MARQUEE_CROSS_SECONDS +
          MAX_MARQUEE_CROSS_SECONDS -
          overlay.crossSeconds
        }
        min={MIN_MARQUEE_CROSS_SECONDS}
        max={MAX_MARQUEE_CROSS_SECONDS}
        step={0.5}
        onChange={(value) =>
          editStreamOverlay(overlay.id, {
            crossSeconds:
              MIN_MARQUEE_CROSS_SECONDS + MAX_MARQUEE_CROSS_SECONDS - value,
          })
        }
      />

      <OverlaySettingsGroup title="Band" icon={Baseline}>
        <OverlayColorField
          label="Background"
          value={overlay.style.background}
          onChange={(background) => patch({ background })}
        />
        <SurfacePictureField
          label="Background picture"
          image={overlay.style.backgroundImage}
          onChange={(backgroundImage) => patch({ backgroundImage })}
        />
        <OverlayColorField
          label="Text colour"
          value={overlay.style.textColor}
          onChange={(textColor) => patch({ textColor })}
        />
        <OverlaySelect
          label="Font"
          value={overlay.style.fontFamily}
          options={FONT_OPTIONS}
          onChange={(fontFamily) => patch({ fontFamily })}
        />
        <OverlaySelect
          label="Weight"
          value={String(overlay.style.fontWeight)}
          options={FONT_WEIGHT_OPTIONS}
          onChange={(value) => patch({ fontWeight: Number(value) })}
        />
        <OverlaySlider
          label="Text size"
          value={overlay.fontScale}
          min={20}
          max={80}
          suffix="%"
          onChange={(fontScale) => editStreamOverlay(overlay.id, { fontScale })}
        />
      </OverlaySettingsGroup>
    </>
  );
}
