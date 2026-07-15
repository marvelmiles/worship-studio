import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { C, UI, glass } from "../../theme/tokens";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div style={{ ...glass, padding: 60, textAlign: "center" }}>
      <Icon size={36} color={C.dim} style={{ margin: "0 auto 14px" }} />
      <p style={{ fontFamily: UI, color: C.sub, margin: 0 }}>{message}</p>
      {action && <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>{action}</div>}
    </div>
  );
}
