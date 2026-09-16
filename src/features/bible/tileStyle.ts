import type { CSSProperties } from "react";
import { fadeVar, themeVar } from "../../theme/cssVars";

export const tileStyle = (isActive = false): CSSProperties => ({
  padding: "10px 0",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: themeVar.fontUi,
  fontSize: 13.5,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
  border: `1px solid ${isActive ? fadeVar(themeVar.accent, 0.4) : themeVar.border}`,
  background: isActive ? fadeVar(themeVar.accent, 0.16) : themeVar.raise,
  color: isActive ? themeVar.accentSoft : themeVar.text,
});
