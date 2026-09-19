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
import { EmptyState } from "../../components/ui/EmptyState";
import { LibrarySection } from "../../components/ui/LibrarySection";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import type { SegmentedTab } from "../../components/ui/SegmentedTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { useOpenAssetEditor } from "./assetLibraryNavigation";
import { MediaSourceList } from "./MediaSourceList";
import routes from "../../routes";
import { formatCount } from "../../lib/formatNumber";

type AudioTab = "sounds" | "videos";

const TAB_PREFIX = "asset-audio";

interface AudioPanelProps {
  attentionId: string | null;
  targetItemId: string | null;
}

export const AudioPanel = ({ attentionId, targetItemId }: AudioPanelProps) => {
  const audio = useStore((s) => s.audio);
  const media = useStore((s) => s.media);
  const [tab, setTab] = useState<AudioTab>(() =>
    media.some((item) => item.id === targetItemId) ? "videos" : "sounds",
  );

  const fromVideos = useMemo(
    () => audio.filter((item) => Boolean(item.mediaId)).length,
    [audio],
  );

  const tabs: SegmentedTab<AudioTab>[] = [
    { id: "sounds", label: "Sounds", icon: Music, count: audio.length },
    { id: "videos", label: "From videos", icon: Film, count: fromVideos },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SegmentedTabs<AudioTab>
        ariaLabel="Audio sources"
        idPrefix={TAB_PREFIX}
        tabs={tabs}
        value={tab}
        onChange={setTab}
      />
      <div {...pillTabPanelProps(TAB_PREFIX, tab)}>
        {tab === "sounds" ? (
          <SoundsTab attentionId={attentionId} />
        ) : (
          <VideoSoundsTab attentionId={attentionId} />
        )}
      </div>
    </div>
  );
};

const SoundsTab = ({ attentionId }: { attentionId: string | null }) => {
  const audio = useStore((s) => s.audio);
  const beginUpload = useStore((s) => s.beginUpload);
  const removeAudio = useStore((s) => s.removeAudio);
  const openEditor = useOpenAssetEditor();
  const audioInput = useRef<HTMLInputElement>(null);

  return (
    <LibrarySection
      title="Sounds"
      meta={`${formatCount(audio.length)} saved`}
      description="Background audio you can attach to a theme, a manuscript or a single slide."
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => audioInput.current?.click()}
        >
          <Upload size={14} />
          Upload audio
        </Button>
      }
    >
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
      {audio.length === 0 ? (
        <EmptyState
          icon={Music}
          title="No sounds yet"
          message="Upload audio to play it behind your slides."
          compact
          bare
        />
      ) : (
        audio.map((item) => (
          <AudioRow
            key={item.id}
            item={item}
            attention={item.id === attentionId}
            onEdit={() => openEditor(routes.sound(item.id), "audio")}
            onRemove={() => void removeAudio(item.id)}
          />
        ))
      )}
    </LibrarySection>
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
    <MediaSourceList
      kind="video"
      title="Sound from videos"
      description="Your Videos page. Take the soundtrack of a clip and keep it alongside your sounds; the pencil opens the clip in the video editor."
      attentionId={attentionId}
      addedByMediaId={added}
      onAdd={addVideoAudio}
      onRemove={(audioId) => void removeAudio(audioId)}
      addLabel="Use sound"
      addedLabel="In sounds"
      addedFilterLabel="Sounds from videos"
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
          style={{ fontFamily: fonts.ui, fontSize: 11.5, color: colors.sub }}
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
