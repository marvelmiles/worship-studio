import type { Align, SlideMediaSource } from "../../../types";

export interface OverlayImageRef {
  id: string;
  source: SlideMediaSource;
}

export interface OverlaySurfaceStyle {
  background: string;
  backgroundImage: OverlayImageRef | null;
  textColor: string;
  fontFamily: string;
  fontWeight: number;
}

export interface OverlayBlockStyle extends OverlaySurfaceStyle {
  fontSize: number;
  align: Align;
  lineHeight: number;
  padding: number;
}

export interface OverlayBadgeStyle extends OverlaySurfaceStyle {
  show: boolean;
  fontSize: number;
}

export const DEFAULT_OVERLAY_BLOCK_STYLE: OverlayBlockStyle = {
  background: "rgba(9,11,17,0.94)",
  backgroundImage: null,
  textColor: "#ffffff",
  fontFamily: "Outfit",
  fontWeight: 600,
  fontSize: 2.7,
  align: "left",
  lineHeight: 1.45,
  padding: 1.2,
};

export const DEFAULT_OVERLAY_BADGE_STYLE: OverlayBadgeStyle = {
  show: true,
  background: "#2563eb",
  backgroundImage: null,
  textColor: "#ffffff",
  fontFamily: "Outfit",
  fontWeight: 700,
  fontSize: 1.6,
};

export const DEFAULT_OVERLAY_MARQUEE_STYLE: OverlaySurfaceStyle = {
  background: "rgba(9,11,17,0.82)",
  backgroundImage: null,
  textColor: "#ffffff",
  fontFamily: "Outfit",
  fontWeight: 600,
};

export const BADGE_HEIGHT_RATIO = 1.9;

export const BADGE_GAP_RATIO = 0.62;

export const BADGE_PADDING_RATIO = 0.42;

export const badgeBlockHeight = (badge: OverlayBadgeStyle): number =>
  badge.show ? badge.fontSize * (BADGE_HEIGHT_RATIO + BADGE_GAP_RATIO) : 0;

const AVERAGE_GLYPH_WIDTH = 0.53;

export const charsPerBlockLine = (block: OverlayBlockStyle): number =>
  Math.max(
    8,
    Math.floor(
      (100 - block.padding * 2) / (block.fontSize * AVERAGE_GLYPH_WIDTH),
    ),
  );
