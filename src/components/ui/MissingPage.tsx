import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

interface MissingPageProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

/** What a page shows when the thing it was opened for is no longer there. */
export const MissingPage = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: MissingPageProps) => (
  <div
    style={{
      height: "100%",
      display: "grid",
      placeItems: "center",
      padding: 24,
    }}
  >
    <EmptyState
      icon={icon}
      title={title}
      message={message}
      action={
        <Button variant="primary" onClick={onAction}>
          <ArrowLeft size={15} />
          {actionLabel}
        </Button>
      }
    />
  </div>
);
