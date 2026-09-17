import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

interface LibrarySectionProps {
  title: string;
  description?: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
}

export const LibrarySection = ({
  title,
  description,
  meta,
  action,
  children,
}: LibrarySectionProps) => {
  const { colors, fonts } = useUITheme();

  return (
    <section
      style={{
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        background: colors.panel,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "13px 15px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: fonts.ui,
              fontSize: 13.5,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            <span className="ws-ellipsis">{title}</span>
            {meta && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: colors.dim,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {meta}
              </span>
            )}
          </div>
          {description && (
            <p
              style={{
                margin: "3px 0 0",
                fontFamily: fonts.ui,
                fontSize: 12,
                lineHeight: 1.5,
                color: colors.dim,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {action && <div className="ws-row-wrap">{action}</div>}
      </header>
      <div style={{ padding: 15 }}>{children}</div>
    </section>
  );
};
