import type { ReactNode } from "react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Spinner } from "../../../components/ui/Spinner";

interface StreamStatusLineProps {
  children: ReactNode;
  tone?: "neutral" | "danger";
  isBusy?: boolean;
}

export const StreamStatusLine = ({
  children,
  tone = "neutral",
  isBusy = false,
}: StreamStatusLineProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        fontFamily: fonts.ui,
        fontSize: 13,
        color: tone === "danger" ? colors.danger : colors.sub,
      }}
    >
      {isBusy && <Spinner size={14} />}
      {children}
    </div>
  );
};
