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
  rect: DOMRect | null;
}

export const SelectionFormatToolbar = ({
  controller,
  rect,
}: SelectionFormatToolbarProps) => {
  const { colors } = useUITheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

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
};
