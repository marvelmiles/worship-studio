import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  clearInlineFormatting,
  inlineFormatForShortcut,
  isInlineFormatActive,
  toggleInlineFormat,
} from "../lib/textFormatting";
import type { InlineFormatName } from "../lib/textFormatting";
import { applyInlineStyle, inlineStyleAt } from "../lib/inlineEdit";
import type { EditResult } from "../lib/inlineEdit";
import type { InlineStyleKey, InlineTextStyle } from "../lib/inlineStyle";
import {
  listStateAt,
  newLineInList,
  tabInList,
  toggleList,
} from "../lib/listCommands";
import type { ListState } from "../lib/listCommands";
import type { ListKind } from "../lib/lists";
import { selectedLines } from "../lib/textRange";
import type { LineSelection } from "../lib/textRange";

interface Selection {
  start: number;
  end: number;
}

/** A command's result plus whether the editor should take focus back. */
type Command = (text: string, start: number, end: number) => EditResult | null;

export interface TextFormattingController {
  /** Attach to the textarea the toolbar should format. */
  bind: (element: HTMLTextAreaElement | null) => void;
  /** False until a textarea is attached, used to disable the toolbar. */
  ready: boolean;
  /** True while text is highlighted, which is what puts panels in selection mode. */
  hasSelection: boolean;
  /** The lines the selection touches, for paragraph-level styling. */
  lines: LineSelection;
  isActive: (name: InlineFormatName) => boolean;
  toggle: (name: InlineFormatName) => void;
  clear: () => void;
  /** Character-level style shared by everything highlighted. */
  style: InlineTextStyle;
  /** Applies one character-level property to the highlighted text. */
  applyStyle: (key: InlineStyleKey, value: unknown) => void;
  list: ListState;
  toggleList: (kind: ListKind) => void;
  indent: () => void;
  outdent: () => void;
  /** Wire to the textarea's onSelect/onClick so button states follow the caret. */
  syncSelection: () => void;
  /** Wire to the textarea's onKeyDown for Ctrl+B, Tab, Enter and friends. */
  handleKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

interface Options {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Drives word-processor editing for a plain-text editor: emphasis, character
 * styling, lists and indentation.
 *
 * The textarea stays a controlled component. A command rewrites its value
 * through `onChange` and the caret is put back where the command left it once
 * React has re-rendered, so editing feels like Word rather than like a text
 * replacement. Commands run from a side panel restore the selection without
 * stealing focus, so a slider can keep being dragged.
 */
export function useTextFormatting({
  value,
  onChange,
}: Options): TextFormattingController {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingRef = useRef<(Selection & { focus: boolean }) | null>(null);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });

  const bind = useCallback((element: HTMLTextAreaElement | null) => {
    elementRef.current = element;
    setReady(Boolean(element));
  }, []);

  const syncSelection = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    setSelection({
      start: element.selectionStart ?? 0,
      end: element.selectionEnd ?? 0,
    });
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    const pending = pendingRef.current;
    if (!element || !pending) return;
    pendingRef.current = null;
    if (pending.focus) element.focus();
    element.setSelectionRange(pending.start, pending.end);
    setSelection({ start: pending.start, end: pending.end });
  }, [value]);

  const run = useCallback(
    (command: Command, focus = true) => {
      const element = elementRef.current;
      if (!element) return false;
      // The element is the authority on the caret: it survives a toolbar click
      // and is always in step with the text the user is looking at.
      const result = command(
        element.value,
        element.selectionStart ?? 0,
        element.selectionEnd ?? 0,
      );
      if (!result || result.text === element.value) return false;
      pendingRef.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
        focus,
      };
      onChange(result.text);
      return true;
    },
    [onChange],
  );

  const toggle = useCallback(
    (name: InlineFormatName) =>
      void run((text, start, end) =>
        toggleInlineFormat(text, start, end, name),
      ),
    [run],
  );

  const clear = useCallback(() => void run(clearInlineFormatting), [run]);

  const applyStyle = useCallback(
    (key: InlineStyleKey, value_: unknown) =>
      void run(
        (text, start, end) => applyInlineStyle(text, start, end, key, value_),
        false,
      ),
    [run],
  );

  const applyList = useCallback(
    (kind: ListKind) =>
      void run((text, start, end) => toggleList(text, start, end, kind)),
    [run],
  );

  const indent = useCallback(
    () => void run((text, start, end) => tabInList(text, start, end, false)),
    [run],
  );

  const outdent = useCallback(
    () => void run((text, start, end) => tabInList(text, start, end, true)),
    [run],
  );

  const isActive = useCallback(
    (name: InlineFormatName) =>
      isInlineFormatActive(value, selection.start, selection.end, name),
    [value, selection],
  );

  const style = useMemo(
    () => inlineStyleAt(value, selection.start, selection.end),
    [value, selection],
  );

  const list = useMemo(
    () => listStateAt(value, selection.start, selection.end),
    [value, selection],
  );

  const lines = useMemo(
    () => selectedLines(value, selection.start, selection.end),
    [value, selection],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Tab") {
        event.preventDefault();
        run((text, start, end) => tabInList(text, start, end, event.shiftKey));
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        if (run((text, start, end) => newLineInList(text, start, end)))
          event.preventDefault();
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey) return;
      const name = inlineFormatForShortcut(event.key);
      if (!name) return;
      event.preventDefault();
      toggle(name);
    },
    [run, toggle],
  );

  return {
    bind,
    ready,
    hasSelection: selection.end > selection.start,
    lines,
    isActive,
    toggle,
    clear,
    style,
    applyStyle,
    list,
    toggleList: applyList,
    indent,
    outdent,
    syncSelection,
    handleKeyDown,
  };
}
