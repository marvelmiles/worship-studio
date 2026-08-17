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
  /** The picture or clip being shown, for media decks. */
  item?: MediaItem;
  theme?: Theme;
  slides: DeckSlide[];
}

/** A version arriving from elsewhere, which the popup renders instead. */
export interface DeckOverride {
  doc?: SlideDeckDoc;
  item?: MediaItem;
}

/**
 * Resolves any presentable target into a uniform deck of slides. Manuscripts
 * and scripture passages become text decks; presenting an image navigates the
 * whole image library as a slideshow; a video is a single-slide deck.
 *
 * What is shown comes from the copy pinned when the presentation started rather
 * than from the library, so an operator editing mid-service only changes the
 * screen once they update the presentation. That holds for a picture and a clip
 * as much as for a document. `override` is such a copy arriving from elsewhere,
 * which is how the projected popup renders a version the library has not been
 * given yet.
 */
export function useDeck(
  kind: ContentKind | undefined,
  id: string | undefined,
  override?: DeckOverride,
): Deck | null {
  const manuscripts = useStore((s) => s.manuscripts);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const themes = useStore((s) => s.themes);
  const presentedDeck = useStore((s) => s.presentedDeck);

  return useMemo(() => {
    if (!kind || !id) return null;

    const pinned =
      presentedDeck && presentedDeck.kind === kind && presentedDeck.id === id
        ? presentedDeck
        : null;

    if (kind === "manuscript" || kind === "scripture") {
      const doc: SlideDeckDoc | undefined =
        override?.doc ??
        pinned?.doc ??
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

    // The version being shown: the operator's pushed copy, else the library's.
    const shown = override?.item ?? pinned?.item;

    if (kind === "image") {
      const images = media
        .filter((m) => m.kind === "image")
        .sort(sortMediaByRecency);
      const target = shown ?? images.find((m) => m.id === id);
      if (!target) return null;
      const inLibrary = images.some((m) => m.id === id);
      return {
        kind,
        id,
        title: target.name,
        rev: target.updatedAt,
        item: target,
        // The slideshow still runs over the library; only the picture being
        // shown is the operator's version of it. A picture the library has not
        // caught up with yet stands on its own until it does.
        slides: inLibrary
          ? images.map((item) => ({
              kind: "image" as const,
              item: item.id === id ? target : item,
            }))
          : [{ kind: "image" as const, item: target }],
      };
    }

    const item = shown ?? media.find((m) => m.id === id && m.kind === "video");
    if (!item) return null;
    return {
      kind,
      id,
      title: item.name,
      rev: item.updatedAt,
      item,
      slides: [{ kind: "video" as const, item }],
    };
  }, [
    kind,
    id,
    override,
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
