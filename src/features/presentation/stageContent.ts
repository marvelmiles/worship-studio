import type {
  AnimationKind,
  Background,
  ImageSettings,
  MediaItem,
  ResolvedStyle,
  Slide,
  VideoSettings,
} from "../../types";
import {
  resolveAnimation,
  resolveBackgroundId,
  resolveBackgroundView,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import type { Deck, DeckSlide } from "./useDeck";

export type StageContent =
  | {
      kind: "text";
      slide: Slide;
      style: ResolvedStyle;
      lineStyles: ResolvedStyle[];
      background: Background;
      backgroundImage: ImageSettings | null;
      backgroundVideo: VideoSettings | null;
    }
  | { kind: "image"; item: MediaItem }
  | { kind: "video"; item: MediaItem };

export interface StageFrame {
  content: StageContent;
  animation: AnimationKind;
  backdrop: Background | null;
}

export const buildStageFrame = (
  deck: Deck,
  deckSlide: DeckSlide | undefined,
  bgMap: Record<string, Background>,
  fallbackAnimation: AnimationKind,
  media: MediaItem[] = [],
): StageFrame | null => {
  if (!deckSlide) return null;

  if (deckSlide.kind === "text") {
    const { doc, theme } = deck;
    if (!theme) return null;
    const slide = deckSlide.slide;
    const backgroundId = resolveBackgroundId(slide, doc, theme);
    const clip = media.find((item) => item.id === bgMap[backgroundId]?.mediaId);
    const background = resolveBackgroundView(slide, doc, theme, bgMap, clip);
    return {
      content: {
        kind: "text",
        slide,
        style: resolveStyle(slide, doc, theme),
        lineStyles: slide.lines.map((_, i) =>
          resolveLineStyle(slide, i, doc, theme),
        ),
        background: background.background,
        backgroundImage: background.image,
        backgroundVideo: background.video,
      },
      animation: resolveAnimation(slide, doc, theme, fallbackAnimation),
      backdrop: background.background,
    };
  }

  return {
    content: { kind: deckSlide.kind, item: deckSlide.item },
    animation: fallbackAnimation,
    backdrop: null,
  };
};
