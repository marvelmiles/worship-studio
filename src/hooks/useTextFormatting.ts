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

export interface FormattingHost {
  getValue: () => string;
  getSelection: () => TextRange;
  setSelection: (range: TextRange, focus: boolean) => void;
}

export type TextCommand = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
) => EditResult | null;

export interface TextChangeMeta {
  caret: TextRange;
  typing: boolean;
  coalesceKey?: string;
}

export interface EditHistory {
  canUndo: boolean;
  canRedo: boolean;
  undo: (caret: TextRange | null) => TextRange | null;
  redo: (caret: TextRange | null) => TextRange | null;
}

export interface TextFormattingController {
  bind: (target: HTMLTextAreaElement | FormattingHost | null) => void;
  ready: boolean;
  hasSelection: boolean;
  lines: LineSelection;
  isActive: (name: InlineFormatName) => boolean;
  toggle: (name: InlineFormatName) => void;
  clear: () => void;
  style: InlineTextStyle;
  applyStyle: (key: InlineStyleKey, value: unknown) => void;
  list: ListState;
  toggleList: (kind: ListKind) => void;
  indent: () => void;
  outdent: () => void;
  runCommand: (
    command: TextCommand,
    focus?: boolean,
    coalesceKey?: string,
  ) => boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  syncSelection: () => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

interface Options {
  value: string;
  onChange: (next: string, meta: TextChangeMeta) => void;
  history?: EditHistory;
}

interface Snapshot {
  text: string;
  selection: TextRange;
}

const HISTORY_LIMIT = 200;
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

export const useTextFormatting = ({
  value,
  onChange,
  history,
}: Options): TextFormattingController => {
  const hostRef = useRef<FormattingHost | null>(null);
  const pendingRef = useRef<(TextRange & { focus: boolean }) | null>(null);
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const typingRef = useRef({ at: 0, active: false });
  const writtenRef = useRef(value);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<TextRange>({ start: 0, end: 0 });
  const [ownDepth, setOwnDepth] = useState({ past: 0, future: 0 });

  const syncOwnDepth = useCallback(
    () =>
      setOwnDepth((current) => {
        const past = pastRef.current.length;
        const future = futureRef.current.length;
        return current.past === past && current.future === future
          ? current
          : { past, future };
      }),
    [],
  );

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

  useEffect(() => {
    if (history || value === writtenRef.current) return;
    writtenRef.current = value;
    pastRef.current = [];
    futureRef.current = [];
    typingRef.current = { at: 0, active: false };
    syncOwnDepth();
  }, [value, history, syncOwnDepth]);

  const write = useCallback(
    (snapshot: Snapshot, focus: boolean, meta: TextChangeMeta) => {
      writtenRef.current = snapshot.text;
      pendingRef.current = { ...snapshot.selection, focus };
      onChange(snapshot.text, meta);
    },
    [onChange],
  );

  const run = useCallback(
    (command: TextCommand, focus = true, coalesceKey?: string) => {
      const host = hostRef.current;
      if (!host) return false;
      const current = host.getValue();
      const { start, end } = host.getSelection();
      const result = command(current, start, end);
      if (!result || result.text === current) return false;

      const typing = Math.abs(result.text.length - current.length) === 1;
      const at = Date.now();

      if (!history) {
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
        syncOwnDepth();
      }

      write(
        {
          text: result.text,
          selection: { start: result.selectionStart, end: result.selectionEnd },
        },
        focus,
        { caret: { start, end }, typing, coalesceKey },
      );
      return true;
    },
    [write, history, syncOwnDepth],
  );

  const step = useCallback(
    (from: Snapshot[], to: Snapshot[]) => {
      const host = hostRef.current;
      const previous = from.pop();
      if (!host || !previous) return;
      const caret = host.getSelection();
      to.push({ text: host.getValue(), selection: caret });
      typingRef.current = { at: 0, active: false };
      syncOwnDepth();
      write(previous, true, { caret, typing: false });
    },
    [write, syncOwnDepth],
  );

  const restore = useCallback((caret: TextRange | null) => {
    if (caret) pendingRef.current = { ...caret, focus: true };
  }, []);

  const undo = useCallback(() => {
    if (history) {
      restore(history.undo(hostRef.current?.getSelection() ?? null));
      return;
    }
    step(pastRef.current, futureRef.current);
  }, [history, restore, step]);

  const redo = useCallback(() => {
    if (history) {
      restore(history.redo(hostRef.current?.getSelection() ?? null));
      return;
    }
    step(futureRef.current, pastRef.current);
  }, [history, restore, step]);

  const canUndo = history ? history.canUndo : ownDepth.past > 0;
  const canRedo = history ? history.canRedo : ownDepth.future > 0;

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
        `style:${key}`,
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
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        if (run((text, start, end) => newLineInList(text, start, end)))
          event.preventDefault();
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") {
        const redoing = key === "y" || event.shiftKey;
        if (!(redoing ? canRedo : canUndo)) return;
        event.preventDefault();
        if (redoing) redo();
        else undo();
        return;
      }
      if (event.shiftKey) return;
      const name = inlineFormatForShortcut(event.key);
      if (!name) return;
      event.preventDefault();
      toggle(name);
    },
    [run, toggle, undo, redo, canUndo, canRedo],
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
    canUndo,
    canRedo,
    undo,
    redo,
    syncSelection,
    handleKeyDown,
  };
};
