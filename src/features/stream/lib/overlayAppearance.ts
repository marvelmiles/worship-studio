import type { Align, SlideMediaSource } from "../../../types";

/**
 * How an overlay looks on the broadcast, independent of what it is showing.
 *
 * An overlay is not a slide. A slide inherits a theme, a document style and a
 * background from the library document behind it, which is right on a projector
 * where the deck owns the whole screen. Over a live camera the operator is
 * dressing one small panel to sit legibly on top of moving pictures, and the
 * document's own theme is usually the wrong answer — so an overlay carries its
 * own appearance and nothing it does here ever reaches the library.
 *
 * Sizes are in cqw: percent of the overlay box's own width. The box declares a
 * size container (see StreamOverlayLayers), so one number lands identically on a
 * 300px floating window and on a projector, and text keeps its proportions as
 * the operator resizes the frame.
 */

/** A picture chosen for an overlay, in whichever library holds it. */
export interface OverlayImageRef {
  id: string;
  source: SlideMediaSource;
}

/** Colour and type settings every dressed surface carries. */
export interface OverlaySurfaceStyle {
  /** Any CSS background value. Empty floats the content on the camera. */
  background: string;
  backgroundImage: OverlayImageRef | null;
  textColor: string;
  fontFamily: string;
  fontWeight: number;
}

/** The panel a passage or manuscript is laid out in. */
export interface OverlayBlockStyle extends OverlaySurfaceStyle {
  fontSize: number;
  align: Align;
  lineHeight: number;
  /** Clear space kept inside the panel, so the words never touch its edges. */
  padding: number;
}

/** The label riding above the block, e.g. the verse reference. */
export interface OverlayBadgeStyle extends OverlaySurfaceStyle {
  show: boolean;
  fontSize: number;
}

/**
 * Sized for the frame a passage arrives in: a band under the camera holding a
 * badge and about two lines of type, with clear space on every side. Anything
 * longer becomes further blocks rather than smaller words.
 */
export const DEFAULT_OVERLAY_BLOCK_STYLE: OverlayBlockStyle = {
  // Nearly solid. A translucent plate over a moving camera reads as a smudge
  // rather than as a panel, and the words on it lose their edge every time the
  // picture behind them brightens.
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

/**
 * The badge pill's height in font sizes: its own line box plus the padding
 * above and below it. Shared with the renderer, so the space the layout maths
 * reserves for the badge is the space the badge actually takes.
 */
export const BADGE_HEIGHT_RATIO = 1.9;

/** Space between the badge and the first line of text, in badge font sizes. */
export const BADGE_GAP_RATIO = 0.62;

/** Vertical padding inside the badge pill, in badge font sizes. */
export const BADGE_PADDING_RATIO = 0.42;

/** Room the badge takes out of the panel, gap to the text included. */
export const badgeBlockHeight = (badge: OverlayBadgeStyle): number =>
  badge.show ? badge.fontSize * (BADGE_HEIGHT_RATIO + BADGE_GAP_RATIO) : 0;

/**
 * Roughly how many characters of this style fit on one wrapped line of the
 * panel. Latin text averages a little over half the font size per glyph, which
 * is close enough to keep a block clear of its own edges without measuring text
 * the browser has not laid out yet.
 */
const AVERAGE_GLYPH_WIDTH = 0.53;

export const charsPerBlockLine = (block: OverlayBlockStyle): number =>
  Math.max(
    8,
    Math.floor(
      (100 - block.padding * 2) / (block.fontSize * AVERAGE_GLYPH_WIDTH),
    ),
  );
