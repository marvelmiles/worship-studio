import { Image as ImageIcon, Tag, Type } from "lucide-react";
import type { Align } from "../../../types";
import { useUITheme } from "../../../theme/ThemeProvider";
import { FONT_WEIGHT_OPTIONS } from "../../../data/slideFonts";
import { ANIMATION_OPTIONS } from "../../../lib/animation";
import { Button } from "../../../components/ui/Button";
import { useDeck } from "../../presentation/useDeck";
import {
  OverlayCheckbox,
  OverlayColorField,
  OverlaySelect,
  OverlaySettingsGroup,
  OverlaySlider,
} from "../OverlayControls";
import type {
  OverlayBadgeStyle,
  OverlayBlockStyle,
} from "../lib/overlayAppearance";
import type { ContentOverlay } from "../lib/streamOverlay";
import {
  editStreamOverlay,
  pageStreamOverlay,
} from "../lib/streamOverlayStore";
import { useOverlayBlocks } from "../lib/useOverlayBlocks";
import { MissingContentNotice } from "./MissingContentNotice";
import { ALIGN_OPTIONS, FONT_OPTIONS, LAYOUT_OPTIONS } from "./overlayOptions";
import { SurfacePictureField } from "./SurfacePictureField";

export const TextOverlaySettings = ({
  overlay,
}: {
  overlay: ContentOverlay;
}) => {
  const deck = useDeck(overlay.kind, overlay.contentId);
  const blocks = useOverlayBlocks(overlay);
  const isBlockLayout = overlay.layout === "block";
  const pageCount = isBlockLayout ? blocks.length : (deck?.slides.length ?? 0);

  return (
    <>
      {!deck && <MissingContentNotice />}

      <BlockStepper
        overlay={overlay}
        count={pageCount}
        noun={isBlockLayout ? "Block" : "Slide"}
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

      {pageCount > 1 && (
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

      {isBlockLayout ? (
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
};

const BlockStepper = ({
  overlay,
  count,
  noun,
}: {
  overlay: ContentOverlay;
  count: number;
  noun: string;
}) => {
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
};

const BlockStyleGroup = ({ overlay }: { overlay: ContentOverlay }) => {
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
};

const BadgeStyleGroup = ({ overlay }: { overlay: ContentOverlay }) => {
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
};
