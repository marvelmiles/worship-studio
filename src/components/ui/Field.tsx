import type {
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { themeVar } from "../../theme/cssVars";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  background: "rgba(0,0,0,0.28)",
  border: `1px solid ${themeVar.border}`,
  color: themeVar.text,
  fontFamily: themeVar.fontUi,
  fontSize: 14,
  outline: "none",
};

interface FieldProps {
  label: string;
  info?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export const Field = ({ label, info, error, children }: FieldProps) => {
  const { colors, fonts } = useUITheme();
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
          color: error ? colors.danger : colors.dim,
          marginBottom: 6,
          ...(info ? { display: "flex", alignItems: "center", gap: 4 } : {}),
        }}
      >
        {label}
        {info}
      </span>
      {children}
      {error && (
        <span
          role="alert"
          style={{
            display: "block",
            marginTop: 6,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: colors.danger,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {error}
        </span>
      )}
    </label>
  );
};

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = (props: TextInputProps) => {
  const { colors } = useUITheme();
  const { style, onFocus, onBlur, invalid, ...rest } = props;
  const resting = invalid ? colors.danger : colors.border;
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      style={{
        ...inputStyle,
        ...(invalid ? { borderColor: colors.danger } : {}),
        ...(style || {}),
      }}
      onFocus={(e) => {
        e.target.style.borderColor = invalid
          ? colors.danger
          : colors.borderStrong;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        e.target.style.borderColor = resting;
        onBlur?.(e);
      }}
    />
  );
};

export type Option = string | { value: string; label: string };

interface SelectProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  style?: CSSProperties;
  "aria-label"?: string;
}

export const Select = ({
  value,
  onChange,
  options,
  style: st,
  "aria-label": ariaLabel,
}: SelectProps) => {
  const { colors } = useUITheme();
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      style={{ ...inputStyle, appearance: "none", cursor: "pointer", ...st }}
    >
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option
            key={val}
            value={val}
            style={{ background: colors.panelSolid }}
          >
            {label}
          </option>
        );
      })}
    </select>
  );
};

interface RangeProps {
  value: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export const Range = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: RangeProps) => {
  const { colors, controls, fonts } = useUITheme();
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
          background: `linear-gradient(90deg, ${colors.accent} 0%, ${colors.accentSoft} ${pct}%, ${controls.track} ${pct}%)`,
        }}
      />
      <span
        style={{
          width: 52,
          textAlign: "right",
          fontFamily: fonts.ui,
          fontSize: 12.5,
          color: colors.sub,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {suffix}
      </span>
    </div>
  );
};

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => {
  const { colors, controls, fonts } = useUITheme();
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
      <span
        style={{ fontFamily: fonts.ui, fontSize: 13.5, color: colors.text }}
      >
        {label}
      </span>
      <div
        style={{
          width: 40,
          height: 23,
          borderRadius: 999,
          padding: 2,
          background: checked ? colors.accent : controls.toggleOff,
          boxShadow: checked
            ? `0 2px 12px ${fade(colors.accent, 0.45)}`
            : "none",
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
};

interface SectionTitleProps {
  children: ReactNode;
  info?: ReactNode;
}

export const SectionTitle = ({ children, info }: SectionTitleProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: colors.accent,
        margin: "26px 0 14px",
        paddingBottom: 9,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      {children}
      {info}
    </div>
  );
};
