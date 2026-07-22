import { MicOff, Volume2, VolumeX } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";

/**
 * A small pill on a received feed that shows, at a glance, the state of the
 * sender's audio: not shared, shared, or shared-but-muted-here. Shared by the
 * projection surface and the PiP so the indicator reads the same in both. The
 * mute/unmute control lives beside it and is only offered when audio is actually
 * available (see ProjectionSurface).
 */
export function AudioSharingPill({
  available,
  muted,
  size = "md",
}: {
  available: boolean;
  muted: boolean;
  size?: "sm" | "md";
}) {
  const { colors, fonts } = useUITheme();
  const small = size === "sm";

  const { Icon, label, title, dim } = !available
    ? {
        Icon: MicOff,
        label: "No audio",
        title: "The sender isn't sharing audio",
        dim: true,
      }
    : muted
      ? {
          Icon: VolumeX,
          label: "Muted",
          title: "The sender's audio is muted on this device",
          dim: true,
        }
      : {
          Icon: Volume2,
          label: "Audio",
          title: "The sender is sharing audio",
          dim: false,
        };

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? 4 : 6,
        padding: small ? "3px 8px" : "5px 11px",
        borderRadius: 999,
        background: colors.raise,
        color: dim ? colors.dim : colors.sub,
        border: `1px solid ${colors.border}`,
        fontFamily: fonts.ui,
        fontSize: small ? 10 : 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={small ? 11 : 12} /> {label}
    </span>
  );
}
