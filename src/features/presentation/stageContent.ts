import type {
  AnimationKind,
  Background,
  ImageSettings,
  MediaItem,
  ResolvedStyle,
  Slide,
} from "../../types";
import {
  resolveAnimation,
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
      /** This slide's picture settings, null unless the background is an image. */
      backgroundImage: ImageSettings | null;
    }
  | { kind: "image"; item: MediaItem }
  | { kind: "video"; item: MediaItem };

export interface StageFrame {
  content: StageContent;
  animation: AnimationKind;
  /** Root backdrop behind the letterboxed stage area. */
  backdrop: Background | null;
}

export function buildStageFrame(
  deck: Deck,
  deckSlide: DeckSlide | undefined,
  bgMap: Record<string, Background>,
  fallbackAnimation: AnimationKind,
): StageFrame | null {
  if (!deckSlide) return null;

  if (deckSlide.kind === "text") {
    const { doc, theme } = deck;
    if (!theme) return null;
    const slide = deckSlide.slide;
    const background = resolveBackgroundView(slide, doc, theme, bgMap);
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
}
