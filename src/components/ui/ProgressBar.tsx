import { useUITheme } from "../../theme/ThemeProvider";

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const { colors, controls, fonts, fills } = useUITheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginTop: 12 }}>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: fonts.ui,
            fontSize: 12,
            color: colors.sub,
            marginBottom: 6,
          }}
        >
          <span>{label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 99, background: controls.track, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: fills.accentBar,
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}
