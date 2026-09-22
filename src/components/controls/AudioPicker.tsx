import { useMemo, useRef, useState, type ReactNode } from "react";
import { Library, Pause, Pencil, Play, Upload } from "lucide-react";
import type { AudioItem, AudioSettings, MediaItem } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import {
  DEFAULT_AUDIO_SETTINGS,
  NO_AUDIO_ID,
  audioPlayLength,
  audioSettingsOf,
  formatDuration,
} from "../../lib/media";
import { mostRecent } from "../../lib/recentItems";
import type { AssetUsageRequest } from "../../lib/assetUsage";
import type { MediaPlayback } from "../../lib/presentChannel";
import { AudioSurface } from "../media/AudioSurface";
import { Button } from "../ui/Button";
import { RadioDot } from "./RadioDot";

/** A short list beside the slide; the asset library holds the rest. */
export const AUDIO_PICKER_LIMIT = 10;

interface AudioPickerProps {
  audio: AudioItem[];
  value: string;
  onSelect: (id: string) => void;
  /** Names what this place falls back to; left out where nothing is inherited. */
  inheritLabel?: string;
  onUploaded?: (id: string) => void;
  onManage?: () => void;
  /** What the place this picker edits applies to the sound it has chosen. */
  settings?: AudioSettings | null;
  /** Opens the sound's own editor for that one place. */
  onEditUsage?: (request: AssetUsageRequest) => void;
  /** How many sounds to list at most, newest first. */
  limit?: number;
}

const PREVIEW_PLAYBACK: MediaPlayback = {
  playing: true,
  muted: false,
  volume: 100,
  seekTime: 0,
  seekToken: 0,
};

/**
 * A clip's soundtrack listens and reads exactly like a sound in the library,
 * so the list can hold both without telling them apart. It only becomes a real
 * sound once it is chosen or edited.
 */
const soundtrackOf = (item: MediaItem): AudioItem => ({
  id: item.id,
  name: item.name,
  blobId: item.id,
  mediaId: item.id,
  size: item.size,
  duration: item.duration,
  createdAt: item.createdAt,
});

