import { useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SlideElementKind, SlideFrame } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { clampFrame, MIN_FRAME_SIZE } from "../../lib/slideMedia";
import { keepsSelection } from "../../lib/selectionScope";

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { id: HandleId; x: number; y: number; cursor: string }[] = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "n", x: 0.5, y: 0, cursor: "ns-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "e", x: 1, y: 0.5, cursor: "ew-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
  { id: "s", x: 0.5, y: 1, cursor: "ns-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "w", x: 0, y: 0.5, cursor: "ew-resize" },
];

const EDGE_BAND = 11;
const EDGES: { id: string; style: CSSProperties }[] = [
  { id: "top", style: { top: 0, left: 0, right: 0, height: EDGE_BAND } },
  { id: "bottom", style: { bottom: 0, left: 0, right: 0, height: EDGE_BAND } },
  { id: "left", style: { top: 0, bottom: 0, left: 0, width: EDGE_BAND } },
  { id: "right", style: { top: 0, bottom: 0, right: 0, width: EDGE_BAND } },
];

const NUDGE = 1;
const NUDGE_FAST = 5;
const TOOLBAR_ABOVE_FROM = 14;
const BOX_ATTRIBUTE = "data-slide-element";

const LABELS: Record<string, string> = {
  image: "Placed image",
  video: "Placed video",
  text: "Text box",
};

interface Gesture<Kind extends string> {
  element: SlideElementRef<Kind>;
  handle: HandleId | "move";
  frame: SlideFrame;
  pointerX: number;
  pointerY: number;
  slideWidth: number;
  slideHeight: number;
}

export interface SlideElementRef<Kind extends string = SlideElementKind> {
  id: string;
  kind: Kind;
}

export interface SlideElement<
  Kind extends string = SlideElementKind,
> extends SlideElementRef<Kind> {
  frame: SlideFrame;
  label?: string;
  dragFromInterior?: boolean;
}

export interface SlideElementEditing<Kind extends string = SlideElementKind> {
  selectedId: string | null;
  onSelect: (element: SlideElementRef<Kind> | null) => void;
  onFrameChange: (
    element: SlideElementRef<Kind>,
    frame: SlideFrame,
    gesture: string,
  ) => void;
  onDuplicate: (element: SlideElementRef<Kind>) => void;
  onDelete: (element: SlideElementRef<Kind>) => void;
  /** Omitted where the elements have no meaningful front-to-back order. */
  onReorder?: (element: SlideElementRef<Kind>, direction: number) => void;
}

interface SlideElementOverlayProps<
  Kind extends string,
> extends SlideElementEditing<Kind> {
  elements: SlideElement<Kind>[];
  frameOnFocus?: boolean;
}

const resizeFrame = (
  start: SlideFrame,
  handle: HandleId,
  dx: number,
  dy: number,
): SlideFrame => {
  const frame = { ...start };

  if (handle.includes("w")) {
    frame.width = Math.max(MIN_FRAME_SIZE, start.width - dx);
    frame.x = start.x + start.width - frame.width;
  } else if (handle.includes("e")) {
    frame.width = Math.max(MIN_FRAME_SIZE, start.width + dx);
  }

  if (handle.includes("n")) {
    frame.height = Math.max(MIN_FRAME_SIZE, start.height - dy);
    frame.y = start.y + start.height - frame.height;
  } else if (handle.includes("s")) {
    frame.height = Math.max(MIN_FRAME_SIZE, start.height + dy);
  }

  return clampFrame(frame);
};

const interiorDrags = <Kind extends string>(
  element: SlideElement<Kind>,
  selected: boolean,
): boolean =>
  element.dragFromInterior ??
  (element.kind === "image" || (element.kind === "video" && !selected));

