import { useMemo, useRef, useState } from "react";
import { Film, Music, Pencil, Trash2, Upload } from "lucide-react";
import type { AudioItem } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { formatDuration } from "../../lib/media";
import { Button, IconButton } from "../../components/ui/Button";
import { PillTabs, type PillTab } from "../../components/ui/PillTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { useOpenAssetEditor } from "./assetLibraryNavigation";
import { VideoSourceList } from "./VideoSourceList";

type AudioTab = "sounds" | "videos";

const TABS: PillTab<AudioTab>[] = [
  { id: "sounds", label: "Sounds", icon: Music },
  { id: "videos", label: "From videos", icon: Film },
];

const TAB_PREFIX = "asset-audio";

interface AudioPanelProps {
  attentionId: string | null;
  targetItemId: string | null;
}

export const AudioPanel = ({ attentionId, targetItemId }: AudioPanelProps) => {
  const media = useStore((s) => s.media);
  const [tab, setTab] = useState<AudioTab>(() =>
    media.some((item) => item.id === targetItemId) ? "videos" : "sounds",
  );

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <PillTabs<AudioTab>
          ariaLabel="Audio sources"
          idPrefix={TAB_PREFIX}
          tabs={TABS}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div {...pillTabPanelProps(TAB_PREFIX, tab)}>
        {tab === "sounds" ? (
          <SoundsTab attentionId={attentionId} />
        ) : (
          <VideoSoundsTab attentionId={attentionId} />
        )}
      </div>
    </>
  );
};

const SoundsTab = ({ attentionId }: { attentionId: string | null }) => {
  const audio = useStore((s) => s.audio);
  const beginUpload = useStore((s) => s.beginUpload);
  const removeAudio = useStore((s) => s.removeAudio);
  const openEditor = useOpenAssetEditor();
  const audioInput = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button variant="primary" onClick={() => audioInput.current?.click()}>
        <Upload size={15} />
        Upload audio
      </Button>
      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) beginUpload("audio", files);
          event.target.value = "";
        }}
      />
      <div style={{ marginTop: 16 }}>
        {audio.map((item) => (
          <AudioRow
            key={item.id}
            item={item}
            attention={item.id === attentionId}
            onEdit={() => openEditor(`/audio/${item.id}`, "audio")}
            onRemove={() => void removeAudio(item.id)}
          />
        ))}
      </div>
    </>
  );
};

const VideoSoundsTab = ({ attentionId }: { attentionId: string | null }) => {
  const audio = useStore((s) => s.audio);
  const addVideoAudio = useStore((s) => s.addVideoAudio);
  const removeAudio = useStore((s) => s.removeAudio);
  const added = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of audio) if (item.mediaId) map.set(item.mediaId, item.id);
    return map;
  }, [audio]);

  return (
    <VideoSourceList
      attentionId={attentionId}
      addedByMediaId={added}
      onAdd={addVideoAudio}
      onRemove={(audioId) => void removeAudio(audioId)}
      addLabel="Use sound"
      addedLabel="In sounds"
      section="audio"
      filterable
      emptyMessage="Upload a video and its sound is added to your sounds."
    />
  );
};

interface AudioRowProps {
  item: AudioItem;
  attention: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

const AudioRow = ({ item, attention, onEdit, onRemove }: AudioRowProps) => {
  const { colors, fonts } = useUITheme();
  const url = useAssetUrl(item);
  return (
    <div
      {...attentionAttribute(item.id)}
      className={attention ? ATTENTION_CLASS : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 8px",
        borderRadius: 10,
        borderBottom: `1px solid ${colors.border}`,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          background: fade(colors.accent, 0.14),
          color: colors.accentSoft,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {item.mediaId ? <Film size={17} /> : <Music size={17} />}
      </div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: fonts.ui, fontSize: 14, color: colors.text }}>
          {item.name}
        </div>
        <div
          style={{ fontFamily: fonts.ui, fontSize: 11.5, color: colors.dim }}
        >
          {item.builtIn
            ? "Default"
            : item.mediaId
              ? "From a video"
              : "Uploaded"}
          {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
        </div>
      </div>
      {url && (
        <audio src={url} controls loop preload="none" style={{ height: 32 }} />
      )}
      {!item.builtIn && (
        <>
          <IconButton icon={Pencil} title="Edit audio" onClick={onEdit} />
          <IconButton icon={Trash2} danger title="Remove" onClick={onRemove} />
        </>
      )}
    </div>
  );
};
