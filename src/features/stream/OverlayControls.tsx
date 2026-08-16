import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { inputStyle } from "../../components/ui/Field";

/**
 * The small controls the broadcast overlay settings are built from.
 *
 * They are deliberately their own set rather than the library's Field/Range
 * pair: the overlay settings live in a 330px drawer beside a running camera,
 * where the app's form spacing would push the controls an operator needs mid
 * service below the fold. Everything here is one line tall wherever it can be,
 * and reads the active theme so it stays in step with the rest of the app.
 */

export function OverlaySectionLabel({ children }: { children: string }) {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        fontFamily: fonts.ui,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: colors.dim,
        marginBottom: 7,
      }}
    >
      {children}
    </div>
  );
}

function ControlLabel({ children }: { children: ReactNode }) {
  const { colors, fonts } = useUITheme();
  return (
    <span
      style={{
        fontFamily: fonts.ui,
        fontSize: 12,
        fontWeight: 600,
        color: colors.sub,
      }}
    >
      {children}
    </span>
  );
}

export function OverlaySlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const { colors } = useUITheme();
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <ControlLabel>{label}</ControlLabel>
        {suffix !== undefined && (
          <ControlLabel>
            <span style={{ color: colors.dim }}>{`${value}${suffix}`}</span>
          </ControlLabel>
        )}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", accentColor: colors.accent }}
      />
    </label>
  );
}

export function OverlaySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { colors } = useUITheme();
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", marginBottom: 4 }}>
        <ControlLabel>{label}</ControlLabel>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          ...inputStyle,
          padding: "7px 10px",
          fontSize: 12.5,
          appearance: "none",
          cursor: "pointer",
        }}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={{ background: colors.panelSolid }}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * A checkbox that says what it does when it is on, not just what it is called.
 * Every switch in this panel changes what a room full of people is looking at,
 * so the consequence is spelled out rather than left to the label.
 */
export function OverlayCheckbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "relative",
          flexShrink: 0,
          width: 17,
          height: 17,
          marginTop: 1,
          borderRadius: 5,
          display: "grid",
          placeItems: "center",
          background: checked ? colors.accent : "transparent",
          border: `1px solid ${checked ? colors.accent : colors.borderStrong}`,
          color: colors.onAccent,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          style={{
            position: "absolute",
            opacity: 0,
            width: 0,
            height: 0,
          }}
        />
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {label}
        </span>
        {hint && (
          <span
            style={{
              display: "block",
              fontFamily: fonts.ui,
              fontSize: 11.5,
              lineHeight: 1.45,
              color: colors.dim,
              marginTop: 2,
            }}
          >
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

const swatchButton = (border: string): CSSProperties => ({
  width: 30,
  height: 30,
  flexShrink: 0,
  padding: 0,
  borderRadius: 8,
  cursor: "pointer",
  border: `1px solid ${border}`,
  overflow: "hidden",
});

/**
 * Any CSS background as one control: a picker for the common case, and the raw
 * value beside it so translucency and gradients — which a colour picker cannot
 * express and which are exactly what keeps a panel readable over a moving
 * camera — stay reachable.
 */
export function OverlayColorField({
  label,
  value,
  onChange,
  clearLabel = "Transparent",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  clearLabel?: string;
}) {
  const { colors } = useUITheme();
  // A colour input only understands #rrggbb; anything richer keeps its own
  // value and is edited as text.
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div>
      <span style={{ display: "block", marginBottom: 4 }}>
        <ControlLabel>{label}</ControlLabel>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <input
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} colour`}
          style={{ ...swatchButton(colors.border), background: "transparent" }}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={clearLabel}
          aria-label={`${label} value`}
          style={{ ...inputStyle, padding: "7px 10px", fontSize: 12 }}
        />
        {value !== "" && (
          <button
            type="button"
            title={clearLabel}
            aria-label={clearLabel}
            onClick={() => onChange("")}
            style={{
              ...swatchButton("transparent"),
              display: "grid",
              placeItems: "center",
              background: "transparent",
              color: colors.dim,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Names the chosen picture, or offers to choose one. */
export function OverlayImageField({
  label,
  pictureName,
  onChoose,
  onClear,
}: {
  label: string;
  pictureName: string | null;
  onChoose: () => void;
  onClear: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div>
      <span style={{ display: "block", marginBottom: 4 }}>
        <ControlLabel>{label}</ControlLabel>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <button
          type="button"
          onClick={onChoose}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 9,
            cursor: "pointer",
            textAlign: "left",
            background: colors.raise,
            border: `1px solid ${colors.border}`,
            color: pictureName ? colors.text : colors.dim,
            fontFamily: fonts.ui,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <ImageIcon size={13} style={{ flexShrink: 0 }} />
          <span className="ws-ellipsis" style={{ minWidth: 0 }}>
            {pictureName ?? "Choose a picture"}
          </span>
        </button>
        {pictureName && (
          <button
            type="button"
            title="Remove the picture"
            aria-label="Remove the picture"
            onClick={onClear}
            style={{
              ...swatchButton("transparent"),
              display: "grid",
              placeItems: "center",
              background: "transparent",
              color: colors.dim,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A named set of settings that starts closed. The controls an operator reaches
 * for mid-service are the ones outside these; type and colour are set once,
 * before the element goes up, and would otherwise bury them.
 */
export function OverlaySettingsGroup({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { colors, fonts } = useUITheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: open ? fade(colors.raise, 0.5) : "transparent",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: colors.text,
          fontFamily: fonts.ui,
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        <Icon size={14} color={colors.accentSoft} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        {open ? (
          <ChevronDown size={14} color={colors.dim} />
        ) : (
          <ChevronRight size={14} color={colors.dim} />
        )}
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            padding: "2px 10px 11px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
