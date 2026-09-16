import { useEffect, useRef } from "react";
import type { ScripturePassage, SlideDeckDoc } from "../../../types";
import { useSpeech } from "../../../hooks/useSpeech";
import { stripInlineFormatting } from "../../../lib/inlineFormat";
import { stripListMarker } from "../../../lib/lists";
import type { DeckSlide } from "../useDeck";

interface ReadAloudOptions {
  isScripture: boolean;
  doc: SlideDeckDoc | undefined;
  slides: DeckSlide[];
  slideIndex: number;
  goTo: (index: number) => void;
}

const verseTextOf = (slide: DeckSlide, dropLastLine: boolean): string => {
  if (slide.kind !== "text") return "";
  const lines =
    dropLastLine && slide.slide.lines.length > 1
      ? slide.slide.lines.slice(0, -1)
      : slide.slide.lines;
  return lines
    .map((line) => stripInlineFormatting(stripListMarker(line)))
    .join("\n");
};

/** Reads a passage aloud from the current slide, advancing as it goes. */
export const useScriptureReadAloud = ({
  isScripture,
  doc,
  slides,
  slideIndex,
  goTo,
}: ReadAloudOptions) => {
  const speech = useSpeech();

  const toggleReadAloud = () => {
    if (!isScripture) return;
    if (speech.speaking) {
      speech.stop();
      return;
    }
    const startIndex = slideIndex;
    const showsReference = Boolean(
      doc && "showReference" in doc && (doc as ScripturePassage).showReference,
    );
    speech.speak(
      slides
        .slice(startIndex)
        .map((slide) => verseTextOf(slide, showsReference)),
      (index) => goTo(startIndex + index),
    );
  };

  const toggleRef = useRef(toggleReadAloud);
  toggleRef.current = toggleReadAloud;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "r") toggleRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    speech,
    canRead: isScripture && speech.supported,
    isReading: speech.speaking,
    toggleReadAloud,
  };
};
