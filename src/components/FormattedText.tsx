import { useMemo } from "react";
import { parseInlineFormatting } from "../lib/inlineFormat";

interface FormattedTextProps {
  text: string;
}

/**
 * Renders one line of slide text with its Markdown emphasis applied. Bold uses
 * `bolder` rather than a fixed weight so it stays a step above whatever weight
 * the theme already sets.
 */
export function FormattedText({ text }: FormattedTextProps) {
  const segments = useMemo(() => parseInlineFormatting(text), [text]);
  const plain = segments.every(
    (segment) => !segment.bold && !segment.italic && !segment.strikethrough,
  );

  // Still rebuilt from the segments so escaped markers lose their backslash.
  if (plain) return <>{segments.map((segment) => segment.text).join("")}</>;

  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          style={{
            fontWeight: segment.bold ? "bolder" : undefined,
            fontStyle: segment.italic ? "italic" : undefined,
            textDecoration: segment.strikethrough ? "line-through" : undefined,
          }}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
