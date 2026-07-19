import type { CSSProperties } from "react";
import { fade, colors, UI } from "../../theme/tokens";

/** Shared look of the tappable book/chapter/verse tiles on the Bible page. */
export const tileStyle = (active = false): CSSProperties => ({
  padding: "10px 0",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: UI,
  fontSize: 13.5,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  border: `1px solid ${active ? fade(colors.accent, 0.4) : colors.border}`,
  background: active ? fade(colors.accent, 0.16) : colors.raise,
  color: active ? colors.accentSoft : colors.text,
});
