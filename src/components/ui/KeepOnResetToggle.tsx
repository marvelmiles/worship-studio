import { Shield, ShieldCheck } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import {
  MAX_KEPT_ITEMS,
  canKeep,
  keptCount,
  type KeepableKind,
} from "../../lib/keepOnReset";
import { Button, IconButton } from "./Button";

/**
 * Registers a manuscript or custom theme as "keep on reset". Renders nothing
 * for items that can't hold a slot (built-ins and trashed manuscripts come
 * back, or don't come back, regardless).
 */
export function KeepOnResetToggle({
  kind,
  item,
  variant = "icon",
}: {
  kind: KeepableKind;
  item: {
    id: string;
    keepOnReset?: boolean;
    builtIn?: boolean;
    deleted?: boolean;
  };
  /** "icon" for dense card rows, "button" for a labelled control in a panel. */
  variant?: "icon" | "button";
}) {
  const manuscripts = useStore((s) => s.manuscripts);
  const themes = useStore((s) => s.themes);
  const toggleKeepOnReset = useStore((s) => s.toggleKeepOnReset);

  if (!canKeep(item)) return null;

  const kept = Boolean(item.keepOnReset);
  const used = keptCount(manuscripts, themes);
  const full = !kept && used >= MAX_KEPT_ITEMS;
  const title = kept
    ? "Kept: survives a reset. Click to stop keeping it."
    : full
      ? `All ${MAX_KEPT_ITEMS} keep-on-reset slots are used. Unkeep another item first.`
      : `Keep on reset: survives "Reset App to Defaults" (${used} of ${MAX_KEPT_ITEMS} used).`;

  if (variant === "icon") {
    return (
      <IconButton
        icon={kept ? ShieldCheck : Shield}
        title={title}
        active={kept}
        disabled={full}
        onClick={() => toggleKeepOnReset(kind, item.id)}
      />
    );
  }

  return (
    <Button
      size="sm"
      variant={kept ? "primary" : "ghost"}
      title={title}
      disabled={full}
      onClick={() => toggleKeepOnReset(kind, item.id)}
    >
      {kept ? <ShieldCheck size={13} /> : <Shield size={13} />}
      {kept ? "Kept on reset" : "Keep on reset"}
    </Button>
  );
}

/** The "KEPT" chip shown on cards, so a kept item reads as kept at a glance. */
export function KeepOnResetBadge({
  item,
}: {
  item: { keepOnReset?: boolean; builtIn?: boolean; deleted?: boolean };
}) {
  const { colors, fonts } = useUITheme();
  if (!item.keepOnReset || !canKeep(item)) return null;
  return (
    <span
      title="Kept: this survives a reset"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "1px 6px",
        borderRadius: 999,
        fontFamily: fonts.ui,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        color: colors.accentSoft,
        background: fade(colors.accent, 0.14),
        border: `1px solid ${fade(colors.accent, 0.3)}`,
      }}
    >
      <ShieldCheck size={10} />
      KEPT
    </span>
  );
}
