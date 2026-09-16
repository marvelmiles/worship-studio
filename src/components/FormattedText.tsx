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
  baseWeight?: number;
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

const decorationOf = (segment: FormattedSegment): string | undefined => {
  const lines = [
    segment.underline ? "underline" : "",
    segment.strikethrough ? "line-through" : "",
  ].filter(Boolean);
  return lines.length ? lines.join(" ") : undefined;
};

export const boldWeight = (baseWeight: number): number => {
  return Math.min(900, Math.max(700, Math.round(baseWeight) + 200));
};

const styleOf = (
  segment: FormattedSegment,
  baseWeight: number,
): CSSProperties => {
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
};

export const FormattedText = ({
  text,
  baseWeight = 400,
  sourceBase,
}: FormattedTextProps) => {
  const merged = useMemo(
    () => (sourceBase === undefined ? parseInlineFormatting(text) : []),
    [text, sourceBase],
  );
  const sourced = useMemo(
    () => (sourceBase === undefined ? [] : parseInlineSegments(text)),
    [text, sourceBase],
  );

  if (sourceBase !== undefined) {
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
};
