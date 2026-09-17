import type { Background, Theme } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { resolveStyle } from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { KeepOnResetBadge } from "../../components/ui/KeepOnResetToggle";
import { THEME_SAMPLE_SLIDE } from "./themeSample";

interface ThemeCardProps {
  theme: Theme;
  background: Background;
  active: boolean;
  attention: boolean;
  onSelect: () => void;
}

export const ThemeCard = ({
  theme,
  background,
  active,
  attention,
  onSelect,
}: ThemeCardProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <button
      onClick={onSelect}
      aria-current={active}
      {...attentionAttribute(theme.id)}
      className={attention ? ATTENTION_CLASS : undefined}
      style={{
        display: "block",
        width: "100%",
        padding: 6,
        borderRadius: 11,
        cursor: "pointer",
        textAlign: "left",
        background: active ? fade(colors.accent, 0.12) : colors.raise,
        border: `1px solid ${active ? fade(colors.accent, 0.4) : colors.border}`,
      }}
    >
      <div style={{ borderRadius: 7, overflow: "hidden" }}>
        <SlideCanvas
          slide={THEME_SAMPLE_SLIDE}
          style={resolveStyle(undefined, undefined, theme)}
          bg={background}
          radius={7}
        />
      </div>
      <div
        style={{
          fontFamily: fonts.ui,
          fontSize: 12.5,
          fontWeight: 600,
          color: active ? colors.accentSoft : colors.text,
          padding: "7px 4px 3px",
        }}
      >
        {theme.name}
        {theme.builtIn && (
          <span style={{ color: colors.dim, fontWeight: 500 }}> · default</span>
        )}
        {theme.keepOnReset && !theme.builtIn && (
          <span style={{ marginLeft: 6, verticalAlign: "middle" }}>
            <KeepOnResetBadge item={theme} />
          </span>
        )}
      </div>
    </button>
  );
};
