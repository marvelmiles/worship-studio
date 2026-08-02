import { useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Background, Slide, SlideDeckDoc, Theme } from "../../types";
import { fade, colors, UI } from "../../theme/tokens";
import {
  resolveBackground,
  resolveLineStyle,
  resolveStyle,
} from "../../lib/resolve";
import { SlideCanvas } from "../../components/SlideCanvas";
import { FIXED_SHORTCUT_BY_TYPE, type TagGroup } from "../../lib/tagGroups";

interface SortableSlideListProps {
  slides: Slide[];
  selId: string | null;
  setSelId: (id: string) => void;
  doc: SlideDeckDoc;
  theme: Theme;
  bgMap: Record<string, Background>;
  onReorder: (next: Slide[]) => void;
  onContextMenu: (slideIndex: number, x: number, y: number) => void;
  tagGroups?: TagGroup[];
}

interface RowProps {
  slide: Slide;
  index: number;
  selId: string | null;
  setSelId: (id: string) => void;
  doc: SlideDeckDoc;
  theme: Theme;
  bgMap: Record<string, Background>;
  onContextMenu: (slideIndex: number, x: number, y: number) => void;
  shortcutNum?: number;
  fixedShortcut?: { letter: string; label: string };
}

const kbdKey: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "ui-monospace, monospace",
  fontSize: 8,
  fontWeight: 800,
  borderRadius: 3,
  padding: "1px 4px",
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderBottom: "2px solid rgba(255,255,255,0.3)",
  color: "#ffffff",
  lineHeight: 1.4,
  letterSpacing: 0.2,
};

const badgeWrap: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  whiteSpace: "nowrap",
};

function ShortcutBadge({
  label,
  title,
  highlight,
}: {
  label: string;
  title: string;
  highlight?: boolean;
}) {
  return (
    <span title={title} style={badgeWrap}>
      <span
        style={{
          ...kbdKey,
          ...(highlight
            ? {
                background: fade(colors.accent, 0.2),
                border: `1px solid ${fade(colors.accent, 0.5)}`,
                borderBottom: `2px solid ${fade(colors.accent, 0.5)}`,
                color: colors.accent,
              }
            : {}),
        }}
      >
        Ctrl
      </span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: highlight ? colors.accent : "rgba(255,255,255,0.7)",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        +{label}
      </span>
    </span>
  );
}

function SortableRow({
  slide,
  index,
  selId,
  setSelId,
  doc,
  theme,
  bgMap,
  onContextMenu,
  shortcutNum,
  fixedShortcut,
}: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const selected = slide.id === selId;
  const allSlidesMode = doc.shortcutMode === "all-slides";

  const rowRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rowRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  // Keeps the active slide visible when something other than a click selects
  // it, such as the editor following a running presentation.
  useEffect(() => {
    if (selected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <div
      ref={setRefs}
      onClick={() => setSelId(slide.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        setSelId(slide.id);
        onContextMenu(index, e.clientX, e.clientY);
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        gap: 9,
        alignItems: "stretch",
        padding: 7,
        marginBottom: 8,
        borderRadius: 11,
        cursor: "pointer",
        background: selected ? fade(colors.accent, 0.12) : "transparent",
        border: `1px solid ${selected ? fade(colors.accent, 0.35) : "transparent"}`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          color: colors.dim,
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <GripVertical size={15} />
      </div>
      <div
        style={{
          width: 32,
          fontFamily: UI,
          fontSize: 12,
          color: colors.dim,
          display: "flex",
          alignItems: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SlideCanvas
          slide={slide}
          bg={resolveBackground(slide, doc, theme, bgMap)}
          style={resolveStyle(slide, doc, theme)}
          lineStyles={slide.lines.map((_, i) =>
            resolveLineStyle(slide, i, doc, theme),
          )}
          showLabel={false}
          radius={7}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
            marginTop: 5,
          }}
        >
          <div
            style={{
              fontFamily: UI,
              fontSize: 11,
              color: selected ? colors.accentSoft : colors.sub,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {slide.label}
          </div>
          {(shortcutNum !== undefined || fixedShortcut) && (
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              {shortcutNum !== undefined && (
                <ShortcutBadge
                  label={String(shortcutNum)}
                  title={
                    allSlidesMode
                      ? `Press Ctrl then type ${shortcutNum}, release Ctrl to jump here`
                      : `Press Ctrl then hold and type ${shortcutNum}, release Ctrl to jump here`
                  }
                />
              )}
              {fixedShortcut && (
                <ShortcutBadge
                  label={fixedShortcut.letter.toUpperCase()}
                  title={`Press Ctrl+${fixedShortcut.letter.toUpperCase()} to jump to first ${fixedShortcut.label} slide`}
                  highlight
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SortableSlideList({
  slides,
  selId,
  setSelId,
  doc,
  theme,
  bgMap,
  onReorder,
  onContextMenu,
  tagGroups,
}: SortableSlideListProps) {
  // Small activation distance so a plain click still selects the slide.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = slides.findIndex((s) => s.id === active.id);
    const to = slides.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(slides, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={slides.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {slides.map((s, i) => {
          const allSlidesMode = doc.shortcutMode === "all-slides";
          const group = tagGroups?.find((g) => g.firstIndex === i);
          const shortcutNum = allSlidesMode ? i + 1 : group?.shortcutNum;
          const fixedShortcut = group
            ? FIXED_SHORTCUT_BY_TYPE[group.type]
            : undefined;
          return (
            <SortableRow
              key={s.id}
              slide={s}
              index={i}
              selId={selId}
              setSelId={setSelId}
              doc={doc}
              theme={theme}
              bgMap={bgMap}
              onContextMenu={onContextMenu}
              shortcutNum={shortcutNum}
              fixedShortcut={fixedShortcut}
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
