export interface Shortcut {
  keys: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
  note?: string;
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["→", "Space", "Page Dn", "L"], description: "Next slide" },
      { keys: ["←", "Page Up", "H"], description: "Previous slide" },
      { keys: ["Home"], description: "First slide" },
      { keys: ["End"], description: "Last slide" },
    ],
  },
  {
    title: "Tag Navigation",
    note: "Numbers are assigned in the order each section type first appears in the slide list. Reordering slides changes the numbers dynamically.",
    shortcuts: [
      {
        keys: ["Ctrl", "hold", "1 – 9…", "then release Ctrl"],
        description: "Jump to first slide of tag group N (dynamic)",
      },
      {
        keys: ["Ctrl", "+", "C"],
        description: "Jump to first Chorus slide (fixed shortcut)",
      },
    ],
  },
  {
    title: "Playback",
    shortcuts: [
      { keys: ["P"], description: "Pause / resume" },
      { keys: ["Esc"], description: "Exit presentation" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      { keys: ["F"], description: "Toggle fullscreen" },
      { keys: ["I"], description: "Toggle presenter bar" },
      { keys: ["V"], description: "Cycle screen fit (normal / cover / fill)" },
      { keys: ["+"], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
      { keys: ["0"], description: "Reset zoom" },
    ],
  },
];
