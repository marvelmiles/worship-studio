import { useMemo } from "react";
import type { ContentKind, MediaItem, Slide, SlideDeckDoc, Theme } from "../../types";
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
 * Resolves any presentable target into a uniform deck of slides. Songs and
 * scripture passages become text decks; presenting an image navigates the
 * whole image library as a slideshow; a video is a single-slide deck.
 */
export function useDeck(kind: ContentKind | undefined, id: string | undefined): Deck | null {
  const songs = useStore((s) => s.songs);
  const scriptures = useStore((s) => s.scriptures);
  const media = useStore((s) => s.media);
  const themes = useStore((s) => s.themes);

  return useMemo(() => {
    if (!kind || !id) return null;

    if (kind === "song" || kind === "scripture") {
      const doc: SlideDeckDoc | undefined =
        kind === "song" ? songs.find((s) => s.id === id) : scriptures.find((s) => s.id === id);
      if (!doc) return null;
      const theme = themes.find((t) => t.id === doc.defaultThemeId) || themes[0];
      return {
        kind,
        id,
        title: doc.title,
        rev: doc.updatedAt,
        doc,
        theme,
        slides: (doc.slides || []).map((slide) => ({ kind: "text" as const, slide })),
      };
    }

    if (kind === "image") {
      const images = media.filter((m) => m.kind === "image").sort(sortMediaByRecency);
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
  }, [kind, id, songs, scriptures, media, themes]);
}

/** Index of an item inside the image slideshow deck ordering. */
export function imageDeckIndex(media: MediaItem[], id: string): number {
  const images = media.filter((m) => m.kind === "image").sort(sortMediaByRecency);
  return Math.max(0, images.findIndex((m) => m.id === id));
}
