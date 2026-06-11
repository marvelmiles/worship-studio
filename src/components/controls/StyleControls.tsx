import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Align, ResolvedStyle, TextStyle } from "../../types";
import { C, FONTS } from "../../theme/tokens";
import { Field, Range, Select, TextInput, Toggle } from "../ui/Field";

interface StyleControlsProps {
  style: ResolvedStyle;
  onChange: (key: keyof TextStyle, value: unknown) => void;
}

const WEIGHT_OPTIONS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Black" },
];

const ALIGNMENTS: [Align, LucideIcon][] = [
  ["left", AlignLeft],
  ["center", AlignCenter],
  ["right", AlignRight],
];

export function StyleControls({ style, onChange }: StyleControlsProps) {
  return (
    <>
      <Field label="Font Family">
        <Select
          value={style.fontFamily}
          options={FONTS}
          onChange={(e) => onChange("fontFamily", e.target.value)}
        />
      </Field>
      <Field label={`Font Size (${style.fontSize})`}>
        <Range
          value={Number(style.fontSize)}
          min={2.5}
          max={10}
          step={0.1}
          onChange={(e) => onChange("fontSize", Number(e.target.value))}
        />
      </Field>
      <Field label="Weight">
        <Select
          value={String(style.fontWeight)}
          options={WEIGHT_OPTIONS}
          onChange={(e) => onChange("fontWeight", Number(e.target.value))}
        />
      </Field>
      <Field label="Alignment">
        <div style={{ display: "flex", gap: 6 }}>
          {ALIGNMENTS.map(([value, Icon]) => {
            const active = style.align === value;
            return (
              <button
                key={value}
                onClick={() => onChange("align", value)}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 9,
                  cursor: "pointer",
                  background: active ? "rgba(216,162,74,0.16)" : C.raise,
                  border: `1px solid ${active ? "rgba(216,162,74,0.35)" : C.border}`,
                  color: active ? C.goldSoft : C.sub,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Text Color">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={style.color}
            onChange={(e) => onChange("color", e.target.value)}
            style={{
              width: 42,
              height: 38,
              borderRadius: 9,
              border: `1px solid ${C.border}`,
              background: "transparent",
              cursor: "pointer",
            }}
          />
          <TextInput value={style.color} onChange={(e) => onChange("color", e.target.value)} />
        </div>
      </Field>
      <Field label={`Line Height (${style.lineHeight})`}>
        <Range
          value={Number(style.lineHeight)}
          min={1}
          max={2}
          step={0.05}
          onChange={(e) => onChange("lineHeight", Number(e.target.value))}
        />
      </Field>
      <Field label={`Letter Spacing (${style.letterSpacing || 0})`}>
        <Range
          value={Number(style.letterSpacing || 0)}
          min={-1}
          max={2}
          step={0.1}
          onChange={(e) => onChange("letterSpacing", Number(e.target.value))}
        />
      </Field>
      <div style={{ marginBottom: 6 }}>
        <Toggle
          label="Uppercase"
          checked={Boolean(style.uppercase)}
          onChange={(checked) => onChange("uppercase", checked)}
        />
      </div>
      <div style={{ marginBottom: 4 }}>
        <Toggle
          label="Text shadow"
          checked={style.textShadow !== "none"}
          onChange={(checked) =>
            onChange("textShadow", checked ? "0 2px 22px rgba(0,0,0,0.55)" : "none")
          }
        />
      </div>
    </>
  );
}
