import { useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import type { SlideElementKind, SlideFrame } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { clampFrame, MIN_FRAME_SIZE } from "../../lib/slideMedia";

/** Corner and edge grips, positioned as fractions of the box. */
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

/** The draggable band drawn along each edge, in pixels. */
const EDGE_BAND = 11;
const EDGES: { id: string; style: CSSProperties }[] = [
  { id: "top", style: { top: 0, left: 0, right: 0, height: EDGE_BAND } },
  { id: "bottom", style: { bottom: 0, left: 0, right: 0, height: EDGE_BAND } },
  { id: "left", style: { top: 0, bottom: 0, left: 0, width: EDGE_BAND } },
  { id: "right", style: { top: 0, bottom: 0, right: 0, width: EDGE_BAND } },
];

/** Percent of the slide one arrow-key press moves a placement. */
const NUDGE = 1;
const NUDGE_FAST = 5;
/** A box at least this far from the top has room for its toolbar above it. */
const TOOLBAR_ABOVE_FROM = 14;
/** Marks the draggable box, so a grip can hand focus back to the box it belongs to. */
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

/**
 * Identifies one placement, which is all a command needs to find it again.
 *
 * `Kind` is a type parameter because this overlay is the drag/resize surface for
 * more than the slide editor: the live broadcast lays passages, manuscripts and
 * announcement bands over a camera and needs the same gestures over its own
 * vocabulary of elements. It defaults to the slide editor's kinds, so every
 * existing caller is unchanged.
 */
export interface SlideElementRef<Kind extends string = SlideElementKind> {
  id: string;
  kind: Kind;
}

export interface SlideElement<
  Kind extends string = SlideElementKind,
> extends SlideElementRef<Kind> {
  frame: SlideFrame;
  /** Accessible name for this box; defaults to one derived from `kind`. */
  label?: string;
  /** Whether the middle of the box drags it; defaults by kind (see interiorDrags). */
  dragFromInterior?: boolean;
}

/** Everything a host supplies to make placements interactive. */
export interface SlideElementEditing<Kind extends string = SlideElementKind> {
  selectedId: string | null;
  onSelect: (element: SlideElementRef<Kind> | null) => void;
  /** Called continuously while dragging; `gesture` groups it into one undo step. */
  onFrameChange: (
    element: SlideElementRef<Kind>,
    frame: SlideFrame,
    gesture: string,
  ) => void;
  onDuplicate: (element: SlideElementRef<Kind>) => void;
  onDelete: (element: SlideElementRef<Kind>) => void;
  onReorder: (element: SlideElementRef<Kind>, direction: number) => void;
}

interface SlideElementOverlayProps<
  Kind extends string,
> extends SlideElementEditing<Kind> {
  elements: SlideElement<Kind>[];
}

/**
 * Resizes a frame by one grip. The edges being dragged move; the opposite ones
 * stay put, and an edge pushed past its opposite stops at the minimum size
 * instead of turning the box inside out.
 */
function resizeFrame(
  start: SlideFrame,
  handle: HandleId,
  dx: number,
  dy: number,
): SlideFrame {
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
}

/**
 * True while the middle of a placement should drag it. Text is written inside
 * its box and a selected clip shows its player, so those hand their middle back
 * to what is underneath and are moved by their edges instead, the way a text
 * box behaves in a slide editor.
 *
 * An element may state it outright, which is what a host with its own kinds
 * does: a broadcast overlay is never typed into, so all of its kinds drag from
 * the middle regardless of what they contain.
 */
const interiorDrags = <Kind extends string>(
  element: SlideElement<Kind>,
  selected: boolean,
): boolean =>
  element.dragFromInterior ??
  (element.kind === "image" || (element.kind === "video" && !selected));

/**
 * The editor's handle on everything placed on a slide: pictures, clips and text
 * boxes. It sits over the canvas rather than inside it, so the slide itself
 * renders exactly the same whether it is being edited or projected: only this
 * layer knows about selection, dragging and resizing.
 *
 * Everything outside a placement stays click-through, which is what keeps the
 * slide's own text editable while placements are on it.
 */
export function SlideElementOverlay<Kind extends string = SlideElementKind>({
  elements,
  selectedId,
  onSelect,
  onFrameChange,
  onDuplicate,
  onDelete,
  onReorder,
}: SlideElementOverlayProps<Kind>) {
  const { colors } = useUITheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture<Kind> | null>(null);

  const begin = (
    event: PointerEvent<HTMLElement>,
    element: SlideElement<Kind>,
    handle: HandleId | "move",
  ) => {
    // Without this the click lands in the text underneath and moves the caret.
    // Focus is then given to the box by hand, so the arrow keys reach it.
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
                  onForward={() => onReorder(element, 1)}
                  onBackward={() => onReorder(element, -1)}
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
}

interface ToolbarProps {
  below: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onForward: () => void;
  onBackward: () => void;
}

function Toolbar({
  below,
  onDuplicate,
  onDelete,
  onForward,
  onBackward,
}: ToolbarProps) {
  const { colors } = useUITheme();
  const buttons = [
    { icon: ChevronUp, label: "Bring forward", fn: onForward, danger: false },
    {
      icon: ChevronDown,
      label: "Send backward",
      fn: onBackward,
      danger: false,
    },
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
}
