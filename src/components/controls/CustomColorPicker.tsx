import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { colors, UI } from "../../theme/tokens";
import { Button } from "../ui/Button";
import { TextInput } from "../ui/Field";

interface CustomColorPickerProps {
  onAdd: (value: string, name: string) => void;
}

const PALETTE: { value: string; name: string }[] = [
  { value: "#101013", name: "Charcoal" },
  { value: "#101a3d", name: "Midnight Navy" },
  { value: "#1b1733", name: "Deep Indigo" },
  { value: "#2a2118", name: "Espresso" },
  { value: "#0f2027", name: "Pine" },
  { value: "#16243f", name: "Royal Blue" },
  { value: "#241f2e", name: "Plum" },
  { value: "#3a2f1a", name: "Bronze" },
  { value: "#7a1f5c", name: "Berry" },
  { value: "#c2410c", name: "Burnt Orange" },
  { value: "#eab308", name: "Amber" },
  { value: "#0d3b2e", name: "Emerald" },
  { value: "#3b0d1f", name: "Wine" },
  { value: "#1e3a8a", name: "Sapphire" },
  { value: "#4c1d95", name: "Violet" },
  { value: "#f5ecd7", name: "Parchment" },
];

const caption = {
  fontFamily: UI,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
  color: colors.dim,
  margin: "0 0 7px",
};

export function CustomColorPicker({ onAdd }: CustomColorPickerProps) {
  const [color, setColor] = useState("#1b1733");
  const [css, setCss] = useState("");
  const [label, setLabel] = useState("");

  const trimmed = label.trim();
  const addColor = () => {
    if (!trimmed) return;
    onAdd(color, trimmed);
  };
  const addCss = () => {
    const value = css.trim();
    if (!value || !trimmed) return;
    onAdd(value, trimmed);
    setCss("");
  };

  return (
    <div style={{ padding: 12, borderRadius: 11, background: colors.raise, border: `1px solid ${colors.border}`, marginBottom: 12 }}>
      <p style={caption}>Presets</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6, marginBottom: 14 }}>
        {PALETTE.map((swatch) => (
          <button
            key={swatch.value}
            title={swatch.name}
            onClick={() => onAdd(swatch.value, swatch.name)}
            style={{
              aspectRatio: "1",
              borderRadius: 7,
              background: swatch.value,
              border: `1px solid ${colors.border}`,
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      <p style={caption}>Add custom (label required)</p>
      <TextInput value={label} placeholder="Label (e.g. Soft Cream)" onChange={(e) => setLabel(e.target.value)} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0" }}>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 42, height: 38, borderRadius: 9, border: `1px solid ${colors.border}`, background: "transparent", cursor: "pointer" }}
        />
        <Button variant="ghost" size="sm" disabled={!trimmed} onClick={addColor}>
          <Plus size={14} />
          Add color
        </Button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <TextInput
          value={css}
          placeholder="#1b1733, rgba(20,20,40,1), linear-gradient(…)"
          onChange={(e) => setCss(e.target.value)}
        />
        <Button variant="ghost" size="sm" disabled={!trimmed || !css.trim()} onClick={addCss}>
          <Check size={14} />
          Add
        </Button>
      </div>
      <p style={{ fontFamily: UI, fontSize: 11.5, color: colors.dim, margin: "8px 0 0" }}>
        Accepts any CSS background: hex, rgb / rgba, hsl, or a gradient. Presets already include a name.
      </p>
    </div>
  );
}
