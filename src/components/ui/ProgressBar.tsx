import { C, UI } from "../../theme/tokens";

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ marginTop: 12 }}>
      {label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: UI,
            fontSize: 12,
            color: C.sub,
            marginBottom: 6,
          }}
        >
          <span>{label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: `linear-gradient(90deg,${C.gold},${C.goldSoft})`,
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}
