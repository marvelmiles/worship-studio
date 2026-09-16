import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { InfoTip } from "../../../components/ui/InfoTip";

interface StreamCardProps {
  children: ReactNode;
  style?: CSSProperties;
}

export const StreamCard = ({ children, style }: StreamCardProps) => {
  const { colors } = useUITheme();
  return (
    <div
      style={{
        background: colors.raise,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface StreamCardTitleProps {
  title: string;
  icon?: LucideIcon;
  info?: ReactNode;
  trailing?: ReactNode;
  centered?: boolean;
}

export const StreamCardTitle = ({
  title,
  icon: Icon,
  info,
  trailing,
  centered = false,
}: StreamCardTitleProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered
          ? "center"
          : trailing
            ? "space-between"
            : "flex-start",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: fonts.display,
          fontSize: 16,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {Icon && <Icon size={17} color={colors.accentSoft} />}
        {title}
        {info && (
          <InfoTip title={title} align={centered ? "center" : "start"}>
            {info}
          </InfoTip>
        )}
      </span>
      {trailing}
    </div>
  );
};
