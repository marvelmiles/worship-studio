import { useUITheme } from "../../../theme/ThemeProvider";

interface GreetingHeaderProps {
  label: string;
  heading: string;
  tag: string;
}

export function GreetingHeader({ label, heading, tag }: GreetingHeaderProps) {
  const { colors, fonts } = useUITheme();
  const UI = fonts.ui;
  const DISPLAY = fonts.display;

  return (
    <div style={{ marginBottom: 26 }}>
      <p
        style={{
          margin: 0,
          color: colors.accent,
          fontFamily: UI,
          fontWeight: 600,
          letterSpacing: 1.2,
          fontSize: 13,
        }}
      >
        {label}
      </p>
      <h1
        style={{
          margin: "6px 0 0",
          fontFamily: DISPLAY,
          fontSize: "clamp(28px,5.5vw,44px)",
          fontWeight: 600,
          color: colors.text,
          letterSpacing: -0.5,
        }}
      >
        {heading}
      </h1>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: UI,
          fontSize: 14.5,
          color: colors.sub,
        }}
      >
        {tag}
      </p>
    </div>
  );
}
