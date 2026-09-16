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
  library: Pinnable[];
  size?: "sm" | "md";
}

interface PinState {
  pinned: boolean;
  full: boolean;
  title: string;
  toggle: () => void;
}

const usePinState = ({ kind, item, library }: PinButtonProps): PinState => {
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
};

export const PinButton = ({
  kind,
  item,
  library,
  size = "sm",
}: PinButtonProps) => {
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
};
