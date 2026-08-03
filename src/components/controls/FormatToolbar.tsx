import type { CSSProperties, MouseEvent } from "react";
import {
  Bold,
  Highlighter,
  Italic,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { INLINE_FORMATS } from "../../lib/textFormatting";
import type { InlineFormatName } from "../../lib/textFormatting";
import type { TextFormattingController } from "../../hooks/useTextFormatting";

const ICONS: Record<InlineFormatName, LucideIcon> = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strikethrough: Strikethrough,
  highlight: Highlighter,
};

const ORDER: InlineFormatName[] = [
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "highlight",
];

interface FormatToolbarProps {
  controller: TextFormattingController;
  /** Full width with a surrounding surface, for panels rather than inline rows. */
  block?: boolean;
  style?: CSSProperties;
}

/**
 * Word-style formatting for whatever text the user has highlighted. Buttons
 * keep focus in the editor so the selection they act on is never lost, and
 * light up while the caret sits inside text that already carries the mark.
 */
export function FormatToolbar({
  controller,
  block,
  style,
}: FormatToolbarProps) {
  const { colors } = useUITheme();

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        padding: block ? 6 : 0,
        borderRadius: block ? 10 : 0,
        background: block ? colors.raise : "transparent",
        border: block ? `1px solid ${colors.border}` : "none",
        opacity: controller.ready ? 1 : 0.5,
        ...style,
      }}
    >
      {ORDER.map((name) => (
        <FormatButton
          key={name}
          icon={ICONS[name]}
          label={`${INLINE_FORMATS[name].label} (${INLINE_FORMATS[name].shortcutHint})`}
          active={controller.isActive(name)}
          disabled={!controller.ready}
          onClick={() => controller.toggle(name)}
        />
      ))}
      <span
        aria-hidden
        style={{
          width: 1,
          height: 18,
          margin: "0 3px",
          background: colors.border,
        }}
      />
      <FormatButton
        icon={RemoveFormatting}
        label="Clear formatting"
        disabled={!controller.ready}
        onClick={controller.clear}
      />
    </div>
  );
}

interface FormatButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function FormatButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: FormatButtonProps) {
  const { colors } = useUITheme();
  const rest = active ? fade(colors.accent, 0.18) : "transparent";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the caret and selection in the editor while the command runs.
      onMouseDown={(event: MouseEvent) => event.preventDefault()}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
        background: rest,
        color: active ? colors.accentSoft : colors.sub,
        border: `1px solid ${active ? fade(colors.accent, 0.32) : "transparent"}`,
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.background = active
          ? fade(colors.accent, 0.24)
          : colors.raise;
      }}
      onMouseLeave={(event) => (event.currentTarget.style.background = rest)}
    >
      <Icon size={15} />
    </button>
  );
}
