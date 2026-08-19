import type {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { colors, UI } from "../../theme/tokens";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";

/** Module-level so feature panels can compose it into their own inputs.
 *  Reads the active theme's primitives via the tokens compat layer. */
export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  background: "rgba(0,0,0,0.28)",
  border: `1px solid ${colors.border}`,
  color: colors.text,
  fontFamily: UI,
  fontSize: 14,
  outline: "none",
};

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { colors: c, fonts } = useUITheme();
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <span
        style={{
          display: "block",
          fontFamily: fonts.ui,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: c.dim,
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
  const { colors: c } = useUITheme();
  const { style, onFocus, onBlur, ...rest } = props;
  return (
    <input
      {...rest}
      style={{ ...inputStyle, ...(style || {}) }}
      onFocus={(e) => {
        e.target.style.borderColor = c.borderStrong;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = c.border;
        onBlur?.(e);
      }}
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
  const { colors: c } = useUITheme();
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
          <option key={val} value={val} style={{ background: c.panelSolid }}>
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

export function Range({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: RangeProps) {
  const { colors: c, controls, fonts } = useUITheme();
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        className="ws-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        style={{
          flex: 1,
          background: `linear-gradient(90deg, ${c.accent} 0%, ${c.accentSoft} ${pct}%, ${controls.track} ${pct}%)`,
        }}
      />
      <span
        style={{
          width: 52,
          textAlign: "right",
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: c.sub,
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
  const { colors: c, controls } = useUITheme();
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
      <span style={{ fontFamily: UI, fontSize: 13.5, color: c.text }}>
        {label}
      </span>
      <div
        style={{
          width: 40,
          height: 23,
          borderRadius: 999,
          padding: 2,
          background: checked ? c.accent : controls.toggleOff,
          boxShadow: checked ? `0 2px 12px ${fade(c.accent, 0.45)}` : "none",
          transition: "all .18s",
        }}
      >
        <div
          style={{
            width: 19,
            height: 19,
            borderRadius: 999,
            background: controls.thumb,
            transform: checked ? "translateX(17px)" : "translateX(0)",
            transition: "all .18s",
          }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { colors: c, fonts } = useUITheme();
  return (
    <div
      style={{
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: c.accent,
        margin: "26px 0 14px",
        paddingBottom: 9,
        borderBottom: `1px solid ${c.border}`,
      }}
    >
      {children}
    </div>
  );
}
