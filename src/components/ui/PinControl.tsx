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

interface PinControlProps {
  kind: PinnableKind;
  item: PinTarget;
  /** Everything competing for the same five slots: the listing being drawn. */
  library: Pinnable[];
}

interface PinState {
  pinned: boolean;
  /** True when every slot in this library is taken and this item isn't in one. */
  full: boolean;
  title: string;
  toggle: () => void;
}

/** One reading of a library's pin budget, shared by every control below. */
function usePinState({ kind, item, library }: PinControlProps): PinState {
  const togglePin = useStore((s) => s.togglePin);
  const pinned = isPinned(item);
  const used = pinnedCount(library);

  return {
    pinned,
    full: !pinned && used >= MAX_PINNED_ITEMS,
    title: pinned
      ? "Pinned to the top of this library. Click to unpin."
      : used >= MAX_PINNED_ITEMS
        ? `All ${MAX_PINNED_ITEMS} pins are used here. Unpin another item first.`
        : `Hold this at the top of the library (${used} of ${MAX_PINNED_ITEMS} pinned).`,
    toggle: () => togglePin(kind, item.id),
  };
}

/**
 * The same toggle as an entry in a card's overflow menu. Its icon and label
 * carry the current state, so the row needs no highlight of its own.
 */
export function usePinAction(
  kind: PinnableKind,
  item: PinTarget,
  library: Pinnable[],
): MoreMenuItem {
  const state = usePinState({ kind, item, library });
  return {
    label: state.pinned ? "Unpin" : "Pin to top",
    icon: state.pinned ? PinOff : Pin,
    disabled: state.full,
    title: state.title,
    onClick: state.toggle,
  };
}

/** The chip on a card, so a pinned item reads as pinned at a glance. */
export function PinBadge({ item }: { item: Pinnable }) {
  const { colors } = useUITheme();
  if (!isPinned(item)) return null;
  return (
    <span
      title="Pinned to the top of this library"
      aria-label="Pinned"
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
      <Pin size={10} />
    </span>
  );
}
