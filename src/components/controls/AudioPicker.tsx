import { useMemo, useRef, useState, type ReactNode } from "react";
import { Film, Library, Pause, Pencil, Play, Upload } from "lucide-react";
import type { AudioItem, AudioSettings, MediaItem } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { audioSettingsOf, formatDuration } from "../../lib/media";
import { mostRecent } from "../../lib/recentItems";
import type { AssetUsageRequest } from "../../lib/assetUsage";
import type { MediaPlayback } from "../../lib/presentChannel";
import { AudioSurface } from "../media/AudioSurface";
import { Button } from "../ui/Button";

interface AudioPickerProps {
  audio: AudioItem[];
  value: string;
  onSelect: (id: string) => void;
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

/** A sound in the library, or a video whose soundtrack can become one. */
type AudioEntry =
  { source: "sound"; item: AudioItem } | { source: "clip"; item: MediaItem };

const PREVIEW_PLAYBACK: MediaPlayback = {
  playing: true,
  muted: false,
  volume: 100,
  seekTime: 0,
  seekToken: 0,
};

export const AudioPicker = ({
  audio,
  value,
  onSelect,
  inheritLabel,
  onUploaded,
  onManage,
  settings,
  onEditUsage,
  limit,
}: AudioPickerProps) => {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const beginUpload = useStore((s) => s.beginUpload);
  const addVideoAudio = useStore((s) => s.addVideoAudio);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewItem = audio.find((item) => item.id === previewId);

  /* Clips already turned into sounds are listed once, so the soundtracks only
     offer what is not in the library yet. */
  const all = useMemo<AudioEntry[]>(() => {
    const taken = new Set(audio.map((item) => item.mediaId).filter(Boolean));
    return [
      ...audio.map((item) => ({ source: "sound", item }) as AudioEntry),
      ...media.flatMap((item): AudioEntry[] =>
        item.kind === "video" && !taken.has(item.id)
          ? [{ source: "clip", item }]
          : [],
      ),
    ];
  }, [audio, media]);

  const entries = useMemo(
    () =>
      mostRecent(all, {
        limit,
        createdAt: (entry) => entry.item.createdAt,
        keep: (entry) => entry.source === "sound" && entry.item.id === value,
      }),
    [all, limit, value],
  );

  const previewPlayback = useMemo<MediaPlayback>(
    () => ({
      ...PREVIEW_PLAYBACK,
      seekTime: previewItem?.settings?.trimStart ?? 0,
      volume: previewItem?.settings?.volume ?? 100,
    }),
    [previewItem],
  );

  /** Keeps the soundtrack of a clip alongside the sounds, then chooses it. */
  const selectSoundtrack = (mediaId: string) => {
    const id = addVideoAudio(mediaId);
    if (id) onSelect(id);
  };

  /**
   * Editing a sound hands the whole choice over: the trim and level come back
   * with the sound itself, so what is tuned is what ends up playing.
   */
  const editSound = (item: AudioItem) => {
    if (!onEditUsage) return;
    const defaults = audioSettingsOf(item);
    onEditUsage({
      assetId: item.id,
      kind: "audio",
      settings: (item.id === value ? settings : null) ?? defaults,
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
        <AudioRow
          label={inheritLabel || "None"}
          selected={value === ""}
          onSelect={() => onSelect("")}
        />
        {entries.map((entry) =>
          entry.source === "sound" ? (
            <AudioRow
              key={entry.item.id}
              label={entry.item.name}
              meta={
                entry.item.duration
                  ? formatDuration(entry.item.duration)
                  : undefined
              }
              selected={value === entry.item.id}
              onSelect={() => onSelect(entry.item.id)}
              actions={
                <>
                  <RowButton
                    active={previewId === entry.item.id}
                    label={
                      previewId === entry.item.id
                        ? `Stop ${entry.item.name}`
                        : `Listen to ${entry.item.name}`
                    }
                    title={previewId === entry.item.id ? "Stop" : "Listen"}
                    onClick={() =>
                      setPreviewId(
                        previewId === entry.item.id ? null : entry.item.id,
                      )
                    }
                  >
                    {previewId === entry.item.id ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                  </RowButton>
                  {onEditUsage && (
                    <RowButton
                      className="ws-reveal"
                      active={false}
                      label={`Edit ${entry.item.name} for this use`}
                      title="Edit for this use"
                      onClick={() => editSound(entry.item)}
                    >
                      <Pencil size={13} />
                    </RowButton>
                  )}
                </>
              }
            />
          ) : (
            <AudioRow
              key={entry.item.id}
              label={entry.item.name}
              meta={`Soundtrack${entry.item.duration ? ` · ${formatDuration(entry.item.duration)}` : ""}`}
              icon={<Film size={13} />}
              selected={false}
              onSelect={() => selectSoundtrack(entry.item.id)}
            />
          ),
        )}
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

      {entries.length < all.length && (
        <p
          style={{
            margin: "0 0 10px",
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: colors.sub,
          }}
        >
          Showing the {entries.length} most recent. Manage audio for the rest.
        </p>
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
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  actions?: ReactNode;
}

const AudioRow = ({
  label,
  meta,
  icon,
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
        <span
          aria-hidden
          style={{
            width: 14,
            height: 14,
            flexShrink: 0,
            borderRadius: "50%",
            border: `1.5px solid ${selected ? colors.accent : colors.borderStrong}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          {selected && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: colors.accent,
              }}
            />
          )}
        </span>
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
            {icon}
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
