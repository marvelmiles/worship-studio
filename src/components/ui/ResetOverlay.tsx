import { useStore } from "../../store/useStore";
import { colors, DISPLAY, UI } from "../../theme/tokens";

export function ResetOverlay() {
  const resetting = useStore((s) => s.resetting);
  if (!resetting) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            width: 46,
            height: 46,
            margin: "0 auto 20px",
            borderRadius: "50%",
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.accent,
            animation: "wfSpin 0.9s linear infinite",
          }}
        />
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          Resetting WorshipStudio
        </div>
        <p
          style={{
            fontFamily: UI,
            fontSize: 14,
            color: colors.sub,
            lineHeight: 1.6,
            marginTop: 10,
          }}
        >
          Restoring defaults. Please don't reload or close this tab.
        </p>
      </div>
    </div>
  );
}
