import { Pin, PinOff } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import {
  MAX_PINNED_ITEMS,
  isPinned,
  pinnedCount,
  type Pinnable,
  type PinnableKind,
} from "../../lib/pinning";
import type { MoreMenuItem } from "./MoreMenu";

interface PinTarget extends Pinnable {
  id: string;
}

/**
 * The pin entry for a card's overflow menu. `library` is everything competing
 * for the same five slots, which the caller already has to hand: the listing it
 * is drawing.
 */
export function usePinAction(
  kind: PinnableKind,
  item: PinTarget,
  library: Pinnable[],
): MoreMenuItem {
  const togglePin = useStore((s) => s.togglePin);
  const pinned = isPinned(item);
  const used = pinnedCount(library);
  const full = !pinned && used >= MAX_PINNED_ITEMS;

  return {
    label: pinned ? "Unpin" : "Pin to top",
    icon: pinned ? PinOff : Pin,
    active: pinned,
    disabled: full,
    title: pinned
      ? "Pinned to the top of this library. Click to unpin."
      : full
        ? `All ${MAX_PINNED_ITEMS} pins are used here. Unpin another item first.`
        : `Hold this at the top of the library (${used} of ${MAX_PINNED_ITEMS} pinned).`,
    onClick: () => togglePin(kind, item.id),
  };
}

/** The chip on a card, so a pinned item reads as pinned at a glance. */
export function PinBadge({ item }: { item: Pinnable }) {
  const { colors, fonts } = useUITheme();
  if (!isPinned(item)) return null;
  return (
    <span
      title="Pinned to the top of this library"
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
        flexShrink: 0,
      }}
    >
      <Pin size={10} />
      PINNED
    </span>
  );
}