export const AudioPicker = ({
  audio,
  value,
  onSelect,
  inheritLabel,
  onUploaded,
  onManage,
  settings,
  onEditUsage,
  limit = AUDIO_PICKER_LIMIT,
}: AudioPickerProps) => {
  const { colors } = useUITheme();
  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const addVideoAudio = useStore((s) => s.addVideoAudio);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  /* Clips already turned into sounds are listed once, so the soundtracks only
     offer what is not in the library yet. A sound names the clip it came from
     with mediaId or blobId depending on when it was made, so both count. */
  const entries = useMemo(() => {
    const taken = new Set(
      audio.flatMap((item) =>
        [item.mediaId, item.blobId].filter((id): id is string => Boolean(id)),
      ),
    );
    const all: AudioItem[] = [
      ...audio,
      ...media.flatMap((item) =>
        item.kind === "video" && !taken.has(item.id)
          ? [soundtrackOf(item)]
          : [],
      ),
    ];
    return mostRecent(all, {
      limit,
      createdAt: (item) => item.createdAt,
      keep: (item) => item.id === value,
    });
  }, [audio, limit, media, value]);

  /* Where nothing is inherited, having made no choice already means silence,
     so both ways of saying it land on the same row. */
  const silent = value === NO_AUDIO_ID || (!inheritLabel && !value);

  const previewItem = entries.find((item) => item.id === previewId);

  const previewPlayback = useMemo<MediaPlayback>(
    () => ({
      ...PREVIEW_PLAYBACK,
      seekTime: previewItem?.settings?.trimStart ?? 0,
      volume: previewItem?.settings?.volume ?? 100,
    }),
    [previewItem],
  );

  /** Whether this row is still only a clip's soundtrack. */
  const isSoundtrack = (item: AudioItem): boolean =>
    !audio.some((sound) => sound.id === item.id);

  /** Keeps a clip's soundtrack alongside the sounds, and answers with its id. */
  const adopt = (item: AudioItem): string =>
    isSoundtrack(item) ? addVideoAudio(item.id) : item.id;

  const select = (item: AudioItem) => {
    const id = adopt(item);
    if (id) onSelect(id);
  };

  /**
   * Editing a sound hands the whole choice over: the trim and level come back
   * with the sound itself, so what is tuned is what ends up playing.
   */
  const edit = (item: AudioItem) => {
    if (!onEditUsage) return;
    const adopting = isSoundtrack(item);
    const assetId = adopt(item);
    if (!assetId) return;
    const inUse = assetId === value;
    const defaults = adopting
      ? { ...DEFAULT_AUDIO_SETTINGS }
      : audioSettingsOf(item);
    onEditUsage({
      assetId,
      kind: "audio",
      inUse,
      settings: (inUse ? settings : null) ?? defaults,
      defaults,
    });
  };

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Background audio"
        style={{
          maxHeight: 232,
          overflowY: "auto",
          borderRadius: 11,
          border: `1px solid ${colors.border}`,
          marginBottom: 10,
        }}
      >
        {inheritLabel && (
          <AudioRow
            label={inheritLabel}
            selected={value === ""}
            onSelect={() => onSelect("")}
          />
        )}
        <AudioRow
          label="None"
          selected={silent}
          onSelect={() => onSelect(NO_AUDIO_ID)}
        />
        {entries.map((item) => (
          <AudioRow
            key={item.id}
            label={item.name}
            meta={
              audioPlayLength(item)
                ? formatDuration(audioPlayLength(item))
                : undefined
            }
            selected={value === item.id}
            onSelect={() => select(item)}
            actions={
              <>
                <RowButton
                  active={previewId === item.id}
                  label={
                    previewId === item.id
                      ? `Stop ${item.name}`
                      : `Listen to ${item.name}`
                  }
                  title={previewId === item.id ? "Stop" : "Listen"}
                  onClick={() =>
                    setPreviewId(previewId === item.id ? null : item.id)
                  }
                >
                  {previewId === item.id ? (
                    <Pause size={13} />
                  ) : (
                    <Play size={13} />
                  )}
                </RowButton>
                {onEditUsage && (
                  <RowButton
                    className="ws-reveal"
                    active={false}
                    label={`Edit ${item.name} for this use`}
                    title="Edit for this use"
                    onClick={() => edit(item)}
                  >
                    <Pencil size={13} />
                  </RowButton>
                )}
              </>
            }
          />
        ))}
      </div>

      {previewItem && (
        <AudioSurface
          key={previewItem.id}
          item={previewItem}
          loop={false}
          playback={previewPlayback}
          onEnded={() => setPreviewId(null)}
        />
      )}

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {onManage && (
          <Button variant="ghost" size="sm" onClick={onManage}>
            <Library size={14} />
            Manage audio
          </Button>
        )}
        {onUploaded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            Upload audio
          </Button>
        )}
      </div>
      {onUploaded && (
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length)
              beginUpload(
                "audio",
                files,
                (ids) => ids[0] && onUploaded(ids[0]),
              );
            event.target.value = "";
          }}
        />
      )}
    </>
  );
};

interface AudioRowProps {
  label: string;
  meta?: string;
  selected: boolean;
  onSelect: () => void;
  actions?: ReactNode;
}

const AudioRow = ({
  label,
  meta,
  selected,
  onSelect,
  actions,
}: AudioRowProps) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      className={`ws-reveal-host${selected ? " is-active" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 6px 4px 4px",
        borderBottom: `1px solid ${colors.border}`,
        background: selected ? fade(colors.accent, 0.12) : "transparent",
      }}
    >
      <button
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "6px 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <RadioDot selected={selected} />
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: fonts.ui,
              fontSize: 12.5,
              color: selected ? colors.accentSoft : colors.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          {meta && (
            <span
              style={{
                display: "block",
                fontFamily: fonts.ui,
                fontSize: 11,
                color: colors.sub,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {meta}
            </span>
          )}
        </span>
      </button>
      {actions}
    </div>
  );
};

interface RowButtonProps {
  active: boolean;
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

const RowButton = ({
  active,
  label,
  title,
  onClick,
  className,
  children,
}: RowButtonProps) => {
  const { colors } = useUITheme();
  return (
    <button
      className={className}
      onClick={onClick}
      aria-label={label}
      title={title}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: 8,
        cursor: "pointer",
        border: `1px solid ${active ? fade(colors.accent, 0.4) : "transparent"}`,
        background: active ? fade(colors.accent, 0.16) : "transparent",
        color: active ? colors.accentSoft : colors.sub,
      }}
    >
      {children}
    </button>
  );
};
