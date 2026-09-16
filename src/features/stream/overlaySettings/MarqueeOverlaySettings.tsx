import { Baseline } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { FONT_WEIGHT_OPTIONS } from "../../../data/slideFonts";
import { inputStyle } from "../../../components/ui/Field";
import {
  OverlayColorField,
  OverlaySelect,
  OverlaySettingsGroup,
  OverlaySlider,
} from "../OverlayControls";
import type { OverlaySurfaceStyle } from "../lib/overlayAppearance";
import {
  MAX_MARQUEE_CROSS_SECONDS,
  MIN_MARQUEE_CROSS_SECONDS,
  type MarqueeOverlay,
} from "../lib/streamOverlay";
import { editStreamOverlay } from "../lib/streamOverlayStore";
import { FONT_OPTIONS } from "./overlayOptions";
import { SurfacePictureField } from "./SurfacePictureField";

// The slider reads as speed, which runs opposite to the stored seconds-per-crossing.
const toSpeed = (crossSeconds: number): number =>
  MIN_MARQUEE_CROSS_SECONDS + MAX_MARQUEE_CROSS_SECONDS - crossSeconds;

export const MarqueeOverlaySettings = ({
  overlay,
}: {
  overlay: MarqueeOverlay;
}) => {
  const { colors, fonts } = useUITheme();
  const patchStyle = (style: Partial<OverlaySurfaceStyle>) =>
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

      <OverlaySlider
        label="Scrolling speed"
        value={toSpeed(overlay.crossSeconds)}
        min={MIN_MARQUEE_CROSS_SECONDS}
        max={MAX_MARQUEE_CROSS_SECONDS}
        step={0.5}
        onChange={(speed) =>
          editStreamOverlay(overlay.id, { crossSeconds: toSpeed(speed) })
        }
      />

      <OverlaySettingsGroup title="Band" icon={Baseline}>
        <OverlayColorField
          label="Background"
          value={overlay.style.background}
          onChange={(background) => patchStyle({ background })}
        />
        <SurfacePictureField
          label="Background picture"
          image={overlay.style.backgroundImage}
          onChange={(backgroundImage) => patchStyle({ backgroundImage })}
        />
        <OverlayColorField
          label="Text colour"
          value={overlay.style.textColor}
          onChange={(textColor) => patchStyle({ textColor })}
        />
        <OverlaySelect
          label="Font"
          value={overlay.style.fontFamily}
          options={FONT_OPTIONS}
          onChange={(fontFamily) => patchStyle({ fontFamily })}
        />
        <OverlaySelect
          label="Weight"
          value={String(overlay.style.fontWeight)}
          options={FONT_WEIGHT_OPTIONS}
          onChange={(value) => patchStyle({ fontWeight: Number(value) })}
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
};
