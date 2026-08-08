import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  parseInlineFormatting,
  parseInlineSegments,
} from "../lib/inlineFormat";
import type { FormattedSegment } from "../lib/inlineFormat";
import type { InlineTextStyle } from "../lib/inlineStyle";

interface FormattedTextProps {
  text: string;
  /** The weight the surrounding line is set in, which bold has to beat. */
  baseWeight?: number;
  /**
   * Offset of `text` in the document. Set it to paint every run with the slice
   * of source it came from, which is how an editable surface maps a caret back
   * onto the raw text (see lib/richTextDom.ts).
   */
  sourceBase?: number;
}

const isStyled = (segment: FormattedSegment): boolean =>
  Boolean(
    segment.bold ||
    segment.italic ||
    segment.underline ||
    segment.strikethrough ||
    segment.highlight ||
    segment.style,
  );

/** Underline and strikethrough can both be in force on the same run. */
const decorationOf = (segment: FormattedSegment): string | undefined => {
  const lines = [
    segment.underline ? "underline" : "",
    segment.strikethrough ? "line-through" : "",
  ].filter(Boolean);
  return lines.length ? lines.join(" ") : undefined;
};

/**
 * Bold as an explicit weight rather than the CSS keyword `bolder`.
 *
 * Themes set the slide text at 600 or 700 already. `bolder` resolves both of
 * those to 900, and a family whose heaviest face is 700 then renders the mark
 * identically to the surrounding text: bold that does not look bold. Stepping
 * two stops up from whatever weight is actually in force always lands on a
 * heavier face when one exists, and never below 700.
 */
export function boldWeight(baseWeight: number): number {
  return Math.min(900, Math.max(700, Math.round(baseWeight) + 200));
}

function styleOf(segment: FormattedSegment, baseWeight: number): CSSProperties {
  const inline: InlineTextStyle = segment.style ?? {};
  const weight = inline.fontWeight ?? baseWeight;
  return {
    fontFamily: inline.fontFamily ? `'${inline.fontFamily}', serif` : undefined,
    fontSize: inline.fontSize != null ? `${inline.fontSize}cqw` : undefined,
    fontWeight: segment.bold ? boldWeight(weight) : inline.fontWeight,
    color: inline.color,
    letterSpacing:
      inline.letterSpacing != null ? `${inline.letterSpacing}cqw` : undefined,
    textTransform:
      inline.uppercase === undefined
        ? undefined
        : inline.uppercase
          ? "uppercase"
          : "none",
    textShadow: inline.textShadow,
    fontStyle: segment.italic ? "italic" : undefined,
    textDecoration: decorationOf(segment),
    textDecorationThickness: segment.underline ? "0.06em" : undefined,
    textUnderlineOffset: segment.underline ? "0.18em" : undefined,
    background: segment.highlight ? "rgba(255,214,10,0.32)" : undefined,
    borderRadius: segment.highlight ? "0.12em" : undefined,
    padding: segment.highlight ? "0 0.12em" : undefined,
  };
}

/**
 * Renders one line of slide text with its inline formatting applied: the
 * Markdown emphasis writers already type, and the font, size, colour and case
 * a highlighted phrase was given from the inspector.
 */
export function FormattedText({
  text,
  baseWeight = 400,
  sourceBase,
}: FormattedTextProps) {
  const merged = useMemo(
    () => (sourceBase === undefined ? parseInlineFormatting(text) : []),
    [text, sourceBase],
  );
  const sourced = useMemo(
    () => (sourceBase === undefined ? [] : parseInlineSegments(text)),
    [text, sourceBase],
  );

  if (sourceBase !== undefined) {
    // An empty line still needs something to click into, so it gets a run of
    // its own with no source behind it.
    if (!sourced.length)
      return (
        <span data-src-start={sourceBase} data-src-end={sourceBase}>
          {"\u00A0"}
        </span>
      );
    return (
      <>
        {sourced.map((segment, index) => (
          <span
            key={index}
            data-src-start={sourceBase + segment.sourceStart}
            data-src-end={sourceBase + segment.sourceEnd}
            style={styleOf(segment, baseWeight)}
          >
            {segment.text}
          </span>
        ))}
      </>
    );
  }

  // Still rebuilt from the segments so escaped markers lose their backslash.
  if (!merged.some(isStyled))
    return <>{merged.map((segment) => segment.text).join("")}</>;

  return (
    <>
      {merged.map((segment, index) => (
        <span key={index} style={styleOf(segment, baseWeight)}>
          {segment.text}
        </span>
      ))}
    </>
  );
}
