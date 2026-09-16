import type { ReactNode } from "react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { StreamCard } from "../components/StreamCard";

interface PairingStepProps {
  stepNumber: number;
  title: string;
  children: ReactNode;
}

export const PairingStep = ({
  stepNumber,
  title,
  children,
}: PairingStepProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <StreamCard>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: colors.accent,
            color: colors.onAccent,
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          {stepNumber}
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </StreamCard>
  );
};
