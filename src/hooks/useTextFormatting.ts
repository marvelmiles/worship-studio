import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  clearInlineFormatting,
  inlineFormatForShortcut,
  isInlineFormatActive,
  toggleInlineFormat,
} from "../lib/textFormatting";
import type { FormattingResult, InlineFormatName } from "../lib/textFormatting";

interface Selection {
  start: number;
  end: number;
}

export interface TextFormattingController {
  /** Attach to the textarea the toolbar should format. */
  bind: (element: HTMLTextAreaElement | null) => void;
  /** False until a textarea is attached, used to disable the toolbar. */
  ready: boolean;
  isActive: (name: InlineFormatName) => boolean;
  toggle: (name: InlineFormatName) => void;
  clear: () => void;
  /** Wire to the textarea's onSelect/onClick so button states follow the caret. */
  syncSelection: () => void;
  /** Wire to the textarea's onKeyDown for Ctrl+B / Ctrl+I / Ctrl+U and friends. */
  handleKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

interface Options {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Drives the formatting toolbar for a plain-text editor. The textarea stays a
 * controlled component: a command rewrites its value through `onChange`, and
 * the caret is put back where the command left it once React has re-rendered,
 * so formatting feels like a word processor rather than a text replacement.
 */
export function useTextFormatting({
  value,
  onChange,
}: Options): TextFormattingController {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingRef = useRef<Selection | null>(null);
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
    element.focus();
    element.setSelectionRange(pending.start, pending.end);
    setSelection(pending);
  }, [value]);

  const run = useCallback(
    (
      command: (text: string, start: number, end: number) => FormattingResult,
    ) => {
      const element = elementRef.current;
      if (!element) return;
      // The element is the authority on the caret: it survives a toolbar click
      // and is always in step with the text the user is looking at.
      const result = command(
        element.value,
        element.selectionStart ?? 0,
        element.selectionEnd ?? 0,
      );
      if (result.text === element.value) return;
      pendingRef.current = {
        start: result.selectionStart,
        end: result.selectionEnd,
      };
      onChange(result.text);
    },
    [onChange],
  );

  const toggle = useCallback(
    (name: InlineFormatName) =>
      run((text, start, end) => toggleInlineFormat(text, start, end, name)),
    [run],
  );

  const clear = useCallback(() => run(clearInlineFormatting), [run]);

  const isActive = useCallback(
    (name: InlineFormatName) =>
      isInlineFormatActive(value, selection.start, selection.end, name),
    [value, selection],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey) return;
      const name = inlineFormatForShortcut(event.key);
      if (!name) return;
      event.preventDefault();
      toggle(name);
    },
    [toggle],
  );

  return { bind, ready, isActive, toggle, clear, syncSelection, handleKeyDown };
}
