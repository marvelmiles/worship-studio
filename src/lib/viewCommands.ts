export type ViewCommand = "popOut" | "fullscreen";

export interface ViewCommandDefinition {
  /** The bare key, lowercased, that toggles the command. */
  key: string;
  keys: string[];
  hint: string;
  description: string;
}

export const VIEW_COMMANDS: Record<ViewCommand, ViewCommandDefinition> = {
  popOut: {
    key: "o",
    keys: ["O"],
    hint: "O",
    description:
      "Pop out to the floating window, or send it back to the full view",
  },
  fullscreen: {
    key: "f",
    keys: ["F"],
    hint: "F",
    description: "Fill the screen, or leave fullscreen",
  },
};

const VIEW_COMMAND_NAMES = Object.keys(VIEW_COMMANDS) as ViewCommand[];

export const viewCommandTitle = (label: string, command: ViewCommand): string =>
  `${label} (${VIEW_COMMANDS[command].hint})`;

export const matchViewCommand = (event: KeyboardEvent): ViewCommand | null => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  return (
    VIEW_COMMAND_NAMES.find((name) => VIEW_COMMANDS[name].key === key) ?? null
  );
};
