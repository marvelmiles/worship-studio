import { X } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";

interface ClearInputButtonProps {
  /** What the field holds; the button only appears once there is something to clear. */
  value: string;
  onClear: () => void;
  label?: string;
}

/** The clear affordance that sits inside a search or lookup field. */
export const ClearInputButton = ({
  value,
  onClear,
  label = "Clear search",
}: ClearInputButtonProps) => {
  const { colors } = useUITheme();
  if (!value) return null;

  return (
    <button
      type="button"
      onClick={onClear}
      title={label}
      aria-label={label}
      style={{
        position: "absolute",
        right: 8,
        top: 8,
        width: 24,
        height: 24,
        display: "grid",
        placeItems: "center",
        borderRadius: 7,
        cursor: "pointer",
        border: "none",
        background: fade(colors.text, 0.08),
        color: colors.sub,
        padding: 0,
      }}
    >
      <X size={13} />
    </button>
  );
};

/** Right-hand padding a field needs so its text clears the button. */
export const CLEAR_BUTTON_INSET = 38;
