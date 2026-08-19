import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { IconButton } from "./Button";
import { Popover } from "./Popover";
import type { PopoverAlign, PopoverSide } from "./Popover";

export interface MoreMenuItem {
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Drawn as already in force, the way a set pin reads. */
  active?: boolean;
  title?: string;
  /** A rule between groups; every other field is ignored. */
  divider?: boolean;
}

interface MoreMenuProps {
  items: MoreMenuItem[];
  title?: string;
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Matches the trigger to the buttons beside it; "sm" on a library card. */
  size?: "sm" | "md";
}

/**
 * The overflow menu on a library card. Cards lead with the two things an
 * operator reaches for, Present and Edit, and everything else lives behind one
 * ellipsis rather than a row of icons competing for the same glance.
 */
export function MoreMenu({
  items,
  title = "More actions",
  side = "bottom",
  align = "end",
  size = "md",
}: MoreMenuProps) {
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side={side}
      align={align}
      trigger={
        <IconButton
          icon={MoreHorizontal}
          title={title}
          active={open}
          size={size}
        />
      }
    >
      <div
        role="menu"
        style={{
          minWidth: 210,
          padding: 6,
          borderRadius: 12,
          background: fade(colors.panelSolid, 0.97),
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          border: `1px solid ${colors.border}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
        }}
      >
        {items.map((item, index) =>
          item.divider ? (
            <div
              key={index}
              style={{
                height: 1,
                background: colors.border,
                margin: "5px 8px",
              }}
            />
          ) : (
            <MoreMenuButton
              key={index}
              item={item}
              onDone={() => setOpen(false)}
            />
          ),
        )}
      </div>
    </Popover>
  );
}

function MoreMenuButton({
  item,
  onDone,
}: {
  item: MoreMenuItem;
  onDone: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const Icon = item.icon;
  const rest = item.active ? fade(colors.accent, 0.12) : "transparent";
  const color = item.disabled
    ? colors.dim
    : item.danger
      ? colors.danger
      : item.active
        ? colors.accentSoft
        : colors.text;

  return (
    <button
      role="menuitem"
      title={item.title}
      disabled={item.disabled}
      onClick={() => {
        item.onClick?.();
        onDone();
      }}
      onMouseEnter={(event) => {
        if (item.disabled) return;
        event.currentTarget.style.background = item.danger
          ? fade(colors.danger, 0.12)
          : item.active
            ? fade(colors.accent, 0.2)
            : colors.raise;
      }}
      onMouseLeave={(event) => (event.currentTarget.style.background = rest)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 11px",
        borderRadius: 9,
        background: rest,
        border: "none",
        cursor: item.disabled ? "not-allowed" : "pointer",
        fontFamily: fonts.ui,
        fontSize: 13.5,
        fontWeight: 600,
        textAlign: "left",
        color,
      }}
    >
      {Icon && <Icon size={15} style={{ flexShrink: 0 }} />}
      {item.label}
    </button>
  );
}
