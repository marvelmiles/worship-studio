import { useMemo, useRef, useState } from "react";
import { Library, Pause, Play, Upload } from "lucide-react";
import type { AudioItem } from "../../types";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { formatDuration } from "../../lib/media";
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
}

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
}: AudioPickerProps) => {
  const { colors, fonts } = useUITheme();
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewItem = audio.find((item) => item.id === previewId);

  const previewPlayback = useMemo<MediaPlayback>(
    () => ({
      ...PREVIEW_PLAYBACK,
      seekTime: previewItem?.settings?.trimStart ?? 0,
      volume: previewItem?.settings?.volume ?? 100,
    }),
    [previewItem],
  );

  const options: { id: string; label: string; item?: AudioItem }[] = [
    { id: "", label: inheritLabel || "None" },
    ...audio.map((item) => ({ id: item.id, label: item.name, item })),
  ];

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
        {options.map(({ id, label, item }) => {
          const selected = value === id;
          const previewing = Boolean(item) && previewId === id;
          return (
            <div
              key={id || "inherit"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px 4px 4px",
                borderBottom: `1px solid ${colors.border}`,
                background: selected
                  ? fade(colors.accent, 0.12)
                  : "transparent",
              }}
            >
              <button
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(id)}
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
                      display: "block",
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
                  {item?.duration ? (
                    <span
                      style={{
                        display: "block",
                        fontFamily: fonts.ui,
                        fontSize: 11,
                        color: colors.dim,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatDuration(item.duration)}
                    </span>
                  ) : null}
                </span>
              </button>
              {item ? (
                <button
                  onClick={() => setPreviewId(previewing ? null : id)}
                  aria-label={
                    previewing ? `Stop ${label}` : `Listen to ${label}`
                  }
                  title={previewing ? "Stop" : "Listen"}
                  style={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${previewing ? fade(colors.accent, 0.4) : "transparent"}`,
                    background: previewing
                      ? fade(colors.accent, 0.16)
                      : "transparent",
                    color: previewing ? colors.accentSoft : colors.sub,
                  }}
                >
                  {previewing ? <Pause size={13} /> : <Play size={13} />}
                </button>
              ) : (
                <span aria-hidden style={{ width: 28, flexShrink: 0 }} />
              )}
            </div>
          );
        })}
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
