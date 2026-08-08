import { useEffect, useRef } from "react";
import type { ContentKind, Slide } from "../../types";
import { useStore } from "../../store/useStore";

/**
 * Keeps the editor's active slide in step with a running presentation of the
 * same document, so advancing from the floating presenter, the stage or a
 * keyboard shortcut also moves the slide the operator is editing. The link is
 * one-way: selecting a slide in the editor never moves what the audience sees.
 *
 * Only an actual move follows through. The slides themselves change on every
 * keystroke, and reacting to that would drag the operator back to the
 * projected slide the moment they started editing another one.
 */
export function useFollowPresentation(
  kind: ContentKind,
  docId: string,
  slides: Slide[],
  setSelectedId: (id: string) => void,
): void {
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
}
