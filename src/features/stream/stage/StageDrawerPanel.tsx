import { useUITheme } from "../../../theme/ThemeProvider";
import { CameraPanel } from "../CameraPanel";
import { StreamOverlayPanel } from "../StreamOverlayPanel";
import type { StreamOverlay } from "../lib/streamOverlay";

export type StageDrawer = "none" | "cameras" | "overlays";

const DRAWER_WIDTH = 330;

interface StageDrawerPanelProps {
  drawer: Exclude<StageDrawer, "none">;
  isStacked: boolean;
  isLive: boolean;
  overlays: StreamOverlay[];
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
}

export const StageDrawerPanel = ({
  drawer,
  isStacked,
  isLive,
  overlays,
  selectedOverlayId,
  onSelectOverlay,
}: StageDrawerPanelProps) => {
  const { colors } = useUITheme();
  return (
    <aside
      aria-label={
        drawer === "cameras" ? "Connected cameras" : "Broadcast overlays"
      }
      style={{
        flexShrink: 0,
        width: isStacked ? "auto" : DRAWER_WIDTH,
        maxHeight: isStacked ? "45dvh" : undefined,
        overflowY: "auto",
        padding: 14,
        background: colors.raise,
        ...(isStacked
          ? { borderTop: `1px solid ${colors.border}` }
          : { borderLeft: `1px solid ${colors.border}` }),
      }}
    >
      {drawer === "cameras" ? (
        <CameraPanel isLive={isLive} />
      ) : (
        <StreamOverlayPanel
          overlays={overlays}
          selectedId={selectedOverlayId}
          onSelect={onSelectOverlay}
        />
      )}
    </aside>
  );
};
