import { useEffect } from "react";
import type { ContentKind, Slide } from "../../types";
import { useStore } from "../../store/useStore";

/**
 * Keeps the editor's active slide in step with a running presentation of the
 * same document, so advancing from the floating presenter, the stage or a
 * keyboard shortcut also moves the slide the operator is editing. The link is
 * one-way: selecting a slide in the editor never moves what the audience sees.
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

  useEffect(() => {
    if (!isPresentingThisDoc) return;
    const slide = slides[presentationIndex];
    if (slide) setSelectedId(slide.id);
  }, [isPresentingThisDoc, presentationIndex, slides, setSelectedId]);
}
