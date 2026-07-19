import { useState, type ReactNode } from "react";
import { MonitorPlay, MonitorUp, Play } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { goLive } from "../../lib/liveWindow";
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
  children,
}: PresentMenuProps) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);

  const startLive = () => {
    setOpen(false);
    // Opened inside this click: browsers only allow window.open during a real
    // user gesture, so this cannot be deferred into an effect.
    const result = goLive();
    if (!result.ok && result.reason === "blocked") {
      pushToast("Popup blocked. Allow popups for this site to go live.", "error");
      return;
    }
    onPresent({ pip: true });
  };

  const startPreview = () => {
    setOpen(false);
    onPresent({ pip: false });
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      openOnHover
      disabled={disabled}
      side="bottom"
      align="start"
      trigger={
        children ?? (
          <Button size={size} variant={variant} disabled={disabled} title={title ?? "Present"}>
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
          accent
          onClick={startLive}
        />
        <MenuOption
          icon={MonitorPlay}
          title="Preview here"
          description="Open the presentation on this screen only. Nothing is projected."
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
  accent,
  onClick,
}: {
  icon: typeof MonitorUp;
  title: string;
  description: string;
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
        <span>
          <span
            style={{
              display: "block",
              fontFamily: fonts.ui,
              fontSize: 13.5,
              fontWeight: 700,
              color: accent ? colors.accentSoft : colors.text,
            }}
          >
            {optionTitle}
          </span>
          <span style={{ fontFamily: fonts.ui, fontSize: 11.5, lineHeight: 1.45, color: colors.sub }}>
            {description}
          </span>
        </span>
      </button>
  );
}
