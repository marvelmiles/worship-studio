import { Pin, PinOff } from "lucide-react";
import { useStore } from "../../store/useStore";
import {
  MAX_PINNED_ITEMS,
  isPinned,
  pinnedCount,
  type Pinnable,
  type PinnableKind,
} from "../../lib/pinning";
import { IconButton } from "./Button";

interface PinTarget extends Pinnable {
  id: string;
}

interface PinButtonProps {
  kind: PinnableKind;
  item: PinTarget;
  /** Everything competing for the same five slots: the listing being drawn. */
  library: Pinnable[];
  /** Matches the pin to the buttons beside it; "sm" on a library card. */
  size?: "sm" | "md";
}

interface PinState {
  pinned: boolean;
  /** True when every slot in this library is taken and this item isn't in one. */
  full: boolean;
  title: string;
  toggle: () => void;
}

/** One reading of a library's pin budget. */
function usePinState({ kind, item, library }: PinButtonProps): PinState {
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
 * The pin as a control of its own on a library card.
 *
 * The icon carries the state on its own, so the button keeps the same surface
 * whether the item is pinned or not: a pinned item shows the "unpin" glyph, an
 * unpinned one shows the pin. That makes this button the card's only pin
 * indicator, which is why nothing beside the title repeats it.
 */
export function PinButton({
  kind,
  item,
  library,
  size = "sm",
}: PinButtonProps) {
  const state = usePinState({ kind, item, library });
  return (
    <IconButton
      filled
      size={size}
      icon={state.pinned ? PinOff : Pin}
      title={state.title}
      disabled={state.full}
      onClick={state.toggle}
    />
  );
}
