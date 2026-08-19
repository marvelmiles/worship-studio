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
import type { MoreMenuItem } from "./MoreMenu";

interface KeepableItem {
  id: string;
  keepOnReset?: boolean;
  builtIn?: boolean;
  deleted?: boolean;
}

interface KeepOnResetState {
  /** False for items that can't hold a slot at all. */
  available: boolean;
  kept: boolean;
  /** True when every slot is taken and this item isn't in one. */
  full: boolean;
  title: string;
  toggle: () => void;
}

/** One reading of the keep-on-reset budget, shared by every control below. */
function useKeepOnResetState(
  kind: KeepableKind,
  item: KeepableItem,
): KeepOnResetState {
  const manuscripts = useStore((s) => s.manuscripts);
  const themes = useStore((s) => s.themes);
  const toggleKeepOnReset = useStore((s) => s.toggleKeepOnReset);

  const kept = Boolean(item.keepOnReset);
  const used = keptCount(manuscripts, themes);
  const full = !kept && used >= MAX_KEPT_ITEMS;

  return {
    available: canKeep(item),
    kept,
    full,
    title: kept
      ? "Kept: survives a reset. Click to stop keeping it."
      : full
        ? `All ${MAX_KEPT_ITEMS} keep-on-reset slots are used. Unkeep another item first.`
        : `Keep on reset: survives "Reset App to Defaults" (${used} of ${MAX_KEPT_ITEMS} used).`,
    toggle: () => toggleKeepOnReset(kind, item.id),
  };
}

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
  item: KeepableItem;
  /** "icon" for dense card rows, "button" for a labelled control in a panel. */
  variant?: "icon" | "button";
}) {
  const state = useKeepOnResetState(kind, item);
  if (!state.available) return null;

  if (variant === "icon") {
    return (
      <IconButton
        icon={state.kept ? ShieldCheck : Shield}
        title={state.title}
        active={state.kept}
        disabled={state.full}
        onClick={state.toggle}
      />
    );
  }

  return (
    <Button
      size="sm"
      variant={state.kept ? "primary" : "ghost"}
      title={state.title}
      disabled={state.full}
      onClick={state.toggle}
    >
      {state.kept ? <ShieldCheck size={13} /> : <Shield size={13} />}
      {state.kept ? "Kept on reset" : "Keep on reset"}
    </Button>
  );
}

/**
 * The same control as an entry in a card's overflow menu. Its icon and label
 * carry the current state, so the row needs no highlight of its own.
 */
export function useKeepOnResetAction(
  kind: KeepableKind,
  item: KeepableItem,
): MoreMenuItem | null {
  const state = useKeepOnResetState(kind, item);
  if (!state.available) return null;
  return {
    label: state.kept ? "Stop keeping on reset" : "Keep on reset",
    icon: state.kept ? ShieldCheck : Shield,
    disabled: state.full,
    title: state.title,
    onClick: state.toggle,
  };
}

/** The chip shown on cards, so a kept item reads as kept at a glance. */
export function KeepOnResetBadge({
  item,
}: {
  item: { keepOnReset?: boolean; builtIn?: boolean; deleted?: boolean };
}) {
  const { colors } = useUITheme();
  if (!item.keepOnReset || !canKeep(item)) return null;
  return (
    <span
      title="Kept: this survives a reset"
      aria-label="Kept on reset"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: 999,
        color: colors.accentSoft,
        background: fade(colors.accent, 0.14),
        border: `1px solid ${fade(colors.accent, 0.3)}`,
        flexShrink: 0,
      }}
    >
      <ShieldCheck size={10} />
    </span>
  );
}
