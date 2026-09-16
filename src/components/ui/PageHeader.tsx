import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div className="ws-page-head">
      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
        <h1
          className="ws-ellipsis"
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: "clamp(22px,4vw,30px)",
            fontWeight: 600,
            lineHeight: 1.2,
            color: colors.text,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="ws-ellipsis"
            title={subtitle}
            style={{
              margin: "4px 0 0",
              fontFamily: fonts.ui,
              fontSize: 13.5,
              lineHeight: 1.4,
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
};
