/**
 * Pinned library items.
 *
 * A pin is the operator saying "this is what I am reaching for on Sunday": the
 * item is held at the top of its library listing, above the usual newest-first
 * order. Every library keeps its own five slots, so pinning a manuscript never
 * costs an image its place, and a search is answered by relevance alone — a pin
 * orders a listing, it does not outrank what was asked for.
 */

export const MAX_PINNED_ITEMS = 5;

/** One per library that lists items. Images and videos are separate libraries. */
export type PinnableKind = "manuscript" | "scripture" | "image" | "video";

export interface Pinnable {
  pinned?: boolean;
  deleted?: boolean;
}

/** A trashed item holds no slot: it is not in the listing a pin orders. */
export const isPinned = (item: Pinnable): boolean =>
  Boolean(item.pinned) && !item.deleted;

export const pinnedCount = (items: Pinnable[]): number =>
  items.filter(isPinned).length;

export const pinSlotsLeft = (items: Pinnable[]): number =>
  Math.max(0, MAX_PINNED_ITEMS - pinnedCount(items));

/**
 * Pinned items first, each group otherwise in the order it arrived in, so the
 * listing's own sort still decides everything a pin does not.
 */
export const sortPinnedFirst = <T extends Pinnable>(items: T[]): T[] => [
  ...items.filter(isPinned),
  ...items.filter((item) => !isPinned(item)),
];
