import type { CSSProperties } from "react";
import { C, UI } from "../../theme/tokens";

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
  border: `1px solid ${active ? "rgba(216,162,74,0.4)" : C.border}`,
  background: active ? "rgba(216,162,74,0.16)" : C.raise,
  color: active ? C.goldSoft : C.text,
});