export const SlideElementOverlay = <Kind extends string = SlideElementKind>({
  elements,
  selectedId,
  onSelect,
  onFrameChange,
  onDuplicate,
  onDelete,
  onReorder,
  frameOnFocus,
}: SlideElementOverlayProps<Kind>) => {
  const { colors } = useUITheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture<Kind> | null>(null);

  const focusLeft = (next: EventTarget | null): boolean => {
    const element = next instanceof HTMLElement ? next : null;
    if (!element) return true;
    if (rootRef.current?.contains(element)) return false;
    return !keepsSelection(element);
  };

  const begin = (
    event: PointerEvent<HTMLElement>,
    element: SlideElement<Kind>,
    handle: HandleId | "move",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const slide = rootRef.current?.getBoundingClientRect();
    if (!slide) return;
    event.currentTarget
      .closest<HTMLElement>(`[${BOX_ATTRIBUTE}]`)
      ?.focus({ preventScroll: true });
    onSelect({ id: element.id, kind: element.kind });
    gesture.current = {
      element: { id: element.id, kind: element.kind },
      handle,
      frame: element.frame,
      pointerX: event.clientX,
      pointerY: event.clientY,
      slideWidth: slide.width,
      slideHeight: slide.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLElement>) => {
    const active = gesture.current;
    if (!active) return;
    const dx = ((event.clientX - active.pointerX) / active.slideWidth) * 100;
    const dy = ((event.clientY - active.pointerY) / active.slideHeight) * 100;
    const frame =
      active.handle === "move"
        ? clampFrame({
            ...active.frame,
            x: active.frame.x + dx,
            y: active.frame.y + dy,
          })
        : resizeFrame(active.frame, active.handle, dx, dy);
    onFrameChange(active.element, frame, active.handle);
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    if (!gesture.current) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeys = (
    event: KeyboardEvent<HTMLElement>,
    element: SlideElement<Kind>,
  ) => {
    const step = event.shiftKey ? NUDGE_FAST : NUDGE;
    const nudge = (dx: number, dy: number) => {
      event.preventDefault();
      onFrameChange(
        element,
        clampFrame({
          ...element.frame,
          x: element.frame.x + dx,
          y: element.frame.y + dy,
        }),
        "keyboard",
      );
    };
    switch (event.key) {
      case "ArrowLeft":
        return nudge(-step, 0);
      case "ArrowRight":
        return nudge(step, 0);
      case "ArrowUp":
        return nudge(0, -step);
      case "ArrowDown":
        return nudge(0, step);
      case "Delete":
      case "Backspace":
        event.preventDefault();
        return onDelete(element);
      case "Escape":
        event.preventDefault();
        return onSelect(null);
      default:
        return undefined;
    }
  };

  return (
    <div
      ref={rootRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {elements.map((element) => {
        const selected = element.id === selectedId;
        const grabbable = interiorDrags(element, selected);
        const boxStyle: CSSProperties = {
          position: "absolute",
          left: `${element.frame.x}%`,
          top: `${element.frame.y}%`,
          width: `${element.frame.width}%`,
          height: `${element.frame.height}%`,
          pointerEvents: grabbable ? "auto" : "none",
          cursor: grabbable ? "move" : undefined,
          touchAction: "none",
          outline: selected
            ? `2px solid ${colors.accent}`
            : frameOnFocus
              ? undefined
              : `1px dashed ${fade(colors.accent, 0.45)}`,
          outlineOffset: 1,
          background: "transparent",
        };
        return (
          <div
            key={element.id}
            {...{ [BOX_ATTRIBUTE]: element.id }}
            role="button"
            tabIndex={0}
            aria-label={`${element.label ?? LABELS[element.kind] ?? "Element"}. Drag to move, arrow keys to nudge.`}
            aria-pressed={selected}
            style={boxStyle}
            onPointerDown={
              grabbable ? (event) => begin(event, element, "move") : undefined
            }
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(event) => handleKeys(event, element)}
            onFocus={() => onSelect({ id: element.id, kind: element.kind })}
            onBlur={
              frameOnFocus
                ? (event) => {
                    if (selected && focusLeft(event.relatedTarget))
                      onSelect(null);
                  }
                : undefined
            }
          >
            {!grabbable &&
              EDGES.map((edge) => (
                <span
                  key={edge.id}
                  onPointerDown={(event) => begin(event, element, "move")}
                  style={{
                    position: "absolute",
                    ...edge.style,
                    pointerEvents: "auto",
                    cursor: "move",
                    touchAction: "none",
                  }}
                />
              ))}
            {selected && (
              <>
                <Toolbar
                  below={element.frame.y < TOOLBAR_ABOVE_FROM}
                  onDuplicate={() => onDuplicate(element)}
                  onDelete={() => onDelete(element)}
                  onForward={
                    onReorder ? () => onReorder(element, 1) : undefined
                  }
                  onBackward={
                    onReorder ? () => onReorder(element, -1) : undefined
                  }
                />
                {HANDLES.map((handle) => (
                  <span
                    key={handle.id}
                    onPointerDown={(event) => begin(event, element, handle.id)}
                    style={{
                      position: "absolute",
                      left: `${handle.x * 100}%`,
                      top: `${handle.y * 100}%`,
                      width: 12,
                      height: 12,
                      marginLeft: -6,
                      marginTop: -6,
                      borderRadius: 3,
                      background: colors.accent,
                      border: `1.5px solid ${colors.onAccent}`,
                      pointerEvents: "auto",
                      cursor: handle.cursor,
                      touchAction: "none",
                    }}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface ToolbarProps {
  below: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onForward?: () => void;
  onBackward?: () => void;
}

interface ToolbarButton {
  icon: LucideIcon;
  label: string;
  fn: () => void;
  danger: boolean;
}

const Toolbar = ({
  below,
  onDuplicate,
  onDelete,
  onForward,
  onBackward,
}: ToolbarProps) => {
  const { colors } = useUITheme();
  const buttons: ToolbarButton[] = [
    ...(onForward
      ? [
          {
            icon: ChevronUp,
            label: "Bring forward",
            fn: onForward,
            danger: false,
          },
        ]
      : []),
    ...(onBackward
      ? [
          {
            icon: ChevronDown,
            label: "Send backward",
            fn: onBackward,
            danger: false,
          },
        ]
      : []),
    { icon: Copy, label: "Duplicate", fn: onDuplicate, danger: false },
    { icon: Trash2, label: "Delete", fn: onDelete, danger: true },
  ];
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        ...(below
          ? { top: "100%", marginTop: 8 }
          : { bottom: "100%", marginBottom: 8 }),
        display: "flex",
        gap: 2,
        padding: 3,
        borderRadius: 9,
        pointerEvents: "auto",
        background: colors.panelSolid,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 8px 22px rgba(0,0,0,0.4)",
      }}
    >
      {buttons.map(({ icon: Icon, label, fn, danger }) => (
        <button
          key={label}
          title={label}
          aria-label={label}
          onClick={fn}
          style={{
            display: "grid",
            placeItems: "center",
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: 7,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: danger ? colors.danger : colors.sub,
          }}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};
