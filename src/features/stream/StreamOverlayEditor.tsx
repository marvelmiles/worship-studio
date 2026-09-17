import { useMemo } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { SlideElementOverlay } from "../editor/SlideElementOverlay";
import type { SlideElement } from "../editor/SlideElementOverlay";
import { editedOverlay, isOnAir, isVisible } from "./lib/streamOverlay";
import type { StreamOverlay, StreamOverlayKind } from "./lib/streamOverlay";
import {
  duplicateStreamOverlay,
  removeStreamOverlay,
  setStreamOverlayFrame,
} from "./lib/streamOverlayStore";

export const StreamOverlayEditor = ({
  overlays,
  selectedId,
  onSelect,
}: {
  overlays: StreamOverlay[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) => {
  const drawn = useMemo(
    () => overlays.filter(isVisible).map(editedOverlay),
    [overlays],
  );

  const elements = useMemo<SlideElement<StreamOverlayKind>[]>(
    () =>
      drawn.map((overlay) => ({
        id: overlay.id,
        kind: overlay.kind,
        frame: overlay.frame,
        label: `${overlay.label}${isOnAir(overlay) ? ", on air" : ", draft"}`,
        dragFromInterior: true,
      })),
    [drawn],
  );

  const drafts = drawn.filter((overlay) => !isOnAir(overlay));

  return (
    <>
      <SlideElementOverlay<StreamOverlayKind>
        elements={elements}
        frameOnFocus
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
      />
      <DraftMarkers overlays={drafts} />
    </>
  );
};

const DraftMarkers = ({ overlays }: { overlays: StreamOverlay[] }) => {
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
};
