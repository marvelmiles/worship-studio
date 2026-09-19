import type { ReactNode } from "react";
import { useUITheme } from "../../theme/ThemeProvider";

interface EditorSplitLayoutProps {
  /** Below this width the sidebar sits under the preview instead of beside it. */
  stacked: boolean;
  preview: ReactNode;
  sidebar: ReactNode;
}

/** The preview and settings pair every asset editor page is laid out as. */
export const EditorSplitLayout = ({
  stacked,
  preview,
  sidebar,
}: EditorSplitLayoutProps) => {
  const { colors } = useUITheme();

  if (stacked)
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {preview}
        <div style={{ borderTop: `1px solid ${colors.border}` }}>{sidebar}</div>
      </div>
    );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "1fr 340px",
      }}
    >
      <div style={{ overflow: "hidden" }}>{preview}</div>
      <div
        style={{ overflow: "auto", borderLeft: `1px solid ${colors.border}` }}
      >
        {sidebar}
      </div>
    </div>
  );
};
