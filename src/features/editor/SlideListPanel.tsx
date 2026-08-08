import { Plus } from "lucide-react";
import type { Background, Slide, SlideDeckDoc, Theme } from "../../types";
import { colors, UI } from "../../theme/tokens";
import { IconButton } from "../../components/ui/Button";
import { SortableSlideList } from "./SortableSlideList";
import type { TagGroup } from "../../lib/tagGroups";

interface SlideListPanelProps {
  slides: Slide[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  doc: SlideDeckDoc;
  theme: Theme;
  bgMap: Record<string, Background>;
  onReorder: (next: Slide[]) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
  onAdd: () => void;
  tagGroups?: TagGroup[];
}

export function SlideListPanel({
  slides,
  selectedId,
  setSelectedId,
  doc,
  theme,
  bgMap,
  onReorder,
  onContextMenu,
  onAdd,
  tagGroups,
}: SlideListPanelProps) {
  return (
    <div style={{ paddingBottom: 14 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 14px 10px",
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span
          style={{
            fontFamily: UI,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: colors.dim,
          }}
        >
          Slides
        </span>
        <IconButton icon={Plus} title="Add slide" onClick={onAdd} />
      </div>
      <div style={{ padding: "12px 14px 0" }}>
        <SortableSlideList
          slides={slides}
          selId={selectedId}
          setSelId={setSelectedId}
          doc={doc}
          theme={theme}
          bgMap={bgMap}
          onReorder={onReorder}
          onContextMenu={onContextMenu}
          tagGroups={tagGroups}
        />
      </div>
    </div>
  );
}
