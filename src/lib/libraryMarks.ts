import type { LibraryMark, LibraryMarkAction } from "../types";
import { now } from "./id";

/**
 * Marks on a library item: pinning it to the top of its listing, and keeping it
 * through a reset.
 *
 * Neither one changes what an item *is*, so neither is recorded as an edit: the
 * library's "recently modified" order answers to `updatedAt`, which only moves
 * when a document is written in an editor. A mark carries its own stamp so the
 * dashboard's activity feed can still report it, which is what lets "Advent
 * clip · pinned" appear in the feed without the clip jumping to the front of a
 * recently-modified listing.
 */

/** How a mark reads in the activity feed. */
const MARK_VERBS: Record<LibraryMarkAction, string> = {
  pinned: "pinned",
  unpinned: "unpinned",
  kept: "kept on reset",
  unkept: "no longer kept on reset",
};

export const describeMark = (mark: LibraryMark): string =>
  MARK_VERBS[mark.action];

export const markNow = (action: LibraryMarkAction): LibraryMark => ({
  action,
  at: now(),
});

export const pinMark = (pinning: boolean): LibraryMark =>
  markNow(pinning ? "pinned" : "unpinned");

export const keepMark = (keeping: boolean): LibraryMark =>
  markNow(keeping ? "kept" : "unkept");

/**
 * The stamp an item's activity row should carry: its own mark when that is the
 * most recent thing to have happened to it, and the edit stamp otherwise.
 */
export function latestMark(
  editedAt: string | undefined,
  mark: LibraryMark | undefined,
): LibraryMark | null {
  if (!mark) return null;
  if (editedAt && editedAt > mark.at) return null;
  return mark;
}
