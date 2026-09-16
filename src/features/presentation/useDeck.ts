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
  rev: string;
  doc?: SlideDeckDoc;
  item?: MediaItem;
  theme?: Theme;
  slides: DeckSlide[];
}

export interface DeckOverride {
  doc?: SlideDeckDoc;
  item?: MediaItem;
}

export const useDeck = (
  kind: ContentKind | undefined,
  id: string | undefined,
  override?: DeckOverride,
): Deck | null => {
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
};

export const imageDeckIndex = (media: MediaItem[], id: string): number => {
  const images = media
    .filter((m) => m.kind === "image")
    .sort(sortMediaByRecency);
  return Math.max(
    0,
    images.findIndex((m) => m.id === id),
  );
};
