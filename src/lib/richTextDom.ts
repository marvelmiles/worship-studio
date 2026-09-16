import { clamp } from "./textRange";
import type { TextRange } from "./textRange";

export const SOURCE_START_ATTRIBUTE = "data-src-start";

interface SourceSpan {
  element: HTMLElement;
  start: number;
  end: number;
}

const spansIn = (root: HTMLElement): SourceSpan[] =>
  Array.from(
    root.querySelectorAll<HTMLElement>(`[${SOURCE_START_ATTRIBUTE}]`),
  ).map((element) => ({
    element,
    start: Number(element.dataset.srcStart),
    end: Number(element.dataset.srcEnd),
  }));

const firstTextNode = (element: HTMLElement): Text | null => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as Text | null;
};

const follows = (reference: Node, node: Node): boolean =>
  (reference.compareDocumentPosition(node) &
    Node.DOCUMENT_POSITION_FOLLOWING) !==
  0;

const precedes = (reference: Node, node: Node): boolean =>
  (reference.compareDocumentPosition(node) &
    Node.DOCUMENT_POSITION_PRECEDING) !==
  0;

export const sourceOffsetFromDom = (
  root: HTMLElement,
  node: Node,
  offset: number,
): number | null => {
  if (!root.contains(node)) return null;

  const element =
    node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as HTMLElement);
  const span = element?.closest<HTMLElement>(`[${SOURCE_START_ATTRIBUTE}]`);

  if (span) {
    const start = Number(span.dataset.srcStart);
    const end = Number(span.dataset.srcEnd);
    if (node.nodeType !== Node.TEXT_NODE) return offset <= 0 ? start : end;
    const length = (node as Text).length;
    if (end - start === length) return start + clamp(offset, 0, length);
    return offset <= 0 ? start : end;
  }

  const spans = spansIn(root);
  if (!spans.length) return null;

  const reference = node.childNodes[offset] ?? null;
  if (reference) {
    const next = spans.find(
      (candidate) =>
        reference === candidate.element ||
        reference.contains(candidate.element) ||
        follows(reference, candidate.element),
    );
    return next ? next.start : spans[spans.length - 1].end;
  }

  const inside = spans.filter((candidate) => node.contains(candidate.element));
  if (inside.length) return inside[inside.length - 1].end;

  const before = spans.filter((candidate) => precedes(node, candidate.element));
  return before.length ? before[before.length - 1].end : spans[0].start;
};

export interface DomPosition {
  node: Node;
  offset: number;
}

interface CaretDocument {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
}

export const domPositionFromPoint = (
  x: number,
  y: number,
): DomPosition | null => {
  const source = document as Document & CaretDocument;
  const position = source.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = source.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
};

export const domPositionFromSource = (
  root: HTMLElement,
  offset: number,
): DomPosition | null => {
  const spans = spansIn(root);
  if (!spans.length) return null;

  const span =
    spans.find(
      (candidate) => candidate.start <= offset && offset < candidate.end,
    ) ??
    [...spans].reverse().find((candidate) => candidate.end === offset) ??
    [...spans].reverse().find((candidate) => candidate.end <= offset) ??
    spans.find((candidate) => candidate.start >= offset) ??
    spans[0];

  const text = firstTextNode(span.element);
  if (!text) return { node: span.element, offset: 0 };

  const within =
    span.end - span.start === text.length
      ? clamp(offset - span.start, 0, text.length)
      : offset <= span.start
        ? 0
        : text.length;
  return { node: text, offset: within };
};

export const sourceRangeFromDom = (
  root: HTMLElement,
  range: {
    startContainer: Node;
    startOffset: number;
    endContainer: Node;
    endOffset: number;
  },
): TextRange | null => {
  const start = sourceOffsetFromDom(
    root,
    range.startContainer,
    range.startOffset,
  );
  const end = sourceOffsetFromDom(root, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
};
