import { useMemo } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import type { Align, ResolvedStyle, VerticalAlign } from "../types";
import { colors, fade } from "../theme/tokens";
import { lineContentOffsets } from "../lib/inlineDocument";
import { analyzeLines, listMarkerLabel } from "../lib/lists";
import type { ListKind, ListLine } from "../lib/lists";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { FormattedText } from "./FormattedText";

/** One indent level, in the same container-query unit the text is sized in. */
const INDENT_STEP_CQW = 3.2;

const FLEX_VERTICAL: Record<VerticalAlign, string> = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};

interface ListItemLineProps {
  item: ListLine & { kind: ListKind };
  align: Align;
  painted: ReactNode;
  editable: boolean;
}

/**
 * A line carrying a list marker.
 *
 * Left-aligned text gets the hanging indent an outline is read with: the marker
 * sits in its own column and wrapped text lines up under the words above it.
 * Centred and right-aligned text cannot have that column, since pinning the
 * marker to the edge would drag the words off the alignment the slide is set
 * in, so the marker travels inline with the text and the whole item wraps and
 * aligns as one piece.
 */
function ListItemLine({ item, align, painted, editable }: ListItemLineProps) {
  const label = listMarkerLabel(item.kind, item.index, item.level);
  const markerStyle: CSSProperties = {
    fontVariantNumeric: "tabular-nums",
    userSelect: editable ? "none" : undefined,
  };

  if (align !== "left")
    return (
      <>
        <span
          aria-hidden
          contentEditable={false}
          style={{ ...markerStyle, marginInlineEnd: "0.9cqw" }}
        >
          {label}
        </span>
        {painted}
      </>
    );

  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: "0.9cqw" }}>
      <span
        aria-hidden
        contentEditable={false}
        style={{
          ...markerStyle,
          flex: "none",
          minWidth: "2.6cqw",
          textAlign: "end",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, textAlign: "start" }}>{painted}</span>
    </span>
  );
}

interface SlideTextBlockProps {
  lines: string[];
  style: ResolvedStyle;
  /** Per-line resolved style, same length/order as `lines`. */
  lineStyles?: ResolvedStyle[];
  /** Index of the line the inspector is styling, outlined so the scope is visible. */
  selectedLine?: number | null;
  /** Attached when this block is the surface the editor is typing into. */
  editing?: SlideTextEditing;
  /** True in the editor, even for a block that does not hold the caret. */
  marked?: boolean;
  verticalAlign?: VerticalAlign;
  padding?: string;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
}

/**
 * One block of slide text, painted from the raw lines behind it.
 *
 * Text is sized in container-query units, so the same block scales from a
 * thumbnail to a fullscreen projection with no per-context font maths. With
 * `editing` attached the block becomes the editing surface itself: the caret
 * sits in the real slide, so what the writer types is already what the room
 * will see.
 */
export function SlideTextBlock({
  lines,
  style,
  lineStyles,
  selectedLine,
  editing,
  marked,
  verticalAlign = "middle",
  padding,
  onPointerDown,
}: SlideTextBlockProps) {
  const editable = Boolean(editing);
  const content = useMemo(() => (lines.length ? lines : [""]), [lines]);
  const items = useMemo(() => analyzeLines(content), [content]);
  const sourceOffsets = useMemo(
    () => (editable ? lineContentOffsets(content) : null),
    [editable, content],
  );
  const outlined = Boolean(marked) || selectedLine != null;

  const blockStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: FLEX_VERTICAL[verticalAlign],
    padding,
    outline: "none",
    cursor: editable ? "text" : undefined,
  };

  return (
    <div
      ref={editing?.ref}
      contentEditable={editable || undefined}
      suppressContentEditableWarning={editable}
      spellCheck={editable ? false : undefined}
      role={editable ? "textbox" : undefined}
      aria-multiline={editable || undefined}
      aria-label={editable ? "Slide text" : undefined}
      onKeyDown={editing?.onKeyDown}
      onPointerDown={onPointerDown}
      style={blockStyle}
    >
      <div style={{ width: "100%" }}>
        {items.map((item, index) => {
          const lineStyle = lineStyles?.[index] ?? style;
          const selected = selectedLine === index;
          const align = lineStyle.align || "center";
          const painted =
            sourceOffsets || item.content ? (
              <FormattedText
                text={item.content}
                baseWeight={lineStyle.fontWeight}
                sourceBase={sourceOffsets?.[index]}
              />
            ) : (
              " "
            );
          return (
            <div
              key={index}
              style={{
                textAlign: align,
                color: lineStyle.color,
                fontFamily: `'${lineStyle.fontFamily}', serif`,
                fontWeight: lineStyle.fontWeight,
                fontSize: `${lineStyle.fontSize}cqw`,
                lineHeight: lineStyle.lineHeight,
                letterSpacing: `${lineStyle.letterSpacing || 0}cqw`,
                textShadow: lineStyle.textShadow,
                textTransform: lineStyle.uppercase ? "uppercase" : "none",
                whiteSpace: editable ? "pre-wrap" : undefined,
                borderRadius: 6,
                padding: outlined ? "0.3cqw 0.6cqw" : undefined,
                margin: outlined ? "-0.3cqw -0.6cqw" : undefined,
                paddingInlineStart: item.level
                  ? `${item.level * INDENT_STEP_CQW + (outlined ? 0.6 : 0)}cqw`
                  : undefined,
                outline: selected
                  ? `0.25cqw solid ${colors.accent}`
                  : outlined
                    ? "0.25cqw dashed transparent"
                    : undefined,
                outlineOffset: 2,
                background: selected ? fade(colors.accent, 0.14) : undefined,
                transition: outlined
                  ? "outline-color .15s ease, background .15s ease"
                  : undefined,
              }}
            >
              {item.kind ? (
                <ListItemLine
                  item={{ ...item, kind: item.kind }}
                  align={align}
                  painted={painted}
                  editable={editable}
                />
              ) : (
                painted
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
