import { useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useUITheme } from "../../theme/ThemeProvider";
import { computePlacement } from "../../lib/placement";
import type { Placement } from "../../lib/placement";
import { FormatToolbar } from "./FormatToolbar";
import type { TextFormattingController } from "../../hooks/useTextFormatting";

interface SelectionFormatToolbarProps {
  controller: TextFormattingController;
  /** Viewport rect of the highlight the toolbar hangs off, null to hide it. */
  rect: DOMRect | null;
}

/**
 * The formatting toolbar as a popover over highlighted slide text, the way a
 * word processor offers its marks where the words are. It renders into a portal
 * so a scrolling panel can never clip it, and swallows pointer presses so the
 * highlight it acts on is still there when the command runs.
 */
export function SelectionFormatToolbar({
  controller,
  rect,
}: SelectionFormatToolbarProps) {
  const { colors } = useUITheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  // Measured before paint, so the toolbar never flashes at the wrong spot.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!rect || !panel) {
      setPlacement(null);
      return;
    }
    setPlacement(
      computePlacement(
        rect,
        { width: panel.offsetWidth, height: panel.offsetHeight },
        "top",
        "center",
      ),
    );
  }, [rect]);

  if (!rect) return null;

  return createPortal(
    <div
      ref={panelRef}
      onMouseDown={(event: MouseEvent) => event.preventDefault()}
      style={{
        position: "fixed",
        top: placement?.top ?? 0,
        left: placement?.left ?? 0,
        zIndex: 400,
        visibility: placement ? "visible" : "hidden",
        padding: 6,
        borderRadius: 12,
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
      }}
    >
      <FormatToolbar controller={controller} />
    </div>,
    document.body,
  );
}
