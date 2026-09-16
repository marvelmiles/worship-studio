import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Align } from "../../types";
import { useStore } from "../../store/useStore";
import { ANIMATION_VARIANTS, buildTransition } from "../../lib/animation";
import { FormattedText } from "../../components/FormattedText";
import { OverlayPicture } from "./OverlayPicture";
import {
  BADGE_GAP_RATIO,
  BADGE_PADDING_RATIO,
  type OverlayBadgeStyle,
  type OverlayBlockStyle,
} from "./lib/overlayAppearance";
import type { ContentOverlay } from "./lib/streamOverlay";
import { useOverlayBlocks } from "./lib/useOverlayBlocks";

const FLEX_ALIGN: Record<Align, CSSProperties["alignItems"]> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export const OverlayTextBlock = ({ overlay }: { overlay: ContentOverlay }) => {
  const prefs = useStore((s) => s.prefs);
  const blocks = useOverlayBlocks(overlay);
  const { block, badge } = overlay;

  if (blocks.length === 0) return null;
  const index = Math.min(Math.max(overlay.slideIndex, 0), blocks.length - 1);
  const current = blocks[index];
  const variant =
    ANIMATION_VARIANTS[overlay.animation] ?? ANIMATION_VARIANTS.fade;
  const transition = buildTransition(prefs.transitionDuration, prefs.easing);
  const showBadge = badge.show && current.badge.trim() !== "";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Backdrop style={block} />
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={variant.initial}
          animate={variant.animate}
          exit={{ opacity: 0 }}
          transition={transition}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: FLEX_ALIGN[block.align],
            gap: `${badge.fontSize * BADGE_GAP_RATIO}cqw`,
            padding: `${block.padding}cqw`,
          }}
        >
          {showBadge && <Badge text={current.badge} style={badge} />}
          <div
            style={{
              width: "100%",
              fontFamily: `'${block.fontFamily}', serif`,
              fontSize: `${block.fontSize}cqw`,
              fontWeight: block.fontWeight,
              lineHeight: block.lineHeight,
              color: block.textColor,
              textAlign: block.align,
            }}
          >
            {current.lines.map((line, lineIndex) => (
              <div key={lineIndex}>
                <FormattedText text={line} baseWeight={block.fontWeight} />
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const Backdrop = ({ style }: { style: OverlayBlockStyle }) => {
  if (!style.background && !style.backgroundImage) return null;
  return (
    <div
      style={{ position: "absolute", inset: 0, background: style.background }}
    >
      {style.backgroundImage && (
        <OverlayPicture image={style.backgroundImage} fit="cover" />
      )}
    </div>
  );
};

const Badge = ({ text, style }: { text: string; style: OverlayBadgeStyle }) => {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        overflow: "hidden",
        padding: `${style.fontSize * BADGE_PADDING_RATIO}cqw ${style.fontSize * 0.95}cqw`,
        borderRadius: 999,
        background: style.background,
        fontFamily: `'${style.fontFamily}', sans-serif`,
        fontSize: `${style.fontSize}cqw`,
        fontWeight: style.fontWeight,
        letterSpacing: "0.04em",
        lineHeight: 1.15,
        color: style.textColor,
        whiteSpace: "nowrap",
      }}
    >
      {style.backgroundImage && (
        <OverlayPicture image={style.backgroundImage} fit="cover" />
      )}
      <span style={{ position: "relative" }}>{text}</span>
    </span>
  );
};
