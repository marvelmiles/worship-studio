export interface Shortcut {
  keys: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
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
