import { useEffect, useRef } from "react";
import type { ContentKind, Slide } from "../../types";
import { useStore } from "../../store/useStore";

export const useFollowPresentation = (
  kind: ContentKind,
  docId: string,
  slides: Slide[],
  setSelectedId: (id: string) => void,
): void => {
  const presentation = useStore((s) => s.presentation);
  const presentationIndex = useStore((s) => s.presentationIndex);
  const isPresentingThisDoc =
    presentation?.kind === kind && presentation.id === docId;

  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const followedIndex = useRef<number | null>(null);

  useEffect(() => {
    if (!isPresentingThisDoc) {
      followedIndex.current = null;
      return;
    }
    if (followedIndex.current === presentationIndex) return;
    followedIndex.current = presentationIndex;
    const slide = slidesRef.current[presentationIndex];
    if (slide) setSelectedId(slide.id);
  }, [isPresentingThisDoc, presentationIndex, setSelectedId]);
};
