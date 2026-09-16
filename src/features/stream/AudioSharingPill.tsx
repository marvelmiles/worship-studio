import { MicOff, Volume2, VolumeX } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";

export const AudioSharingPill = ({
  available,
  muted,
  size = "md",
}: {
  available: boolean;
  muted: boolean;
  size?: "sm" | "md";
}) => {
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
};
