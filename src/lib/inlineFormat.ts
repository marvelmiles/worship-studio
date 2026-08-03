export interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  highlight?: boolean;
}

export interface FormattedSegment extends InlineStyle {
  text: string;
}

interface Marker {
  token: string;
  style: InlineStyle;
  /**
   * Underscore markers only open and close at word boundaries, so words like
   * hallelujah_and_amen or file_name survive untouched.
   */
  wordBoundary: boolean;
}

/** Longest tokens first so `***` is never read as `**` followed by `*`. */
const MARKERS: Marker[] = [
  { token: "***", style: { bold: true, italic: true }, wordBoundary: false },
  { token: "___", style: { bold: true, italic: true }, wordBoundary: true },
  { token: "**", style: { bold: true }, wordBoundary: false },
  { token: "__", style: { bold: true }, wordBoundary: true },
  { token: "++", style: { underline: true }, wordBoundary: false },
  { token: "==", style: { highlight: true }, wordBoundary: false },
  { token: "~~", style: { strikethrough: true }, wordBoundary: false },
  { token: "*", style: { italic: true }, wordBoundary: false },
  { token: "_", style: { italic: true }, wordBoundary: true },
];

const ESCAPABLE = new Set(["*", "_", "~", "+", "=", "\\", "[", "]", "#", ">"]);
const WORD_CHARACTER = /[\p{L}\p{N}]/u;

const isWordCharacter = (char: string | undefined): boolean =>
  Boolean(char) && WORD_CHARACTER.test(char as string);

const isWhitespace = (char: string | undefined): boolean =>
  !char || /\s/.test(char);

const styleKeys = (style: InlineStyle) =>
  Object.keys(style) as (keyof InlineStyle)[];

/** True when every effect this marker would add is already in force. */
function alreadyStyled(active: InlineStyle, style: InlineStyle): boolean {
  return styleKeys(style).every((key) => active[key]);
}

function canOpen(text: string, index: number, marker: Marker): boolean {
  const after = text[index + marker.token.length];
  if (isWhitespace(after)) return false;
  return !marker.wordBoundary || !isWordCharacter(text[index - 1]);
}

function canClose(text: string, index: number, marker: Marker): boolean {
  if (isWhitespace(text[index - 1])) return false;
  const after = text[index + marker.token.length];
  return !marker.wordBoundary || !isWordCharacter(after);
}

/** Index of the marker's matching closing token, or -1 when it never closes. */
function findClosing(text: string, from: number, marker: Marker): number {
  let index = from;
  while (index < text.length) {
    if (text[index] === "\\" && ESCAPABLE.has(text[index + 1])) {
      index += 2;
      continue;
    }
    if (
      index > from &&
      text.startsWith(marker.token, index) &&
      canClose(text, index, marker)
    ) {
      return index;
    }
    index += 1;
  }
  return -1;
}

function parseSegments(text: string, active: InlineStyle): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  let buffer = "";
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    segments.push({ text: buffer, ...active });
    buffer = "";
  };

  while (index < text.length) {
    const char = text[index];
    if (char === "\\" && ESCAPABLE.has(text[index + 1])) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    const marker = MARKERS.find(
      (candidate) =>
        text.startsWith(candidate.token, index) &&
        !alreadyStyled(active, candidate.style) &&
        canOpen(text, index, candidate),
    );
    const closing = marker
      ? findClosing(text, index + marker.token.length, marker)
      : -1;

    // An unmatched marker is just punctuation the singer typed, keep it.
    if (marker && closing !== -1) {
      flush();
      segments.push(
        ...parseSegments(text.slice(index + marker.token.length, closing), {
          ...active,
          ...marker.style,
        }),
      );
      index = closing + marker.token.length;
      continue;
    }

    buffer += char;
    index += 1;
  }

  flush();
  return segments;
}

/**
 * Splits a line of slide text into styled runs using the Markdown emphasis
 * people already type into lyric documents: `**bold**`, `__bold__`,
 * `*italic*`, `_italic_`, `***bold italic***` and `~~strikethrough~~`, plus
 * `++underline++` and `==highlight==` for the marks Markdown has no syntax for.
 * A marker that never closes stays on screen as literal text, and any marker
 * can be escaped with a backslash.
 */
export function parseInlineFormatting(text: string): FormattedSegment[] {
  return parseSegments(text, {});
}

/** The same line with every formatting marker resolved away, for speech and search. */
export function stripInlineFormatting(text: string): string {
  return parseInlineFormatting(text)
    .map((segment) => segment.text)
    .join("");
}
