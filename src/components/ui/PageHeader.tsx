import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";
import { InfoTip } from "./InfoTip";

interface PageHeaderProps {
  title: string;
  /** What the page is for, offered from an info button beside the title. */
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { colors, fonts } = useUITheme();
  return (
    <div className="ws-page-head">
      <div
        style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: "clamp(22px,4vw,30px)",
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <InfoTip title={title} size={16}>
            {subtitle}
          </InfoTip>
        )}
      </div>
      {actions && <div className="ws-row-wrap">{actions}</div>}
    </div>
  );
}
