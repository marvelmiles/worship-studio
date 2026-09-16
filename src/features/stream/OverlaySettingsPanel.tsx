import { Eye, MonitorPlay, MonitorX, RotateCcw, Square } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Button } from "../../components/ui/Button";
import {
  OverlayCheckbox,
  OverlaySectionLabel,
  OverlaySettingsGroup,
  OverlaySlider,
} from "./OverlayControls";
import { MarqueeOverlaySettings } from "./overlaySettings/MarqueeOverlaySettings";
import { PictureOverlaySettings } from "./overlaySettings/PictureOverlaySettings";
import { TextOverlaySettings } from "./overlaySettings/TextOverlaySettings";
import { VideoOverlaySettings } from "./overlaySettings/VideoOverlaySettings";
import {
  editedOverlay,
  hasStagedEdits,
  isMarquee,
  type ContentOverlay,
  type StreamOverlay,
} from "./lib/streamOverlay";
import {
  applyStreamOverlayEdits,
  discardStreamOverlayEdits,
  editStreamOverlay,
  setStreamOverlayAutoSync,
  toggleStreamOverlayHidden,
  toggleStreamOverlayLive,
} from "./lib/streamOverlayStore";

export const OverlaySettingsPanel = ({
  overlay,
}: {
  overlay: StreamOverlay;
}) => {
  const { colors, fonts } = useUITheme();
  const edited = editedOverlay(overlay);
  const isLive = overlay.status === "live";
  const hasStaged = hasStagedEdits(overlay);

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

      <Button
        variant={isLive ? "danger" : "primary"}
        size="sm"
        onClick={() => toggleStreamOverlayLive(overlay.id)}
        style={{ width: "100%" }}
        title={
          isLive
            ? "Remove this from the broadcast. It keeps its placement."
            : "Put this on the broadcast now, everywhere it is shown."
        }
      >
        {isLive ? <MonitorX size={14} /> : <MonitorPlay size={14} />}
        {isLive ? "Take off the broadcast" : "Show on the broadcast"}
      </Button>

      {isLive && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 7 }}>
            <Button
              variant="primary"
              size="sm"
              disabled={!hasStaged}
              onClick={() => applyStreamOverlayEdits(overlay.id)}
              style={{ flex: 1 }}
              title={
                hasStaged
                  ? "Put every change you have made on the broadcast now"
                  : "Nothing has changed since this went on air"
              }
            >
              <MonitorPlay size={14} />
              Apply now
            </Button>
            {hasStaged && (
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
              color: hasStaged ? colors.warning : colors.dim,
            }}
          >
            {hasStaged
              ? "Changes waiting to be applied"
              : "Broadcast is up to date"}
          </span>
        </div>
      )}

      <OverlayCheckbox
        label="Auto sync"
        hint="While this is on air, send every change straight to the broadcast instead of waiting for Apply now."
        checked={overlay.autoSync}
        onChange={(autoSync) => setStreamOverlayAutoSync(overlay.id, autoSync)}
      />

      {isLive && overlay.hidden && (
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
        <MarqueeOverlaySettings overlay={edited} />
      ) : (
        <ContentOverlaySettings overlay={edited} />
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
};

const ContentOverlaySettings = ({ overlay }: { overlay: ContentOverlay }) => {
  if (overlay.kind === "video")
    return <VideoOverlaySettings overlay={overlay} />;
  if (overlay.kind === "image")
    return <PictureOverlaySettings overlay={overlay} />;
  return <TextOverlaySettings overlay={overlay} />;
};
