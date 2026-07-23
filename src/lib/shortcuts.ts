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
    note: "Numbers are verse-only and follow the order verses appear in the slide list. When presenting scripture, the number is the Bible verse number (Ctrl+1, Ctrl+100…). Every other section type uses a fixed Ctrl+letter shortcut.",
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
      { keys: ["R"], description: "Read passage aloud / stop (scripture)" },
      { keys: ["Esc"], description: "Exit presentation" },
    ],
  },
  {
    title: "Bible Page & Scripture Editor",
    note: "Available while reading on the Bible page, or editing a saved passage.",
    shortcuts: [
      { keys: ["Click"], description: "Select a verse" },
      {
        keys: ["Ctrl", "+", "Click"],
        description: "Extend the selection to a verse",
      },
      {
        keys: ["Shift", "+", "↑ / ↓"],
        description: "Grow / shrink the selection from its active end",
      },
      {
        keys: ["Ctrl", "+", "A"],
        description: "Select / deselect the whole chapter",
      },
      {
        keys: ["Double-click"],
        description: "Present a single verse instantly",
      },
      {
        keys: ["Ctrl", "hold", "verse number", "then release Ctrl"],
        description: "In the scripture editor: present starting at that verse",
      },
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
    title: "Floating Presenter",
    note: "The floating presenter keeps the presentation running in a small draggable window so you can keep using the app. It only takes over the keyboard while it is focused, so click it before using presentation shortcuts, and click away to type normally again.",
    shortcuts: [
      {
        keys: ["Click the window"],
        description: "Arm the presentation shortcuts",
      },
      {
        keys: ["Drag its title bar"],
        description: "Move it anywhere on the page",
      },
      {
        keys: ["Ctrl", "hold", "3", "then release Ctrl"],
        description: "Jump to slide/verse 3 while it is focused",
      },
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
