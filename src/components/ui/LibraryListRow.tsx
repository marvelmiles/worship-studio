import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { CardActions, cardOpenProps } from "./InteractiveCard";

interface LibraryListRowProps {
  /** The picture, clip or slide that stands for this item. */
  cover: ReactNode;
  title: string;
  badges?: ReactNode;
  /** Short facts about the item, wrapped onto as many lines as they need. */
  details: string[];
  actions: ReactNode;
  onOpen: () => void;
}

/**
 * One item as a row: the same cover as its card, with the details a grid of
 * cards has no room for.
 */
export const LibraryListRow = ({
  cover,
  title,
  badges,
  details,
  actions,
  onOpen,
}: LibraryListRowProps) => {
  const { colors } = useUITheme();
  return (
    <div className="ws-glass ws-list-row" {...cardOpenProps(title, onOpen)}>
      <div className="ws-list-cover">{cover}</div>
      <div className="ws-list-main">
        <div className="ws-card-title">
          <span className="ws-ellipsis">{title}</span>
          {badges}
        </div>
        <div className="ws-list-details">
          {details.map((detail) => (
            <span key={detail} style={{ color: colors.sub }}>
              {detail}
            </span>
          ))}
        </div>
      </div>
      <CardActions>{actions}</CardActions>
    </div>
  );
};
