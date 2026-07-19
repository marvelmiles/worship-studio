import { Play } from "lucide-react";
import type { ScriptureSelection } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { PresentMenu } from "../../components/ui/PresentMenu";
import { usePresentScripture } from "./usePresentScripture";

/**
 * "Present" for any scripture surface: the reader's selection bar, a reference
 * jump, a search result. Takes the selection lazily so callers that would have
 * to load or filter verses only pay for it on click, and stops the click from
 * reaching a row that would otherwise navigate.
 */
export function PresentButton({
  selection,
  label = "Present",
  size = "sm",
  variant = "primary",
  title,
  disabled,
}: {
  /** The passage to present, or a getter for it. Null/empty means nothing to do. */
  selection: ScriptureSelection | null | (() => ScriptureSelection | null);
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "subtle";
  title?: string;
  disabled?: boolean;
}) {
  const { present } = usePresentScripture();

  return (
    <span
      style={{ display: "inline-flex" }}
      // Search results and the jump card are themselves clickable rows that
      // open the reader; presenting must not also navigate.
      onClick={(e) => e.stopPropagation()}
    >
      <PresentMenu
        disabled={disabled}
        title={title}
        onPresent={({ pip }) => {
          if (disabled) return;
          present(typeof selection === "function" ? selection() : selection, pip ? "pip" : "stage");
        }}
      >
        <Button size={size} variant={variant} title={title} disabled={disabled}>
          <Play size={size === "sm" ? 13 : 14} />
          {label}
        </Button>
      </PresentMenu>
    </span>
  );
}
