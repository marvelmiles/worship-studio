import { FIXED_TAG_SHORTCUTS } from "./tagGroups";
import { INLINE_FORMATS, INLINE_FORMAT_NAMES } from "./textFormatting";

export interface Shortcut {
  keys: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
  note?: string;
}

export type EditorCommand =
  "save" | "updatePresentation" | "goLive" | "preview";

export interface EditorCommandDefinition {
  key: string;
  shift: boolean;
  keys: string[];
  hint: string;
  description: string;
}

export const EDITOR_COMMANDS: Record<EditorCommand, EditorCommandDefinition> = {
  save: {
    key: "s",
    shift: false,
    keys: ["Ctrl", "+", "S"],
    hint: "Ctrl+S",
    description: "Save changes",
  },
  updatePresentation: {
    key: "u",
    shift: true,
    keys: ["Ctrl", "+", "Shift", "+", "U"],
    hint: "Ctrl+Shift+U",
    description: "Push this document to the running presentation",
  },
  goLive: {
    key: "enter",
    shift: true,
    keys: ["Ctrl", "+", "Shift", "+", "Enter"],
    hint: "Ctrl+Shift+Enter",
    description: "Go live: project it and keep the floating presenter",
  },
  preview: {
    key: "enter",
    shift: false,
    keys: ["Ctrl", "+", "Enter"],
    hint: "Ctrl+Enter",
    description: "Preview here: present on this screen only",
  },
};

const EDITOR_COMMAND_NAMES = Object.keys(EDITOR_COMMANDS) as EditorCommand[];

export const matchEditorCommand = (
  event: KeyboardEvent,
): EditorCommand | null => {
  if (event.altKey) return null;
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase();
  return (
    EDITOR_COMMAND_NAMES.find((name) => {
      const command = EDITOR_COMMANDS[name];
      return command.key === key && command.shift === event.shiftKey;
    }) ?? null
  );
};

const editorCommandShortcut = (name: EditorCommand): Shortcut => ({
  keys: EDITOR_COMMANDS[name].keys,
  description: EDITOR_COMMANDS[name].description,
});

const inlineFormatShortcuts: Shortcut[] = INLINE_FORMAT_NAMES.map((name) => ({
  keys: ["Ctrl", "+", INLINE_FORMATS[name].shortcutKey.toUpperCase()],
  description: INLINE_FORMATS[name].label,
}));

const tagShortcuts: Shortcut[] = FIXED_TAG_SHORTCUTS.map((tag) => ({
  keys: ["Ctrl", "+", tag.letter.toUpperCase()],
  description: `Jump to first ${tag.label} slide`,
}));

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Editors",
    note: "Available in the manuscript, scripture, image, video, sound and theme editors. Undo, redo and the present commands only appear where they apply, and Update presentation only acts while that document is the one being presented.",
    shortcuts: [
      editorCommandShortcut("save"),
      editorCommandShortcut("updatePresentation"),
      editorCommandShortcut("goLive"),
      editorCommandShortcut("preview"),
      { keys: ["Ctrl", "+", "Z"], description: "Undo the last change" },
      {
        keys: ["Ctrl", "+", "Y"],
        description: "Redo (Ctrl+Shift+Z works too)",
      },
    ],
  },
  {
    title: "Live Window",
    note: "The window Go Live opens on the audience screen. It asks for fullscreen by itself once it lands on the projector; when the browser refuses that, these keys fill the screen. The fullscreen arrow at its top right corner does the same.",
    shortcuts: [
      {
        keys: ["F11"],
        description:
          "Fill the external screen, pressed right after Go Live while that window has focus",
      },
      {
        keys: ["F"],
        description: "Toggle fullscreen from inside the live window",
      },
      { keys: ["Esc"], description: "Leave fullscreen" },
    ],
  },
  {
    title: "Writing",
    note: "Available while writing on a slide, whether in its body text or in a text box placed on it. One undo step covers everything the editor holds: typing, formatting, slide changes and picture or clip settings alike.",
    shortcuts: [
      ...inlineFormatShortcuts,
      { keys: ["Tab"], description: "Indent the list item being written" },
      { keys: ["Shift", "+", "Tab"], description: "Outdent it again" },
      { keys: ["Enter"], description: "Continue the list on a new line" },
    ],
  },
  {
    title: "Placed Elements",
    note: "Available while a picture, clip or text box on the slide is selected in the editor.",
    shortcuts: [
      { keys: ["← ↑ → ↓"], description: "Nudge it across the slide" },
      { keys: ["Shift", "+", "← ↑ → ↓"], description: "Nudge it further" },
      { keys: ["Delete"], description: "Remove it from the slide" },
      { keys: ["Esc"], description: "Deselect it" },
    ],
  },
  {
    title: "Navigation",
    note: "Available while presenting.",
    shortcuts: [
      { keys: ["→", "Page Dn", "L"], description: "Next slide" },
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
      ...tagShortcuts,
    ],
  },
  {
    title: "Playback",
    note: "Available while presenting, both on the stage and in the focused floating presenter.",
    shortcuts: [
      {
        keys: ["Space", "P"],
        description:
          "Pause / resume the slides, their transitions and any clip",
      },
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
      { keys: ["Enter"], description: "Jump to the reference being typed" },
    ],
  },
  {
    title: "Video",
    note: "Available while a video is on the stage. Space also plays and pauses the preview in the video and audio editors.",
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
    note: "Available while presenting.",
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
