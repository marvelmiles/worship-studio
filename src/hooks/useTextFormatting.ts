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
import type { LineSelection, TextRange } from "../lib/textRange";

/**
 * The editing surface a command runs against. A textarea is one; the slide
 * canvas is another, mapping its rendered runs back onto raw offsets. Anything
 * that can report its text and its caret can be formatted.
 */
export interface FormattingHost {
  getValue: () => string;
  getSelection: () => TextRange;
  setSelection: (range: TextRange, focus: boolean) => void;
}

/** A command's result, or null when it does not apply. */
export type TextCommand = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
) => EditResult | null;

export interface TextFormattingController {
  /** Attach the surface the toolbar should format, as a ref or a custom host. */
  bind: (target: HTMLTextAreaElement | FormattingHost | null) => void;
  /** False until a surface is attached, used to disable the toolbar. */
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
  /** Runs any text command against the bound surface, carrying the caret over. */
  runCommand: (command: TextCommand, focus?: boolean) => boolean;
  undo: () => void;
  redo: () => void;
  /** Wire to the surface's selection events so button states follow the caret. */
  syncSelection: () => void;
  /** Wire to the surface's onKeyDown for Ctrl+B, Tab, Enter and friends. */
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

interface Options {
  value: string;
  onChange: (next: string) => void;
}

interface Snapshot {
  text: string;
  selection: TextRange;
}

/** Steps kept per surface, plenty for an editing session and bounded in memory. */
const HISTORY_LIMIT = 200;
/** Runs of typing this close together undo as one step, the way Word groups them. */
const COALESCE_MS = 600;

const textAreaHost = (element: HTMLTextAreaElement): FormattingHost => ({
  getValue: () => element.value,
  getSelection: () => ({
    start: element.selectionStart ?? 0,
    end: element.selectionEnd ?? 0,
  }),
  setSelection: ({ start, end }, focus) => {
    if (focus) element.focus();
    element.setSelectionRange(start, end);
  },
});

const isTextArea = (
  target: HTMLTextAreaElement | FormattingHost,
): target is HTMLTextAreaElement =>
  typeof HTMLTextAreaElement !== "undefined" &&
  target instanceof HTMLTextAreaElement;

/**
 * Drives word-processor editing for a text surface: emphasis, character
 * styling, lists and indentation.
 *
 * The surface stays a controlled component. A command rewrites its value
 * through `onChange` and the caret is put back where the command left it once
 * React has re-rendered, so editing feels like Word rather than like a text
 * replacement. Commands run from a side panel restore the selection without
 * stealing focus, so a slider can keep being dragged.
 */
export function useTextFormatting({
  value,
  onChange,
}: Options): TextFormattingController {
  const hostRef = useRef<FormattingHost | null>(null);
  const pendingRef = useRef<(TextRange & { focus: boolean }) | null>(null);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const typingRef = useRef({ at: 0, active: false });
  /** What the last command produced, so an edit from elsewhere is recognisable. */
  const writtenRef = useRef(value);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<TextRange>({ start: 0, end: 0 });

  const bind = useCallback(
    (target: HTMLTextAreaElement | FormattingHost | null) => {
      hostRef.current = target
        ? isTextArea(target)
          ? textAreaHost(target)
          : target
        : null;
      setReady(Boolean(target));
      if (!target) setSelection({ start: 0, end: 0 });
    },
    [],
  );

  const syncSelection = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const next = host.getSelection();
    setSelection((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const pending = pendingRef.current;
    if (!host || !pending) return;
    pendingRef.current = null;
    host.setSelection(pending, pending.focus);
    setSelection({ start: pending.start, end: pending.end });
  }, [value]);

  // Text that arrived from anywhere but a command, a switch to another slide
  // above all, starts a new history: there is nothing here left to undo.
  useEffect(() => {
    if (value === writtenRef.current) return;
    writtenRef.current = value;
    pastRef.current = [];
    futureRef.current = [];
    typingRef.current = { at: 0, active: false };
  }, [value]);

  const write = useCallback(
    (snapshot: Snapshot, focus: boolean) => {
      writtenRef.current = snapshot.text;
      pendingRef.current = { ...snapshot.selection, focus };
      onChange(snapshot.text);
    },
    [onChange],
  );

  const run = useCallback(
    (command: TextCommand, focus = true) => {
      const host = hostRef.current;
      if (!host) return false;
      // The surface is the authority on the caret: it survives a toolbar click
      // and is always in step with the text the user is looking at.
      const current = host.getValue();
      const { start, end } = host.getSelection();
      const result = command(current, start, end);
      if (!result || result.text === current) return false;

      const typing = Math.abs(result.text.length - current.length) === 1;
      const at = Date.now();
      const coalesce =
        typing &&
        typingRef.current.active &&
        at - typingRef.current.at < COALESCE_MS;
      if (!coalesce) {
        pastRef.current.push({ text: current, selection: { start, end } });
        if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      }
      typingRef.current = { at, active: typing };
      futureRef.current = [];

      write(
        {
          text: result.text,
          selection: { start: result.selectionStart, end: result.selectionEnd },
        },
        focus,
      );
      return true;
    },
    [write],
  );

  const step = useCallback(
    (from: Snapshot[], to: Snapshot[]) => {
      const host = hostRef.current;
      const previous = from.pop();
      if (!host || !previous) return;
      to.push({ text: host.getValue(), selection: host.getSelection() });
      typingRef.current = { at: 0, active: false };
      write(previous, true);
    },
    [write],
  );

  const undo = useCallback(
    () => step(pastRef.current, futureRef.current),
    [step],
  );

  const redo = useCallback(
    () => step(futureRef.current, pastRef.current),
    [step],
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
    (event: ReactKeyboardEvent<HTMLElement>) => {
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
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") {
        const redoing = key === "y" || event.shiftKey;
        // With nothing of our own to step back through, a surface that keeps
        // its own history (a textarea) is left to use it.
        if (!(redoing ? futureRef.current : pastRef.current).length) return;
        event.preventDefault();
        if (redoing) redo();
        else undo();
        return;
      }
      const name = inlineFormatForShortcut(event.key);
      if (!name) return;
      event.preventDefault();
      toggle(name);
    },
    [run, toggle, undo, redo],
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
    runCommand: run,
    undo,
    redo,
    syncSelection,
    handleKeyDown,
  };
}
