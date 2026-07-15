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
    note: "Numbers are verse-only and follow the order verses appear in the slide list. Every other section type uses a fixed Ctrl+letter shortcut.",
    shortcuts: [
      {
        keys: ["Ctrl", "hold", "1 – 9…", "then release Ctrl"],
        description: "Jump to Verse N",
      },
      {
        keys: ["Ctrl", "+", "C"],
        description: "Jump to first Chorus slide",
      },
      {
        keys: ["Ctrl", "+", "B"],
        description: "Jump to first Bridge slide",
      },
      {
        keys: ["Ctrl", "+", "I"],
        description: "Jump to first Intro slide",
      },
      {
        keys: ["Ctrl", "+", "O"],
        description: "Jump to first Outro slide",
      },
      {
        keys: ["Ctrl", "+", "P"],
        description: "Jump to first Pre-Chorus slide",
      },
      {
        keys: ["Ctrl", "+", "R"],
        description: "Jump to first Refrain slide",
      },
      {
        keys: ["Ctrl", "+", "T"],
        description: "Jump to first Tag slide",
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
    title: "Video",
    note: "Available while a video is on the stage.",
    shortcuts: [
      { keys: ["Space"], description: "Play / pause the video" },
      { keys: ["→"], description: "Seek forward 5s" },
      { keys: ["←"], description: "Seek back 5s" },
      { keys: ["M"], description: "Mute / unmute" },
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
