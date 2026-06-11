import type {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { C, UI } from "../../theme/tokens";

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  background: "rgba(0,0,0,0.28)",
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: UI,
  fontSize: 14,
  outline: "none",
};

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <span
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: C.dim,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput(props: TextInputProps) {
  const { style, ...rest } = props;
  return (
    <input
      {...rest}
      style={{ ...inputStyle, ...(style || {}) }}
      onFocus={(e) => (e.target.style.borderColor = C.borderStrong)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  );
}

export type Option = string | { value: string; label: string };

interface SelectProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  style?: CSSProperties;
}

export function Select({ value, onChange, options, style: st }: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer", ...st }}
    >
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option key={val} value={val} style={{ background: C.panelSolid }}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

interface RangeProps {
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function Range({ value, onChange, min, max, step = 1, suffix = "" }: RangeProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{ flex: 1, accentColor: C.gold }}
      />
      <span
        style={{
          width: 52,
          textAlign: "right",
          fontFamily: UI,
          fontSize: 12.5,
          color: C.sub,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {suffix}
      </span>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        padding: "4px 0",
      }}
    >
      <span style={{ fontFamily: UI, fontSize: 13.5, color: C.text }}>{label}</span>
      <div
        style={{
          width: 40,
          height: 23,
          borderRadius: 999,
          padding: 2,
          background: checked ? C.gold : "rgba(255,255,255,0.13)",
          transition: "all .18s",
        }}
      >
        <div
          style={{
            width: 19,
            height: 19,
            borderRadius: 999,
            background: "#fff",
            transform: checked ? "translateX(17px)" : "translateX(0)",
            transition: "all .18s",
          }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: UI,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: C.gold,
        margin: "26px 0 14px",
        paddingBottom: 9,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {children}
    </div>
  );
}
