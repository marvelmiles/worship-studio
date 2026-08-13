import { useRef } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { ChevronUp, ChevronDown, Copy, Trash2 } from "lucide-react";
import type { SlideMedia, SlideMediaFrame } from "../../types";
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

/** Percent of the slide one arrow-key press moves a placement. */
const NUDGE = 1;
const NUDGE_FAST = 5;
/** A box at least this far from the top has room for its toolbar above it. */
const TOOLBAR_ABOVE_FROM = 14;
/** Marks the draggable box, so a grip can hand focus back to the box it belongs to. */
const BOX_ATTRIBUTE = "data-slide-media";

interface Gesture {
  mediaId: string;
  handle: HandleId | "move";
  frame: SlideMediaFrame;
  pointerX: number;
  pointerY: number;
  slideWidth: number;
  slideHeight: number;
}

/** Everything the editor supplies to make placed media interactive. */
export interface SlideMediaEditing {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called continuously while dragging; `gesture` groups it into one undo step. */
  onFrameChange: (
    mediaId: string,
    frame: SlideMediaFrame,
    gesture: string,
  ) => void;
  onDuplicate: (mediaId: string) => void;
  onDelete: (mediaId: string) => void;
  onReorder: (mediaId: string, direction: number) => void;
}

interface SlideMediaOverlayProps extends SlideMediaEditing {
  media: SlideMedia[];
}

/**
 * Resizes a frame by one grip. The edges being dragged move; the opposite ones
 * stay put, and an edge pushed past its opposite stops at the minimum size
 * instead of turning the box inside out.
 */
function resizeFrame(
  start: SlideMediaFrame,
  handle: HandleId,
  dx: number,
  dy: number,
): SlideMediaFrame {
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
 * The editor's handle on the pictures and clips a slide carries. It sits over
 * the canvas rather than inside it, so the slide itself renders exactly the same
 * whether it is being edited or projected: only this layer knows about
 * selection, dragging and resizing.
 *
 * Everything outside a placed item stays click-through, which is what keeps the
 * text underneath editable while media is on the slide.
 */
export function SlideMediaOverlay({
  media,
  selectedId,
  onSelect,
  onFrameChange,
  onDuplicate,
  onDelete,
  onReorder,
}: SlideMediaOverlayProps) {
  const { colors } = useUITheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const begin = (
    event: PointerEvent<HTMLElement>,
    placed: SlideMedia,
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
    onSelect(placed.id);
    gesture.current = {
      mediaId: placed.id,
      handle,
      frame: placed.frame,
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
    onFrameChange(active.mediaId, frame, active.handle);
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    if (!gesture.current) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeys = (
    event: KeyboardEvent<HTMLElement>,
    placed: SlideMedia,
  ) => {
    const step = event.shiftKey ? NUDGE_FAST : NUDGE;
    const nudge = (dx: number, dy: number) => {
      event.preventDefault();
      onFrameChange(
        placed.id,
        clampFrame({
          ...placed.frame,
          x: placed.frame.x + dx,
          y: placed.frame.y + dy,
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
        return onDelete(placed.id);
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
      {media.map((placed) => {
        const selected = placed.id === selectedId;
        const boxStyle: CSSProperties = {
          position: "absolute",
          left: `${placed.frame.x}%`,
          top: `${placed.frame.y}%`,
          width: `${placed.frame.width}%`,
          height: `${placed.frame.height}%`,
          pointerEvents: "auto",
          cursor: "move",
          touchAction: "none",
          outline: selected
            ? `2px solid ${colors.accent}`
            : `1px dashed ${fade(colors.accent, 0.45)}`,
          outlineOffset: 1,
          background: "transparent",
        };
        return (
          <div
            key={placed.id}
            {...{ [BOX_ATTRIBUTE]: placed.id }}
            role="button"
            tabIndex={0}
            aria-label={`Placed ${placed.kind}. Drag to move, arrow keys to nudge.`}
            aria-pressed={selected}
            style={boxStyle}
            onPointerDown={(event) => begin(event, placed, "move")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(event) => handleKeys(event, placed)}
            onFocus={() => onSelect(placed.id)}
          >
            {selected && (
              <>
                <Toolbar
                  below={placed.frame.y < TOOLBAR_ABOVE_FROM}
                  onDuplicate={() => onDuplicate(placed.id)}
                  onDelete={() => onDelete(placed.id)}
                  onForward={() => onReorder(placed.id, 1)}
                  onBackward={() => onReorder(placed.id, -1)}
                />
                {HANDLES.map((handle) => (
                  <span
                    key={handle.id}
                    onPointerDown={(event) => begin(event, placed, handle.id)}
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
