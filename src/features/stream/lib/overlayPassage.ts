import type { ScripturePassage } from "../../../types";
import { uid } from "../../../lib/id";
import { useStore, type ScriptureSelection } from "../../../store/useStore";
import { isContentOverlay, type StreamOverlay } from "./streamOverlay";

/**
 * Passages an overlay made for itself.
 *
 * An operator reaching for scripture mid-broadcast usually wants a reference
 * that was never saved to the library — a verse someone just called out. The
 * Bible page answers that with the quick-present passage, but there is exactly
 * one of those and the next quick present overwrites it, which would silently
 * change what a broadcast overlay is showing.
 *
 * So an overlay built from a search result gets a passage document of its own,
 * marked quick (invisible to the library, the dashboard and backups) and named
 * with a prefix that says who owns it. It is deleted when the overlay that owns
 * it goes, so the store does not fill up with one passage per verse ever put on
 * a broadcast.
 */

const OVERLAY_PASSAGE_PREFIX = "overlay-passage-";

const isOverlayPassageId = (id: string): boolean =>
  id.startsWith(OVERLAY_PASSAGE_PREFIX);

/**
 * Writes a passage document for one overlay. Verses are left whole, one to a
 * slide: the overlay re-breaks them against its own frame (see
 * useOverlayBlocks), so splitting them here as well would only produce badges
 * reading "(1/2)".
 */
export function createOverlayPassage(
  selection: ScriptureSelection,
): ScripturePassage | null {
  return useStore.getState().stageScriptureSelection(selection, {
    id: `${OVERLAY_PASSAGE_PREFIX}${uid()}`,
    splitLongVerses: false,
  });
}

/**
 * Deletes the passages the removed overlays owned, leaving alone any still
 * pointed at by an overlay that survives — a duplicated overlay shares its
 * original's document, and removing one copy must not blank the other.
 */
export function releaseOverlayPassages(
  removed: StreamOverlay[],
  remaining: StreamOverlay[],
): void {
  const stillUsed = new Set(
    remaining.filter(isContentOverlay).map((overlay) => overlay.contentId),
  );
  const { deleteScripture } = useStore.getState();
  for (const overlay of removed) {
    if (!isContentOverlay(overlay)) continue;
    const { contentId } = overlay;
    if (!isOverlayPassageId(contentId) || stillUsed.has(contentId)) continue;
    deleteScripture(contentId);
  }
}
