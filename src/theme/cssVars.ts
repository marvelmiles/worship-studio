export const themeVar = {
  accent: "var(--ws-accent)",
  accentSoft: "var(--ws-accent-soft)",
  border: "var(--ws-border)",
  raise: "var(--ws-raise)",
  text: "var(--ws-text)",
  dim: "var(--ws-dim)",
  fontUi: "var(--ws-font-ui)",
} as const;

export const fadeVar = (cssVar: string, alpha: number): string =>
  `color-mix(in srgb, ${cssVar} ${Math.round(alpha * 100)}%, transparent)`;
