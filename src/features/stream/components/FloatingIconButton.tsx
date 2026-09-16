import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";

interface FloatingIconButtonProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  isDanger?: boolean;
  disabled?: boolean;
}

export const FloatingIconButton = ({
  icon: Icon,
  title,
  onClick,
  isDanger = false,
  disabled = false,
}: FloatingIconButtonProps) => {
  const { colors } = useUITheme();
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "grid",
        placeItems: "center",
        background: "transparent",
        color: isDanger ? colors.danger : colors.sub,
        border: "1px solid transparent",
      }}
    >
      <Icon size={15} />
    </button>
  );
};
