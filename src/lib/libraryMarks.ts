import type { LibraryMark, LibraryMarkAction } from "../types";
import { now } from "./id";

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

export const latestMark = (
  editedAt: string | undefined,
  mark: LibraryMark | undefined,
): LibraryMark | null => {
  if (!mark) return null;
  if (editedAt && editedAt > mark.at) return null;
  return mark;
};
