import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

interface CardOpenProps {
  role?: "button";
  tabIndex?: number;
  "aria-label"?: string;
  onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
}

export const cardOpenProps = (
  label: string,
  onOpen?: () => void,
): CardOpenProps => {
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
};

export const CardActions = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className="ws-card-actions"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
};
