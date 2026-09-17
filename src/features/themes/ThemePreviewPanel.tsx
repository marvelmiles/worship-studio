import type { Background, Theme } from "../../types";
import { resolveStyle } from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { useUITheme } from "../../theme/ThemeProvider";
import { THEME_SAMPLE_SLIDE } from "./themeSample";

interface ThemePreviewPanelProps {
  theme: Theme;
  background: Background;
}

export const ThemePreviewPanel = ({
  theme,
  background,
}: ThemePreviewPanelProps) => {
  const { colors, fonts } = useUITheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 24,
        background:
          "radial-gradient(circle at 50% 0%,rgba(255,255,255,0.02),transparent 60%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "auto",
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
          borderRadius: 14,
        }}
      >
        <SlideCanvas
          slide={THEME_SAMPLE_SLIDE}
          style={resolveStyle(undefined, undefined, theme)}
          bg={background}
          radius={14}
          playBackground
        />
      </div>

      <div
        style={{
          maxWidth: 820,
          margin: "18px auto 0",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: colors.sub,
          textAlign: "center",
        }}
      >
        A sample slide, so you can see the theme as the congregation will.
      </div>
    </div>
  );
};
