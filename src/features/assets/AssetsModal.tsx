import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Music, Palette, Trash2, Upload, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AudioItem } from "../../types";
import { fade, colors, UI } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import { useAssetUrl } from "../../hooks/useAssetUrl";
import { Button, IconButton } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { CustomColorPicker } from "../../components/controls/CustomColorPicker";

type Tab = "backgrounds" | "audio";

function AudioRow({ item, onRemove }: { item: AudioItem; onRemove: () => void }) {
  const url = useAssetUrl(item);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 0",
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
        }}
      >
        <Music size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 120, fontFamily: UI, fontSize: 14, color: colors.text }}>
        {item.name}
        {item.builtIn && <span style={{ fontSize: 11, color: colors.dim, marginLeft: 8 }}>· default</span>}
      </div>
      {url && <audio src={url} controls loop preload="none" style={{ height: 32 }} />}
      {!item.builtIn && <IconButton icon={Trash2} danger title="Remove" onClick={onRemove} />}
    </div>
  );
}

export function AssetsModal() {
  const overlay = useStore((s) => s.overlay);
  const overlayContext = useStore((s) => s.overlayContext);
  const close = useStore((s) => s.closeOverlay);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);
  const beginUpload = useStore((s) => s.beginUpload);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const removeBackground = useStore((s) => s.removeBackground);
  const removeAudio = useStore((s) => s.removeAudio);

  const bgInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("backgrounds");
  const [showColor, setShowColor] = useState(false);

  // Deep-links (e.g. dashboard activities) open the modal on a specific tab.
  useEffect(() => {
    if (overlay === "assets" && (overlayContext === "backgrounds" || overlayContext === "audio"))
      setTab(overlayContext);
  }, [overlay, overlayContext]);

  const tabs: [Tab, string, LucideIcon][] = [
    ["backgrounds", "Backgrounds", ImageIcon],
    ["audio", "Audio", Music],
  ];

  return (
    <Modal open={overlay === "assets"} onClose={close} title="Asset Library" width={680}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 15px",
              borderRadius: 999,
              cursor: "pointer",
              fontFamily: UI,
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${tab === id ? fade(colors.accent, 0.4) : colors.border}`,
              background: tab === id ? fade(colors.accent, 0.16) : "transparent",
              color: tab === id ? colors.accentSoft : colors.sub,
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "backgrounds" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => bgInput.current?.click()}>
              <Upload size={15} />
              Upload Images
            </Button>
            <Button variant="ghost" onClick={() => setShowColor((v) => !v)}>
              <Palette size={15} />
              Add Color / CSS
            </Button>
          </div>
          <input
            ref={bgInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) beginUpload("background", files);
              e.target.value = "";
            }}
          />
          {showColor && (
            <div style={{ marginTop: 12 }}>
              <CustomColorPicker
                onAdd={(value, name) => {
                  addCustomBackground(value, name);
                  setShowColor(false);
                }}
              />
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
              gap: 10,
              marginTop: 16,
            }}
          >
            {backgrounds.map((bg) => (
              <div key={bg.id} style={{ position: "relative" }}>
                <BgSwatch
                  bg={bg}
                  style={{
                    aspectRatio: "16/9",
                    borderRadius: 9,
                    overflow: "hidden",
                    border: `1px solid ${colors.border}`,
                  }}
                />
                <div style={{ fontFamily: UI, fontSize: 11.5, color: colors.sub, marginTop: 5 }}>
                  {bg.name}
                  {bg.builtIn && <span style={{ color: colors.dim }}> · default</span>}
                </div>
                {!bg.builtIn && (
                  <button
                    onClick={() => removeBackground(bg.id)}
                    aria-label="Remove"
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Button variant="primary" onClick={() => audioInput.current?.click()}>
            <Upload size={15} />
            Upload Audio
          </Button>
          <input
            ref={audioInput}
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) beginUpload("audio", files);
              e.target.value = "";
            }}
          />
          <div style={{ marginTop: 16 }}>
            {audio.map((item) => (
              <AudioRow key={item.id} item={item} onRemove={() => removeAudio(item.id)} />
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
