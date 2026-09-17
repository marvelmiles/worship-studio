import { studioTheme } from "../theme/uiTheme";

const HOLD_MS = 1800;

/* Storage is cleared before React mounts, so this notice is built straight from
   the theme object rather than through the provider. */
export const showStorageClearedNotice = (message: string): Promise<void> => {
  const { colors, fonts, shadows } = studioTheme;

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "900",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    background: colors.scrimStrong,
    backdropFilter: "blur(8px)",
  } satisfies Partial<CSSStyleDeclaration>);

  const card = document.createElement("div");
  Object.assign(card.style, {
    maxWidth: "380px",
    width: "100%",
    padding: "22px 24px",
    borderRadius: "18px",
    textAlign: "center",
    background: colors.panelSolid,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.overlay,
    color: colors.text,
    fontFamily: fonts.ui,
    fontSize: "14px",
    lineHeight: "1.7",
  } satisfies Partial<CSSStyleDeclaration>);
  card.textContent = message;

  overlay.append(card);
  document.body.append(overlay);

  return new Promise((resolve) => window.setTimeout(resolve, HOLD_MS));
};
