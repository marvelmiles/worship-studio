import type { TextStyle } from "../types";

export const TEXT_SHADOW_PRESET = "0 2px 22px rgba(0,0,0,0.55)";

export const SPAN_OPEN = "[[";
export const SPAN_OPEN_END = "]]";
export const SPAN_CLOSE = "[[/]]";

export type InlineStyleKey =
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "color"
  | "letterSpacing"
  | "uppercase"
  | "textShadow";

export type InlineTextStyle = Pick<TextStyle, InlineStyleKey>;

interface Attribute {
  token: string;
  encode: (value: unknown) => string | null;
  decode: (raw: string) => unknown;
}

const sanitize = (value: string): string => value.replace(/[;\][]/g, "").trim();

const encodeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const clean = sanitize(value);
  return clean || null;
};

const encodeNumber = (value: unknown): string | null => {
  const number = Number(value);
  return Number.isFinite(number) ? String(Number(number.toFixed(3))) : null;
};

const decodeNumber = (raw: string): number | undefined => {
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
};

const ATTRIBUTES: Record<InlineStyleKey, Attribute> = {
  fontFamily: { token: "font", encode: encodeText, decode: (raw) => raw },
  fontSize: { token: "size", encode: encodeNumber, decode: decodeNumber },
  fontWeight: { token: "weight", encode: encodeNumber, decode: decodeNumber },
  color: { token: "color", encode: encodeText, decode: (raw) => raw },
  letterSpacing: {
    token: "spacing",
    encode: encodeNumber,
    decode: decodeNumber,
  },
  uppercase: {
    token: "caps",
    encode: (value) => (value ? "1" : "0"),
    decode: (raw) => raw === "1",
  },
  textShadow: {
    token: "shadow",
    encode: (value) => (!value || value === "none" ? "0" : "1"),
    decode: (raw) => (raw === "1" ? TEXT_SHADOW_PRESET : "none"),
  },
};

export const INLINE_STYLE_KEYS = Object.keys(ATTRIBUTES) as InlineStyleKey[];

const KEY_BY_TOKEN = new Map<string, InlineStyleKey>(
  INLINE_STYLE_KEYS.map((key) => [ATTRIBUTES[key].token, key]),
);

export const isInlineStyleKey = (key: string): key is InlineStyleKey =>
  key in ATTRIBUTES;

export const mergeInlineStyle = (
  base: InlineTextStyle | undefined,
  patch: InlineTextStyle | undefined,
): InlineTextStyle | undefined => {
  if (!base) return patch;
  if (!patch) return base;
  return { ...base, ...patch };
};

export const hasInlineStyle = (style: InlineTextStyle | undefined): boolean =>
  Boolean(style && INLINE_STYLE_KEYS.some((key) => style[key] !== undefined));

export const encodeInlineStyle = (
  style: InlineTextStyle | undefined,
): string | null => {
  if (!style) return null;
  const parts: string[] = [];
  for (const key of INLINE_STYLE_KEYS) {
    const value = style[key];
    if (value === undefined || value === null || value === "") continue;
    const encoded = ATTRIBUTES[key].encode(value);
    if (encoded !== null) parts.push(`${ATTRIBUTES[key].token}=${encoded}`);
  }
  return parts.length ? parts.join(";") : null;
};

export const decodeInlineStyle = (raw: string): InlineTextStyle => {
  const style: Record<string, unknown> = {};
  for (const part of raw.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = KEY_BY_TOKEN.get(part.slice(0, separator).trim());
    if (!key) continue;
    const value = ATTRIBUTES[key].decode(part.slice(separator + 1).trim());
    if (value !== undefined) style[key] = value;
  }
  return style as InlineTextStyle;
};

export const openingToken = (
  style: InlineTextStyle | undefined,
): string | null => {
  const encoded = encodeInlineStyle(style);
  return encoded ? `${SPAN_OPEN}${encoded}${SPAN_OPEN_END}` : null;
};
