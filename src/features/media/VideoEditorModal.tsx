import { useEffect, useRef, useState } from "react";
import { Save, TimerReset, Undo2 } from "lucide-react";
import type { MediaItem, VideoSettings } from "../../types";
import { useStore } from "../../store/useStore";
import { useBlobUrl } from "../../lib/blobUrls";
import {
  buildFilter,
  DEFAULT_VIDEO_SETTINGS,
  formatDuration,
  videoSettingsOf,
} from "../../lib/media";
import { colors, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import {
  Field,
  Range,
  Select,
  TextInput,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { AdjustmentControls } from "./AdjustmentControls";

interface VideoEditorModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

const FIT_OPTIONS = [
  { value: "contain", label: "Contain (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch)" },
];

const RATE_OPTIONS = ["0.5", "0.75", "1", "1.25", "1.5", "2"].map((value) => ({
  value,
  label: `${value}×`,
}));

export function VideoEditorModal({ item, onClose }: VideoEditorModalProps) {
  const updateMedia = useStore((s) => s.updateMedia);
  const pushToast = useStore((s) => s.pushToast);

  const videoRef = useRef<HTMLVideoElement>(null);
  const src = useBlobUrl(item?.id);
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<VideoSettings>(
    DEFAULT_VIDEO_SETTINGS,
  );

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSettings(videoSettingsOf(item));
    }
  }, [item]);

  if (!item) return null;

  const duration = item.duration || videoRef.current?.duration || 0;
  const patch = (changes: Partial<VideoSettings>) =>
    setSettings((prev) => ({ ...prev, ...changes }));

  const playheadTime = () => videoRef.current?.currentTime ?? 0;

  const save = () => {
    const trimStart = Math.max(0, settings.trimStart);
    const trimEnd =
      settings.trimEnd !== null && settings.trimEnd > trimStart
        ? settings.trimEnd
        : null;
    updateMedia(item.id, {
      name: name.trim() || item.name,
      video: { ...settings, trimStart, trimEnd },
    });
    pushToast("Video saved.");
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Video"
      width={760}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="ghost"
            onClick={() => setSettings(DEFAULT_VIDEO_SETTINGS)}
          >
            <Undo2 size={14} />
            Reset all
          </Button>
          <Button variant="primary" onClick={save}>
            <Save size={15} />
            Save
          </Button>
        </>
      }
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16/9",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          src={src || undefined}
          controls
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: settings.fit,
            filter: buildFilter(settings),
          }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </div>

      <SectionTitle>Trim</SectionTitle>
      <p
        style={{
          fontFamily: UI,
          fontSize: 12.5,
          color: colors.sub,
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        Playback runs from the trim start to the trim end
        {duration ? ` (video is ${formatDuration(duration)})` : ""}. Scrub the
        preview, then capture the playhead.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: 12,
        }}
      >
        <Field label={`Start: ${formatDuration(settings.trimStart)}`}>
          <div className="ws-row">
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={String(settings.trimStart)}
              onChange={(e) =>
                patch({ trimStart: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => patch({ trimStart: playheadTime() })}
            >
              <TimerReset size={13} />
              Playhead
            </Button>
          </div>
        </Field>
        <Field
          label={`End: ${settings.trimEnd === null ? "full length" : formatDuration(settings.trimEnd)}`}
        >
          <div className="ws-row">
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={settings.trimEnd === null ? "" : String(settings.trimEnd)}
              placeholder="Full length"
              onChange={(e) =>
                patch({
                  trimEnd:
                    e.target.value === ""
                      ? null
                      : Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => patch({ trimEnd: playheadTime() })}
            >
              <TimerReset size={13} />
              Playhead
            </Button>
          </div>
        </Field>
      </div>

      <SectionTitle>Playback</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: "0 16px",
        }}
      >
        <Field label={`Volume (${settings.volume}%)`}>
          <Range
            value={settings.volume}
            min={0}
            max={100}
            suffix="%"
            onChange={(e) => patch({ volume: Number(e.target.value) })}
          />
        </Field>
        <Field label="Speed">
          <Select
            value={String(settings.playbackRate)}
            options={RATE_OPTIONS}
            onChange={(e) => patch({ playbackRate: Number(e.target.value) })}
          />
        </Field>
        <Field label="Screen fit">
          <Select
            value={settings.fit}
            options={FIT_OPTIONS}
            onChange={(e) =>
              patch({ fit: e.target.value as VideoSettings["fit"] })
            }
          />
        </Field>
      </div>
      <div
        style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 4 }}
      >
        <div style={{ flex: 1, minWidth: 180 }}>
          <Toggle
            label="Muted"
            checked={settings.muted}
            onChange={(muted) => patch({ muted })}
          />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <Toggle
            label="Loop"
            checked={settings.loop}
            onChange={(loop) => patch({ loop })}
          />
        </div>
      </div>

      <SectionTitle>Adjustments</SectionTitle>
      <AdjustmentControls value={settings} onChange={patch} />
    </Modal>
  );
}
