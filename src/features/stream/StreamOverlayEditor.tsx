import { useMemo } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { SlideElementOverlay } from "../editor/SlideElementOverlay";
import type {
  SlideElement,
  SlideElementRef,
} from "../editor/SlideElementOverlay";
import { isOnAir, isVisible } from "./lib/streamOverlay";
import type { StreamOverlay, StreamOverlayKind } from "./lib/streamOverlay";
import {
  duplicateStreamOverlay,
  moveStreamOverlay,
  removeStreamOverlay,
  setStreamOverlayFrame,
} from "./lib/streamOverlayStore";

export type StreamOverlayRef = SlideElementRef<StreamOverlayKind>;

/**
 * The operator's drag surface for the overlays on a live broadcast.
 *
 * All it does is bind the slide editor's element overlay to the broadcast's
 * overlay store. The gestures — drag, eight resize grips, arrow-key nudge,
 * bring-forward/send-backward, duplicate, delete — are the ones a writer already
 * knows from laying out a slide, so placing a passage over a camera behaves
 * exactly like placing a picture on a slide, and there is one implementation of
 * that behaviour rather than two.
 *
 * It sits above StreamOverlayLayers and paints nothing the broadcast will show
 * — only the handles and the draft markers, which exist on the operator's copy
 * alone. That split is what keeps the projected output identical to the one
 * being arranged.
 */
export function StreamOverlayEditor({
  overlays,
  selectedId,
  onSelect,
}: {
  overlays: StreamOverlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  // Handles follow what is actually drawn. A hidden element has nothing under
  // its box to grab, so it leaves the surface until the eye brings it back.
  const drawn = useMemo(() => overlays.filter(isVisible), [overlays]);

  const elements = useMemo<SlideElement<StreamOverlayKind>[]>(
    () =>
      drawn.map((overlay) => ({
        id: overlay.id,
        kind: overlay.kind,
        frame: overlay.frame,
        label: `${overlay.label}${isOnAir(overlay) ? ", on air" : ", draft"}`,
        // Nothing on a broadcast is typed into in place, so every kind is
        // grabbed by its middle rather than only by its edges.
        dragFromInterior: true,
      })),
    [drawn],
  );

  const drafts = drawn.filter((overlay) => !isOnAir(overlay));

  return (
    <>
      <SlideElementOverlay<StreamOverlayKind>
        elements={elements}
        selectedId={selectedId}
        onSelect={(element) => onSelect(element?.id ?? null)}
        onFrameChange={(element, frame) =>
          setStreamOverlayFrame(element.id, frame)
        }
        onDuplicate={(element) => duplicateStreamOverlay(element.id)}
        onDelete={(element) => {
          removeStreamOverlay(element.id);
          onSelect(null);
        }}
        onReorder={(element, direction) =>
          moveStreamOverlay(element.id, direction)
        }
      />
      <DraftMarkers overlays={drafts} />
    </>
  );
}

/**
 * Tags every staged overlay on the operator's surface.
 *
 * A draft is painted exactly as it will look on air, which is what makes it
 * worth arranging but also means the two are indistinguishable on screen. This
 * is the one thing that tells them apart at a glance, so the operator is never
 * left wondering whether the room is already looking at what they are still
 * moving around.
 */
function DraftMarkers({ overlays }: { overlays: StreamOverlay[] }) {
  const { colors, fonts } = useUITheme();
  if (overlays.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {overlays.map((overlay) => (
        <span
          key={overlay.id}
          style={{
            position: "absolute",
            left: `${overlay.frame.x}%`,
            top: `${overlay.frame.y}%`,
            transform: "translateY(-100%)",
            margin: "-4px 0 0 0",
            padding: "2px 7px",
            borderRadius: 999,
            background: colors.panelSolid,
            border: `1px solid ${colors.border}`,
            color: colors.sub,
            fontFamily: fonts.ui,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          Not on air
        </span>
      ))}
    </div>
  );
}
