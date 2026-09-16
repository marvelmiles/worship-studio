import type { ScripturePassage } from "../../../types";
import { uid } from "../../../lib/id";
import { useStore, type ScriptureSelection } from "../../../store/useStore";
import { isContentOverlay, type StreamOverlay } from "./streamOverlay";

const OVERLAY_PASSAGE_PREFIX = "overlay-passage-";

const isOverlayPassageId = (id: string): boolean =>
  id.startsWith(OVERLAY_PASSAGE_PREFIX);

export const createOverlayPassage = (
  selection: ScriptureSelection,
): ScripturePassage | null => {
  return useStore.getState().stageScriptureSelection(selection, {
    id: `${OVERLAY_PASSAGE_PREFIX}${uid()}`,
    splitLongVerses: false,
  });
};

export const releaseOverlayPassages = (
  removed: StreamOverlay[],
  remaining: StreamOverlay[],
): void => {
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
};
