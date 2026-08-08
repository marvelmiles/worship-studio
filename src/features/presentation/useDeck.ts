import { useMemo } from "react";
import type {
  ContentKind,
  MediaItem,
  Slide,
  SlideDeckDoc,
  Theme,
} from "../../types";
import { useStore } from "../../store/useStore";
import { sortMediaByRecency } from "../../lib/media";

export type DeckSlide =
  | { kind: "text"; slide: Slide }
  | { kind: "image"; item: MediaItem }
  | { kind: "video"; item: MediaItem };

export interface Deck {
  kind: ContentKind;
  id: string;
  title: string;
  /** Last-updated stamp of the source so mirrors can spot stale copies. */
  rev: string;
  doc?: SlideDeckDoc;
  theme?: Theme;
  slides: DeckSlide[];
}

/**
 * Resolves any presentable target into a uniform deck of slides. Manuscripts
 * and scripture passages become text decks; presenting an image navigates the
 * whole image library as a slideshow; a video is a single-slide deck.
 *
 * Text decks come from the copy pinned when the presentation started rather
 * than from the library, so an operator editing mid-service only changes the
 * screen once they update the presentation. `docOverride` is that copy
 * arriving from elsewhere, which is how the projected popup renders a version
 * the library has not been given yet.
 */
export function useDeck(
  kind: ContentKind | undefined,
  id: string | undefined,
  docOverride?: SlideDeckDoc,
): Deck | null {
  const manuscripts = useStore((s) => s.manuscripts);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const themes = useStore((s) => s.themes);
  const presentedDeck = useStore((s) => s.presentedDeck);

  return useMemo(() => {
    if (!kind || !id) return null;

    if (kind === "manuscript" || kind === "scripture") {
      const pinned =
        presentedDeck && presentedDeck.kind === kind && presentedDeck.id === id
          ? presentedDeck.doc
          : undefined;
      const doc: SlideDeckDoc | undefined =
        docOverride ??
        pinned ??
        (kind === "manuscript"
          ? manuscripts.find((m) => m.id === id)
          : scriptures.find((s) => s.id === id));
      if (!doc) return null;
      const theme =
        themes.find((t) => t.id === doc.defaultThemeId) || themes[0];
      return {
        kind,
        id,
        title: doc.title,
        rev: doc.updatedAt,
        doc,
        theme,
        slides: (doc.slides || []).map((slide) => ({
          kind: "text" as const,
          slide,
        })),
      };
    }

    if (kind === "image") {
      const images = media
        .filter((m) => m.kind === "image")
        .sort(sortMediaByRecency);
      const target = images.find((m) => m.id === id);
      if (!target) return null;
      return {
        kind,
        id,
        title: target.name,
        rev: target.updatedAt,
        slides: images.map((item) => ({ kind: "image" as const, item })),
      };
    }

    const item = media.find((m) => m.id === id && m.kind === "video");
    if (!item) return null;
    return {
      kind,
      id,
      title: item.name,
      rev: item.updatedAt,
      slides: [{ kind: "video" as const, item }],
    };
  }, [
    kind,
    id,
    docOverride,
    presentedDeck,
    manuscripts,
    scriptures,
    media,
    themes,
  ]);
}

/** Index of an item inside the image slideshow deck ordering. */
export function imageDeckIndex(media: MediaItem[], id: string): number {
  const images = media
    .filter((m) => m.kind === "image")
    .sort(sortMediaByRecency);
  return Math.max(
    0,
    images.findIndex((m) => m.id === id),
  );
}
