import { useState, type ReactNode } from "react";
import { MonitorPlay, MonitorUp, Play } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { usePresentActions } from "../../hooks/usePresentActions";
import { EDITOR_COMMANDS } from "../../lib/shortcuts";
import { Button } from "./Button";
import { Popover } from "./Popover";

interface PresentMenuProps {
  /**
   * Starts the presentation. `pip` asks for the floating presenter (used by
   * Go Live, so the operator keeps the app) instead of the fullscreen stage.
   */
  onPresent: (options: { pip: boolean }) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "ghost" | "subtle";
  disabled?: boolean;
  title?: string;
  /** Stretches the trigger across whatever room its row has left. */
  fill?: boolean;
  /**
   * Shows each option's keyboard shortcut. Only true where those shortcuts are
   * actually bound, which is inside an editor.
   */
  hints?: boolean;
  /** Renders a custom trigger instead of the default button. */
  children?: ReactNode;
}

/**
 * The Present control used across the app. Presenting is two different jobs
 * and the button used to guess which one you meant, so it now asks:
 *
 * - **Go live** projects to the audience display straight away and leaves you
 *   in the floating presenter, so you can keep working in the app.
 * - **Preview** opens the presentation on this screen only, nothing is
 *   projected.
 */
export function PresentMenu({
  onPresent,
  label = "Present",
  size = "sm",
  variant = "primary",
  disabled,
  title,
  fill,
  hints,
  children,
}: PresentMenuProps) {
  const { colors } = useUITheme();
  const present = usePresentActions(onPresent);
  const [open, setOpen] = useState(false);

  const startLive = () => {
    setOpen(false);
    present.startLive();
  };

  const startPreview = () => {
    setOpen(false);
    present.startPreview();
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      openOnHover
      disabled={disabled}
      side="bottom"
      align="start"
      triggerStyle={fill ? { flex: 1, minWidth: 0 } : undefined}
      trigger={
        children ?? (
          <Button
            size={size}
            variant={variant}
            disabled={disabled}
            title={title ?? "Present"}
            style={fill ? { width: "100%" } : undefined}
          >
            <Play size={size === "sm" ? 13 : 14} />
            {label}
          </Button>
        )
      }
    >
      <div
        role="menu"
        style={{
          width: 268,
          padding: 6,
          borderRadius: 12,
          background: fade(colors.panelSolid, 0.97),
          backdropFilter: "blur(18px) saturate(150%)",
          WebkitBackdropFilter: "blur(18px) saturate(150%)",
          border: `1px solid ${colors.border}`,
          boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
        }}
      >
        <MenuOption
          icon={MonitorUp}
          title="Go live"
          description="Project to the audience now and keep using the app from the floating presenter."
          hint={hints ? EDITOR_COMMANDS.goLive.hint : undefined}
          accent
          onClick={startLive}
        />
        <MenuOption
          icon={MonitorPlay}
          title="Preview here"
          description="Open the presentation on this screen only. Nothing is projected."
          hint={hints ? EDITOR_COMMANDS.preview.hint : undefined}
          onClick={startPreview}
        />
      </div>
    </Popover>
  );
}

function MenuOption({
  icon: Icon,
  title: optionTitle,
  description,
  hint,
  accent,
  onClick,
}: {
  icon: typeof MonitorUp;
  title: string;
  description: string;
  hint?: string;
  accent?: boolean;
  onClick: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        padding: "10px 11px",
        borderRadius: 9,
        cursor: "pointer",
        textAlign: "left",
        border: "none",
        background: "transparent",
        color: colors.text,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = accent
          ? fade(colors.accent, 0.14)
          : "rgba(255,255,255,0.05)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon
        size={16}
        color={accent ? colors.accentSoft : colors.sub}
        style={{ flexShrink: 0, marginTop: 2 }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            fontFamily: fonts.ui,
            fontSize: 13.5,
            fontWeight: 700,
            color: accent ? colors.accentSoft : colors.text,
          }}
        >
          {optionTitle}
          {hint && (
            <kbd
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 10.5,
                fontWeight: 600,
                color: colors.dim,
                background: fade(colors.text, 0.07),
                border: `1px solid ${colors.border}`,
                borderRadius: 5,
                padding: "2px 5px",
                whiteSpace: "nowrap",
              }}
            >
              {hint}
            </kbd>
          )}
        </span>
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: colors.sub,
          }}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
