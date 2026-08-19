import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

interface CardOpenProps {
  role?: "button";
  tabIndex?: number;
  "aria-label"?: string;
  onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
}

/**
 * Makes a whole library card the target that opens its editor, keyboard
 * included, rather than only the thumbnail. Pass no handler (a trashed record,
 * say) and the card is left inert.
 *
 * Anything else the card can do lives inside `CardActions`, which keeps its own
 * clicks and keys to itself so pressing Present never also opens the editor.
 */
export function cardOpenProps(
  label: string,
  onOpen?: () => void,
): CardOpenProps {
  if (!onOpen) return {};
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": `Open ${label}`,
    onClick: onOpen,
    onKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onOpen();
    },
    style: { cursor: "pointer" },
  };
}

/** The row of controls on a card, isolated from the card's own activation. */
export function CardActions({ children }: { children: ReactNode }) {
  return (
    <div
      className="ws-card-actions"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}
