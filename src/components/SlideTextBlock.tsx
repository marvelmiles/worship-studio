import { useMemo } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import type { Align, ResolvedStyle, VerticalAlign } from "../types";
import { fade } from "../theme/uiTheme";
import { useUITheme } from "../theme/ThemeProvider";
import { lineContentOffsets } from "../lib/inlineDocument";
import { analyzeLines, listMarkerLabel } from "../lib/lists";
import type { ListKind, ListLine } from "../lib/lists";
import type { SlideTextEditing } from "../hooks/useSlideTextEditor";
import { FormattedText } from "./FormattedText";

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

const ListItemLine = ({
  item,
  align,
  painted,
  editable,
}: ListItemLineProps) => {
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
};

interface SlideTextBlockProps {
  lines: string[];
  style: ResolvedStyle;
  lineStyles?: ResolvedStyle[];
  selectedLine?: number | null;
  editing?: SlideTextEditing;
  marked?: boolean;
  verticalAlign?: VerticalAlign;
  padding?: string;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
}

export const SlideTextBlock = ({
  lines,
  style,
  lineStyles,
  selectedLine,
  editing,
  marked,
  verticalAlign = "middle",
  padding,
  onPointerDown,
}: SlideTextBlockProps) => {
  const { colors } = useUITheme();
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
};
