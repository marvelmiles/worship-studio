import { Play } from "lucide-react";
import type { ScriptureSelection } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { usePresentScripture } from "./usePresentScripture";

export const PresentButton = ({
  selection,
  label = "Present",
  size = "sm",
  variant = "primary",
  title,
  disabled,
}: {
  selection: ScriptureSelection | null | (() => ScriptureSelection | null);
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "subtle";
  title?: string;
  disabled?: boolean;
}) => {
  const { present } = usePresentScripture();

  return (
    <span
      style={{ display: "inline-flex" }}
      onClick={(e) => e.stopPropagation()}
    >
      <PresentMenu
        disabled={disabled}
        title={title}
        onPresent={({ pip }) => {
          if (disabled) return;
          present(
            typeof selection === "function" ? selection() : selection,
            pip ? "pip" : "stage",
          );
        }}
      >
        <Button size={size} variant={variant} title={title} disabled={disabled}>
          <Play size={size === "sm" ? 13 : 14} />
          {label}
        </Button>
      </PresentMenu>
    </span>
  );
};
