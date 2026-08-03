import { useMemo } from "react";
import { parseInlineFormatting } from "../lib/inlineFormat";
import type { FormattedSegment } from "../lib/inlineFormat";

interface FormattedTextProps {
  text: string;
}

const isStyled = (segment: FormattedSegment): boolean =>
  Boolean(
    segment.bold ||
    segment.italic ||
    segment.underline ||
    segment.strikethrough ||
    segment.highlight,
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
 * Renders one line of slide text with its Markdown emphasis applied. Bold uses
 * `bolder` rather than a fixed weight so it stays a step above whatever weight
 * the theme already sets, and highlight paints behind the text in the theme's
 * own accent-neutral wash so it reads on any background.
 */
export function FormattedText({ text }: FormattedTextProps) {
  const segments = useMemo(() => parseInlineFormatting(text), [text]);

  // Still rebuilt from the segments so escaped markers lose their backslash.
  if (!segments.some(isStyled))
    return <>{segments.map((segment) => segment.text).join("")}</>;

  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          style={{
            fontWeight: segment.bold ? "bolder" : undefined,
            fontStyle: segment.italic ? "italic" : undefined,
            textDecoration: decorationOf(segment),
            textDecorationThickness: segment.underline ? "0.06em" : undefined,
            textUnderlineOffset: segment.underline ? "0.18em" : undefined,
            background: segment.highlight ? "rgba(255,214,10,0.32)" : undefined,
            borderRadius: segment.highlight ? "0.12em" : undefined,
            padding: segment.highlight ? "0 0.12em" : undefined,
          }}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
