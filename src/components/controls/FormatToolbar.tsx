import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import {
  Bold,
  ChevronDown,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { Popover } from "../ui/Popover";
import { INLINE_FORMATS } from "../../lib/textFormatting";
import type { InlineFormatName } from "../../lib/textFormatting";
import { LIST_KIND_LABELS, ORDERED_LIST_KINDS } from "../../lib/lists";
import type { ListKind } from "../../lib/lists";
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

/** A sample of each ordered kind, so the menu shows what it will produce. */
const LIST_SAMPLES: Record<ListKind, string> = {
  bullet: "•",
  decimal: "1. 2. 3.",
  "lower-alpha": "a. b. c.",
  "upper-alpha": "A. B. C.",
  "lower-roman": "i. ii. iii.",
  "upper-roman": "I. II. III.",
};

interface FormatToolbarProps {
  controller: TextFormattingController;
  /** Full width with a surrounding surface, for panels rather than inline rows. */
  block?: boolean;
  style?: CSSProperties;
}

/**
 * Word-style formatting for whatever text the user has highlighted: emphasis,
 * lists and indentation. Buttons keep focus in the editor so the selection they
 * act on is never lost, and light up while the caret sits inside text that
 * already carries the mark.
 */
export function FormatToolbar({
  controller,
  block,
  style,
}: FormatToolbarProps) {
  const { colors } = useUITheme();
  const [listMenu, setListMenu] = useState(false);
  const { list } = controller;

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

      <Divider />

      <FormatButton
        icon={List}
        label={LIST_KIND_LABELS.bullet}
        active={list.kind === "bullet"}
        disabled={!controller.ready}
        onClick={() => controller.toggleList("bullet")}
      />
      <FormatButton
        icon={ListOrdered}
        label={LIST_KIND_LABELS.decimal}
        active={list.kind === "decimal"}
        disabled={!controller.ready}
        onClick={() => controller.toggleList("decimal")}
      />
      <Popover
        open={listMenu}
        onOpenChange={setListMenu}
        disabled={!controller.ready}
        align="start"
        trigger={
          <FormatButton
            icon={ChevronDown}
            label="More list styles"
            width={22}
            active={
              list.kind !== null &&
              list.kind !== "bullet" &&
              list.kind !== "decimal"
            }
            disabled={!controller.ready}
          />
        }
      >
        <ListStyleMenu
          active={list.kind}
          onPick={(kind) => {
            controller.toggleList(kind);
            setListMenu(false);
          }}
        />
      </Popover>

      <FormatButton
        icon={IndentDecrease}
        label="Decrease indent (Shift+Tab)"
        disabled={!controller.ready || list.level === 0}
        onClick={controller.outdent}
      />
      <FormatButton
        icon={IndentIncrease}
        label="Increase indent (Tab)"
        disabled={!controller.ready}
        onClick={controller.indent}
      />

      <Divider />

      <FormatButton
        icon={RemoveFormatting}
        label="Clear formatting"
        disabled={!controller.ready}
        onClick={controller.clear}
      />
    </div>
  );
}

function Divider() {
  const { colors } = useUITheme();
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 18,
        margin: "0 3px",
        background: colors.border,
      }}
    />
  );
}

interface ListStyleMenuProps {
  active: ListKind | null;
  onPick: (kind: ListKind) => void;
}

function ListStyleMenu({ active, onPick }: ListStyleMenuProps) {
  const { colors, fonts } = useUITheme();
  return (
    <div
      role="menu"
      style={{
        minWidth: 208,
        padding: 6,
        borderRadius: 12,
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
      }}
    >
      {ORDERED_LIST_KINDS.map((kind) => {
        const selected = active === kind;
        return (
          <button
            key={kind}
            role="menuitemradio"
            aria-checked={selected}
            onMouseDown={(event: MouseEvent) => event.preventDefault()}
            onClick={() => onPick(kind)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: fonts.ui,
              fontSize: 13,
              color: selected ? colors.accentSoft : colors.text,
              background: selected ? fade(colors.accent, 0.16) : "transparent",
              border: "none",
            }}
            onMouseEnter={(event) => {
              if (selected) return;
              event.currentTarget.style.background = colors.raise;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = selected
                ? fade(colors.accent, 0.16)
                : "transparent";
            }}
          >
            {LIST_KIND_LABELS[kind]}
            <span
              style={{
                fontSize: 12,
                color: colors.dim,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {LIST_SAMPLES[kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface FormatButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  width?: number;
  onClick?: () => void;
}

function FormatButton({
  icon: Icon,
  label,
  active,
  disabled,
  width = 30,
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
        width,
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
