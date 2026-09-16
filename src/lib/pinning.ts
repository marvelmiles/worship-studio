export const MAX_PINNED_ITEMS = 5;

export type PinnableKind = "manuscript" | "scripture" | "image" | "video";

export interface Pinnable {
  pinned?: boolean;
  deleted?: boolean;
}

export const isPinned = (item: Pinnable): boolean =>
  Boolean(item.pinned) && !item.deleted;

export const pinnedCount = (items: Pinnable[]): number =>
  items.filter(isPinned).length;

export const sortPinnedFirst = <T extends Pinnable>(items: T[]): T[] => [
  ...items.filter(isPinned),
  ...items.filter((item) => !isPinned(item)),
];
