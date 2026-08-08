import { useRef, useState } from "react";
import { Palette, Pencil, Upload } from "lucide-react";
import type { Background, ImageSettings } from "../../types";
import { colors } from "../../theme/tokens";
import { useStore } from "../../store/useStore";
import {
  DEFAULT_BACKGROUND_IMAGE_SETTINGS,
  backgroundImageSettings,
  isImageBackground,
  snapshotBackgroundImage,
} from "../../lib/media";
import { BackgroundImageEditorModal } from "../media/BackgroundImageEditorModal";
import { Field, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { CustomColorPicker } from "./CustomColorPicker";
import { BgSwatch } from "./BgSwatch";

interface BackgroundPickerProps {
  backgrounds: Background[];
  value: string;
  /**
   * The chosen background, together with the picture settings the new usage
   * starts from (a copy of the asset library's, so later library edits stay out
   * of this document).
   */
  onSelect: (id: string, image?: ImageSettings) => void;
  inheritLabel?: string;
  highlightId?: string;
  onUploaded?: (id: string, image?: ImageSettings) => void;
  onAddColor?: (value: string, name?: string) => void;
  /** This usage's picture settings for the active background. */
  imageSettings?: ImageSettings | null;
  /**
   * Saves picture edits against this usage. Without it, editing a picture edits
   * the asset library entry instead.
   */
  onImageSettingsChange?: (settings: ImageSettings) => void;
  /** What a picture edit applies to here, e.g. "this slide". */
  usageLabel?: string;
}

export function BackgroundPicker({
  backgrounds,
  value,
  onSelect,
  inheritLabel,
  highlightId,
  onUploaded,
  onAddColor,
  imageSettings,
  onImageSettingsChange,
  usageLabel = "this document",
}: BackgroundPickerProps) {
  const beginUpload = useStore((s) => s.beginUpload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showColor, setShowColor] = useState(false);
  const [editing, setEditing] = useState(false);
  const activeId = highlightId ?? value;
  const activeBackground = backgrounds.find((bg) => bg.id === activeId);
  const canEditPicture = isImageBackground(activeBackground);

  const options = [
    ...(inheritLabel ? [{ value: "", label: inheritLabel }] : []),
    ...backgrounds.map((bg) => ({
      value: bg.id,
      label: `${bg.name} (${bg.category})`,
    })),
  ];

  const select = (id: string) => {
    const background = backgrounds.find((bg) => bg.id === id);
    onSelect(id, snapshotBackgroundImage(background));
  };

  return (
    <>
      <Field label="Background">
        <Select
          value={value}
          options={options}
          onChange={(e) => select(e.target.value)}
        />
      </Field>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {backgrounds.map((bg) => {
          const active = activeId === bg.id;
          return (
            <div key={bg.id} style={{ position: "relative" }}>
              <button
                title={bg.name}
                onClick={() => select(bg.id)}
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: 7,
                  cursor: "pointer",
                  padding: 0,
                  overflow: "hidden",
                  background: "transparent",
                  border: `1.5px solid ${active ? colors.accent : colors.border}`,
                }}
              >
                <BgSwatch
                  bg={bg}
                  settings={active ? imageSettings : undefined}
                  style={{ width: "100%", height: "100%" }}
                />
              </button>
              {active && isImageBackground(bg) && (
                <button
                  onClick={() => setEditing(true)}
                  title="Edit picture"
                  aria-label={`Edit ${bg.name}`}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.62)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    padding: 0,
                  }}
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {onUploaded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            Upload image
          </Button>
        )}
        {canEditPicture && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Edit picture
          </Button>
        )}
        {onAddColor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowColor((v) => !v)}
          >
            <Palette size={14} />
            Solid / custom color
          </Button>
        )}
      </div>

      {onAddColor && showColor && (
        <div style={{ marginTop: 10 }}>
          <CustomColorPicker
            onAdd={(value, name) => {
              onAddColor(value, name);
              setShowColor(false);
            }}
          />
        </div>
      )}

      {onUploaded && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length)
              beginUpload(
                "background",
                files,
                (ids) =>
                  ids[0] &&
                  onUploaded(ids[0], { ...DEFAULT_BACKGROUND_IMAGE_SETTINGS }),
              );
            e.target.value = "";
          }}
        />
      )}

      {editing && activeBackground && (
        <BackgroundImageEditorModal
          key={activeBackground.id}
          background={activeBackground}
          usage={
            onImageSettingsChange
              ? {
                  label: usageLabel,
                  settings:
                    imageSettings ?? backgroundImageSettings(activeBackground),
                  onChange: onImageSettingsChange,
                }
              : undefined
          }
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
