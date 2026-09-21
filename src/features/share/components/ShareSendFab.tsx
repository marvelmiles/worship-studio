import { SendHorizontal, Square } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { ProgressRing } from "../../../components/ui/ProgressRing";

interface ShareSendFabProps {
  /** Whether there is anywhere to send and something to send there. */
  canSend: boolean;
  isBusy: boolean;
  /** How far it has got, or null while that cannot be measured yet. */
  progress: number | null;
  onSend: () => void;
  onStop: () => void;
}

const SIZE = 58;

/**
 * The one control the picker needs: send what is ticked, then show how far it
 * has got and let it be stopped.
 */
export const ShareSendFab = ({
  canSend,
  isBusy,
  progress,
  onSend,
  onStop,
}: ShareSendFabProps) => {
  const { colors, fonts, shadows } = useUITheme();
  if (!isBusy && !canSend) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {isBusy && (
        <button
          type="button"
          title="Stop sending"
          aria-label="Stop sending"
          onClick={onStop}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            color: colors.danger,
            background: colors.panelSolid,
            border: `1px solid ${fade(colors.danger, 0.35)}`,
            boxShadow: shadows.overlay,
          }}
        >
          <Square size={16} />
        </button>
      )}

      {isBusy ? (
        <div
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: colors.panelSolid,
            border: `1px solid ${colors.border}`,
            boxShadow: shadows.overlay,
          }}
        >
          <ProgressRing
            size={SIZE - 10}
            thickness={4}
            value={progress ?? 0}
            indeterminate={progress === null}
            label="Sending"
          >
            <span
              style={{
                fontFamily: fonts.ui,
                fontSize: 12,
                fontWeight: 700,
                color: colors.text,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {progress === null ? "" : `${progress}%`}
            </span>
          </ProgressRing>
        </div>
      ) : (
        <button
          type="button"
          title="Send what you chose"
          aria-label="Send what you chose"
          onClick={onSend}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            color: colors.onAccent,
            background: colors.accent,
            border: `1px solid ${fade(colors.accentSoft, 0.35)}`,
            boxShadow: `0 10px 28px ${fade(colors.accent, 0.4)}`,
          }}
          onMouseEnter={(event) =>
            (event.currentTarget.style.filter = "brightness(1.1)")
          }
          onMouseLeave={(event) => (event.currentTarget.style.filter = "none")}
        >
          <SendHorizontal size={22} />
        </button>
      )}
    </div>
  );
};
