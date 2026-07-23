import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;
  return (
    <div className="ws-page-head">
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: DISPLAY,
            fontSize: "clamp(22px,4vw,30px)",
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: UI,
              fontSize: 13,
              color: colors.sub,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="ws-row-wrap">{actions}</div>}
    </div>
  );
}
