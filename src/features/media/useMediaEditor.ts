import { useCallback, useMemo } from "react";
import type { ImageSettings, MediaItem, VideoSettings } from "../../types";
import { useStore } from "../../store/useStore";
import { useDraftHistory } from "../../hooks/useDraftHistory";
import {
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  imageSettingsOf,
  videoSettingsOf,
} from "../../lib/media";
import { imageDeckIndex } from "../presentation/useDeck";

/**
 * The editable side of a library item. Both settings blocks are carried so the
 * draft has one shape whichever kind is open; only the one belonging to the
 * item is ever written back.
 */
export interface MediaDraft {
  name: string;
  image: ImageSettings;
  video: VideoSettings;
}

const draftOf = (item: MediaItem): MediaDraft => ({
  name: item.name,
  image: imageSettingsOf(item),
  video: videoSettingsOf(item),
});

/**
 * Settings dragged or typed rather than clicked. A whole drag is one undo step,
 * the way a run of typing is; a rotate or a flip is a step of its own.
 */
const CONTINUOUS_KEYS = new Set([
  "brightness",
  "contrast",
  "saturation",
  "grayscale",
  "sepia",
  "blur",
  "volume",
  "trimStart",
  "trimEnd",
]);

const groupingFor = (changes: object, scope: string) => {
  const keys = Object.keys(changes);
  return keys.every((key) => CONTINUOUS_KEYS.has(key))
    ? { coalesceKey: `${scope}:${keys.join(",")}` }
    : undefined;
};

export interface MediaEditor {
  draft: MediaDraft;
  /** The draft as the library item it would become, for previewing and projecting. */
  preview: MediaItem;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setName: (name: string) => void;
  patchImage: (changes: Partial<ImageSettings>) => void;
  patchVideo: (changes: Partial<VideoSettings>) => void;
  /** Back to the settings a fresh upload starts with, as one undo step. */
  resetSettings: () => void;
  /** Writes the draft to the library. False when the store refused it. */
  save: () => boolean;
  present: (options: { pip: boolean }) => void;
  /** True while this item is the one being presented. */
  isPresenting: boolean;
  /** Pushes the draft onto the running presentation. */
  updatePresentation: () => boolean;
}

/**
 * One editing session over a picture or a clip.
 *
 * Nothing reaches the library until `save` runs, and nothing reaches the
 * audience until `present` or `updatePresentation` does, which is what lets an
 * operator retouch a clip mid-service without the screen moving under them.
 */
export function useMediaEditor(item: MediaItem): MediaEditor {
  const media = useStore((s) => s.media);
  const updateMedia = useStore((s) => s.updateMedia);
  const startPresent = useStore((s) => s.startPresent);
  const updateMediaPresentation = useStore((s) => s.updateMediaPresentation);
  const presentation = useStore((s) => s.presentation);

  const history = useDraftHistory<MediaDraft>(draftOf(item));
  const { draft, apply, patch } = history;

  const preview = useMemo<MediaItem>(
    () => ({
      ...item,
      name: draft.name.trim() || item.name,
      ...(item.kind === "image"
        ? { image: draft.image }
        : { video: draft.video }),
    }),
    [item, draft],
  );

  const setName = useCallback(
    (name: string) => patch({ name }, { coalesceKey: "name" }),
    [patch],
  );

  const patchImage = useCallback(
    (changes: Partial<ImageSettings>) =>
      patch(
        { image: { ...draft.image, ...changes } },
        groupingFor(changes, "image"),
      ),
    [patch, draft.image],
  );

  const patchVideo = useCallback(
    (changes: Partial<VideoSettings>) =>
      patch(
        { video: { ...draft.video, ...changes } },
        groupingFor(changes, "video"),
      ),
    [patch, draft.video],
  );

  const resetSettings = useCallback(
    () =>
      apply({
        ...draft,
        image: { ...DEFAULT_IMAGE_SETTINGS },
        video: { ...DEFAULT_VIDEO_SETTINGS },
      }),
    [apply, draft],
  );

  const { markSaved } = history;
  const save = useCallback((): boolean => {
    // A clip whose end lands before its start would play nothing at all, so an
    // unusable trim is read as "to the end" rather than saved as written.
    const trimStart = Math.max(0, draft.video.trimStart);
    const trimEnd =
      draft.video.trimEnd !== null && draft.video.trimEnd > trimStart
        ? draft.video.trimEnd
        : null;
    const written = updateMedia(item.id, {
      name: draft.name.trim() || item.name,
      ...(item.kind === "image"
        ? { image: draft.image }
        : { video: { ...draft.video, trimStart, trimEnd } }),
    });
    if (written) markSaved();
    return written;
  }, [draft, item, updateMedia, markSaved]);

  const present = useCallback(
    ({ pip }: { pip: boolean }) => {
      const startIndex =
        item.kind === "image" ? imageDeckIndex(media, item.id) : 0;
      startPresent(item.kind, item.id, startIndex, pip ? "pip" : "stage");
      // The run starts from the library copy; the draft is pushed onto it, so
      // what the operator is looking at is what the room gets.
      updateMediaPresentation(preview);
    },
    [item, media, preview, startPresent, updateMediaPresentation],
  );

  return {
    draft,
    preview,
    dirty: history.dirty,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: history.undo,
    redo: history.redo,
    setName,
    patchImage,
    patchVideo,
    resetSettings,
    save,
    present,
    isPresenting:
      presentation?.kind === item.kind && presentation.id === item.id,
    updatePresentation: () => updateMediaPresentation(preview),
  };
}
