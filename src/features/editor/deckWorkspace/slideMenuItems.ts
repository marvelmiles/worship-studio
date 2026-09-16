import {
  ArrowDown,
  ArrowUp,
  Copy,
  CornerDownRight,
  Scissors,
  Trash2,
} from "lucide-react";
import type { MenuItem } from "../../../components/ui/ContextMenu";
import type { DeckEditor } from "../useDeckEditor";

export const slideMenuItems = (
  editor: DeckEditor,
  index: number,
): MenuItem[] => [
  { label: "Move up", icon: ArrowUp, fn: () => editor.moveSlide(index, -1) },
  { label: "Move down", icon: ArrowDown, fn: () => editor.moveSlide(index, 1) },
  { divider: true },
  { label: "Duplicate", icon: Copy, fn: () => editor.duplicateSlide(index) },
  {
    label: "Insert after",
    icon: CornerDownRight,
    fn: () => editor.insertSlideAt(index + 1),
  },
  { label: "Split", icon: Scissors, fn: () => editor.splitSlide(index) },
  { divider: true },
  {
    label: "Delete",
    icon: Trash2,
    danger: true,
    fn: () => editor.removeSlide(index),
  },
];
