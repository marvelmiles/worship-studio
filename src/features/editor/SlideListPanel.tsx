import { Plus } from "lucide-react";
import type { Background, Slide, Song, Theme } from "../../types";
import { C, UI } from "../../theme/tokens";
import { IconBtn } from "../../components/ui/Button";
import { SortableSlideList } from "./SortableSlideList";

interface SlideListPanelProps {
  slides: Slide[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  song: Song;
  theme: Theme;
  bgMap: Record<string, Background>;
  onReorder: (next: Slide[]) => void;
  onContextMenu: (index: number, x: number, y: number) => void;
  onAdd: () => void;
}

export function SlideListPanel({
  slides,
  selectedId,
  setSelectedId,
  song,
  theme,
  bgMap,
  onReorder,
  onContextMenu,
  onAdd,
}: SlideListPanelProps) {
  return (
    <div style={{ padding: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: UI,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: C.dim,
          }}
        >
          Slides
        </span>
        <IconBtn icon={Plus} title="Add slide" onClick={onAdd} />
      </div>
      <SortableSlideList
        slides={slides}
        selId={selectedId}
        setSelId={setSelectedId}
        song={song}
        theme={theme}
        bgMap={bgMap}
        onReorder={onReorder}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
