import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  deleteBackward,
  deleteForward,
  replaceRange,
} from "../lib/inlineDocument";
import {
  domPositionFromSource,
  sourceOffsetFromDom,
  sourceRangeFromDom,
} from "../lib/richTextDom";
import type { TextRange } from "../lib/textRange";
import type {
  FormattingHost,
  TextFormattingController,
} from "./useTextFormatting";

/** What the slide canvas needs to become the editing surface. */
export interface SlideTextEditing {
  ref: (element: HTMLDivElement | null) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  /** Viewport rect of the current highlight, for the floating toolbar. */
  selectionRect: DOMRect | null;
}

interface Options {
  /** The slide's lines as one block of raw text. */
  text: string;
  formatting: TextFormattingController;
}

const clipboardText = (transfer: DataTransfer | null): string =>
  transfer?.getData("text/plain") ?? "";

/**
 * True while the caret belongs to some other field. Restoring our own highlight
 * would take the document selection off it, so a command run from a panel
 * leaves the DOM alone and only remembers where it acted.
 */
function typingElsewhere(root: HTMLElement): boolean {
  const active = document.activeElement;
  if (!active || active === root || root.contains(active)) return false;
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  );
}

/**
 * Turns the rendered slide into a text editor.
 *
 * The surface is a contentEditable, but the browser is never allowed to write
 * to it: every `beforeinput` is cancelled and replayed against the document
 * model instead, which then re-renders through React. That is what keeps the
 * markers balanced, escapes a typed asterisk, and lets a keystroke and a
 * toolbar command share exactly the same code path. Selections are translated
 * from the painted runs back to raw offsets, so the caret survives every
 * rewrite.
 */
export function useSlideTextEditor({
  text,
  formatting,
}: Options): SlideTextEditing {
  const { bind, runCommand, undo, redo, syncSelection, handleKeyDown } =
    formatting;
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const textRef = useRef(text);
  const rangeRef = useRef<TextRange>({ start: 0, end: 0 });
  const compositionRef = useRef<TextRange | null>(null);

  // Commands read the document from here, so it has to be whatever the surface
  // currently shows rather than whatever the last event closed over.
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const ref = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  /** The live DOM selection in raw offsets, or the last one seen inside us. */
  const readSelection = useCallback((): TextRange => {
    const root = elementRef.current;
    const selection = root && document.getSelection();
    if (!selection || !selection.rangeCount) return rangeRef.current;
    const range = sourceRangeFromDom(root, selection.getRangeAt(0));
    if (!range) return rangeRef.current;
    rangeRef.current = range;
    return range;
  }, []);

  const host = useMemo<FormattingHost>(
    () => ({
      getValue: () => textRef.current,
      getSelection: readSelection,
      setSelection: (range, focus) => {
        const root = elementRef.current;
        if (!root) return;
        rangeRef.current = range;
        if (!focus && typingElsewhere(root)) return;
        const from = domPositionFromSource(root, range.start);
        const to = domPositionFromSource(root, range.end);
        if (!from || !to) return;
        const domRange = document.createRange();
        domRange.setStart(from.node, from.offset);
        domRange.setEnd(to.node, to.offset);
        if (focus) root.focus({ preventScroll: true });
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(domRange);
      },
    }),
    [readSelection],
  );

  useEffect(() => {
    if (!element) return;
    bind(host);
    return () => bind(null);
  }, [element, bind, host]);

  useEffect(() => {
    if (!element) return;
    const onSelectionChange = () => {
      const selection = document.getSelection();
      const anchor = selection?.anchorNode;
      if (!selection || !anchor || !element.contains(anchor)) {
        setSelectionRect(null);
        return;
      }
      syncSelection();
      const range = selection.getRangeAt(0);
      setSelectionRect(range.collapsed ? null : range.getBoundingClientRect());
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      setSelectionRect(null);
    };
  }, [element, syncSelection]);

  // The toolbar hangs off the highlight, so it has to follow it while the
  // panel scrolls or the window changes shape.
  const highlighted = selectionRect !== null;
  useEffect(() => {
    if (!highlighted) return;
    const reposition = () => {
      const root = elementRef.current;
      const selection = document.getSelection();
      if (!root || !selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (range.collapsed || !root.contains(range.startContainer)) return;
      setSelectionRect(range.getBoundingClientRect());
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [highlighted]);

  useEffect(() => {
    if (!element) return;

    const targetRange = (event: InputEvent): TextRange | null => {
      const ranges = event.getTargetRanges?.() ?? [];
      if (!ranges.length) return null;
      const first = ranges[0];
      const last = ranges[ranges.length - 1];
      const start = sourceOffsetFromDom(
        element,
        first.startContainer,
        first.startOffset,
      );
      const end = sourceOffsetFromDom(
        element,
        last.endContainer,
        last.endOffset,
      );
      if (start === null || end === null) return null;
      return { start: Math.min(start, end), end: Math.max(start, end) };
    };

    const insert = (value: string) => {
      if (!value) return;
      runCommand((current, start, end) =>
        replaceRange(current, start, end, value),
      );
    };

    const onBeforeInput = (event: InputEvent) => {
      const { inputType } = event;
      // Composition is left to the IME and reconciled when it commits.
      if (inputType.endsWith("CompositionText")) return;

      event.preventDefault();
      if (inputType === "historyUndo") {
        undo();
        return;
      }
      if (inputType === "historyRedo") {
        redo();
        return;
      }

      switch (inputType) {
        case "insertText":
        case "insertReplacementText":
          insert(event.data ?? clipboardText(event.dataTransfer));
          return;
        case "insertParagraph":
        case "insertLineBreak":
          insert("\n");
          return;
        case "insertFromPaste":
        case "insertFromPasteAsQuotation":
        case "insertFromDrop":
        case "insertFromYank":
          insert(clipboardText(event.dataTransfer));
          return;
        case "deleteContentBackward":
          runCommand(deleteBackward);
          return;
        case "deleteContentForward":
          runCommand(deleteForward);
          return;
        default: {
          if (!inputType.startsWith("delete")) return;
          const range = targetRange(event);
          runCommand((current, start, end) =>
            range
              ? replaceRange(current, range.start, range.end, "")
              : replaceRange(current, start, end, ""),
          );
        }
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      insert(clipboardText(event.clipboardData));
    };

    const onCompositionStart = () => {
      compositionRef.current = readSelection();
    };

    const onCompositionEnd = (event: CompositionEvent) => {
      const range = compositionRef.current;
      compositionRef.current = null;
      if (!range) return;
      const composed = event.data ?? "";
      runCommand((current) =>
        replaceRange(current, range.start, range.end, composed),
      );
    };

    element.addEventListener("beforeinput", onBeforeInput);
    element.addEventListener("paste", onPaste);
    element.addEventListener("compositionstart", onCompositionStart);
    element.addEventListener("compositionend", onCompositionEnd);
    return () => {
      element.removeEventListener("beforeinput", onBeforeInput);
      element.removeEventListener("paste", onPaste);
      element.removeEventListener("compositionstart", onCompositionStart);
      element.removeEventListener("compositionend", onCompositionEnd);
    };
  }, [element, runCommand, readSelection, undo, redo]);

  return { ref, onKeyDown: handleKeyDown, selectionRect };
}
