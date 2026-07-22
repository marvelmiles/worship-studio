import { Volume2, VolumeX } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";

/**
 * A small pill shown on a received feed when the sender is sharing audio, so the
 * operator can tell at a glance that the stream carries sound — and whether it's
 * currently muted on this device. Shared by the projection surface and the PiP so
 * the indicator reads the same in both.
 */
export function AudioSharingPill({ muted, size = "md" }: { muted: boolean; size?: "sm" | "md" }) {
  const { colors, fonts } = useUITheme();
  const small = size === "sm";
  const Icon = muted ? VolumeX : Volume2;
  return (
    <span
      title={muted ? "The sender's audio is muted on this device" : "The sender is sharing audio"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 4 : 6,
        padding: small ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        background: colors.raise,
        color: muted ? colors.dim : colors.sub,
        border: `1px solid ${colors.border}`,
        fontFamily: fonts.ui,
        fontSize: small ? 10 : 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={small ? 11 : 12} /> {muted ? "Muted" : "Audio"}
    </span>
  );
}
