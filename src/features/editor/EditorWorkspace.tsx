import { useState } from "react";
import { Settings2, Type } from "lucide-react";
import type { Song } from "../../types";
import { C, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { Btn, IconBtn } from "../../components/ui/Button";
import { useDeckEditor } from "./useDeckEditor";
import { DeckWorkspace } from "./DeckWorkspace";
import { LyricsModal } from "./LyricsModal";
import { SongSettingsModal } from "./SongSettingsModal";
import { parseLyrics } from "../../lib/parser";

export function EditorWorkspace({ song }: { song: Song }) {
  const upsertSong = useStore((s) => s.upsertSong);
  const themes = useStore((s) => s.themes);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  const editor = useDeckEditor(song, upsertSong);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const theme = themes.find((t) => t.id === song.defaultThemeId) || themes[0];

  const regenerateFromLyrics = (lyrics: string, maxLines: number) => {
    const slides = parseLyrics(lyrics, maxLines);
    editor.patchDoc({ lyrics, maxLines, slides });
    editor.setSelectedId(slides[0]?.id ?? null);
  };

  return (
    <DeckWorkspace
      doc={song}
      kind="song"
      editor={editor}
      backTo="/songs"
      backTitle="Back to songs"
      topBarActions={(compact) =>
        compact ? (
          <>
            <IconBtn icon={Type} title="Edit lyrics" onClick={() => setLyricsOpen(true)} />
            <IconBtn icon={Settings2} title="Song settings" onClick={() => setSettingsOpen(true)} />
          </>
        ) : (
          <>
            <Btn variant="ghost" size="sm" onClick={() => setLyricsOpen(true)}>
              <Type size={14} />
              Lyrics
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={14} />
              Song Settings
            </Btn>
          </>
        )
      }
      emptyState={
        <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <p style={{ fontFamily: UI, color: C.sub, lineHeight: 1.6 }}>
              This song has no slides yet. Add lyrics to generate slides automatically.
            </p>
            <Btn variant="primary" onClick={() => setLyricsOpen(true)}>
              <Type size={15} />
              Edit lyrics
            </Btn>
          </div>
        </div>
      }
    >
      <LyricsModal
        open={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        song={song}
        onRegenerate={regenerateFromLyrics}
      />
      <SongSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        song={song}
        theme={theme}
        themes={themes}
        backgrounds={backgrounds}
        audio={audio}
        onPatchSong={(changes) => editor.patchDoc(changes)}
        onStyleChange={editor.updateDocStyle}
        onAddColor={addCustomBackground}
      />
    </DeckWorkspace>
  );
}
