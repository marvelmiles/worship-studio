import { useMemo, useRef, useState } from "react";
import {
  Film,
  Image as ImageIcon,
  Palette,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import type { Background } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { isImageBackground, isVideoBackground } from "../../lib/media";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillTabs, type PillTab } from "../../components/ui/PillTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { CustomColorPicker } from "../../components/controls/CustomColorPicker";
import { BackgroundImageEditorModal } from "../../components/media/BackgroundImageEditorModal";
import { VideoSourceList } from "./VideoSourceList";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";

type BackgroundTab = "images" | "colors" | "videos";

const TABS: PillTab<BackgroundTab>[] = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "colors", label: "Colors", icon: Palette },
  { id: "videos", label: "Videos", icon: Film },
];

const TAB_PREFIX = "asset-backgrounds";

/** The tab a background lives under. */
const tabOf = (background: Background): BackgroundTab =>
  background.type === "image"
    ? "images"
    : background.type === "video"
      ? "videos"
      : "colors";

interface BackgroundsPanelProps {
  /** The background, or clip, a deep link is ringing, if any. */
  attentionId: string | null;
  /** The item a deep link names, which picks the tab the panel opens on. */
  targetItemId: string | null;
}

/**
 * Every background in the library, one kind at a time: uploaded pictures,
 * colors and gradients, and clips from the videos module. Each tab holds both
 * its list and the way to add to it.
 */
export function BackgroundsPanel({
  attentionId,
  targetItemId,
}: BackgroundsPanelProps) {
  const backgrounds = useStore((s) => s.backgrounds);
  const media = useStore((s) => s.media);
  const [tab, setTab] = useState<BackgroundTab>(() => {
    const target = backgrounds.find((bg) => bg.id === targetItemId);
    if (target) return tabOf(target);
    return media.some((item) => item.id === targetItemId) ? "videos" : "images";
  });

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <PillTabs<BackgroundTab>
          ariaLabel="Background kinds"
          idPrefix={TAB_PREFIX}
          tabs={TABS}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div {...pillTabPanelProps(TAB_PREFIX, tab)}>
        {tab === "images" && <ImagesTab attentionId={attentionId} />}
        {tab === "colors" && <ColorsTab attentionId={attentionId} />}
        {tab === "videos" && <VideosTab attentionId={attentionId} />}
      </div>
    </>
  );
}

function ImagesTab({ attentionId }: { attentionId: string | null }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const beginUpload = useStore((s) => s.beginUpload);
  const imageInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Background | null>(null);
  const images = useMemo(
    () => backgrounds.filter(isImageBackground),
    [backgrounds],
  );

  return (
    <>
      <Button variant="primary" onClick={() => imageInput.current?.click()}>
        <Upload size={15} />
        Upload images
      </Button>
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) beginUpload("background", files);
          event.target.value = "";
        }}
      />
      {images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          message="Upload pictures to use them behind your slides."
          compact
          bare
        />
      ) : (
        <BackgroundGrid
          backgrounds={images}
          attentionId={attentionId}
          onEditImage={setEditing}
        />
      )}
      {editing && (
        <BackgroundImageEditorModal
          key={editing.id}
          background={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ColorsTab({ attentionId }: { attentionId: string | null }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const addCustomBackground = useStore((s) => s.addCustomBackground);
  const colorsAndGradients = useMemo(
    () =>
      backgrounds.filter((bg) => bg.type === "solid" || bg.type === "gradient"),
    [backgrounds],
  );

  return (
    <>
      <CustomColorPicker
        onAdd={(value, name) => addCustomBackground(value, name)}
      />
      <BackgroundGrid
        backgrounds={colorsAndGradients}
        attentionId={attentionId}
      />
    </>
  );
}

function VideosTab({ attentionId }: { attentionId: string | null }) {
  const backgrounds = useStore((s) => s.backgrounds);
  const attachVideoBackground = useStore((s) => s.attachVideoBackground);
  const removeBackground = useStore((s) => s.removeBackground);
  const attached = useMemo(() => {
    const map = new Map<string, string>();
    for (const bg of backgrounds)
      if (isVideoBackground(bg) && bg.mediaId) map.set(bg.mediaId, bg.id);
    return map;
  }, [backgrounds]);

  return (
    <VideoSourceList
      attentionId={attentionId}
      addedByMediaId={attached}
      onAdd={attachVideoBackground}
      onRemove={(backgroundId) => void removeBackground(backgroundId)}
      addLabel="Attach"
      addedLabel="Attached"
      section="backgrounds"
      emptyMessage="Upload a video and it is attached as a background."
    />
  );
}

interface BackgroundGridProps {
  backgrounds: Background[];
  attentionId: string | null;
  onEditImage?: (background: Background) => void;
}

function BackgroundGrid({
  backgrounds,
  attentionId,
  onEditImage,
}: BackgroundGridProps) {
  const { colors, fonts } = useUITheme();
  const removeBackground = useStore((s) => s.removeBackground);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
        gap: 10,
        marginTop: 16,
      }}
    >
      {backgrounds.map((bg) => (
        <div
          key={bg.id}
          {...attentionAttribute(bg.id)}
          className={bg.id === attentionId ? ATTENTION_CLASS : undefined}
          style={{ position: "relative", borderRadius: 11 }}
        >
          <BgSwatch
            bg={bg}
            style={{
              aspectRatio: "16/9",
              borderRadius: 9,
              overflow: "hidden",
              border: `1px solid ${colors.border}`,
            }}
          />
          <div
            style={{
              fontFamily: fonts.ui,
              fontSize: 11.5,
              color: colors.sub,
              marginTop: 5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bg.name}
            {bg.builtIn && (
              <span style={{ color: colors.dim }}> · default</span>
            )}
          </div>
          {!bg.builtIn && (
            <div
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                display: "flex",
                gap: 5,
              }}
            >
              {onEditImage && (
                <button
                  onClick={() => onEditImage(bg)}
                  aria-label={`Edit ${bg.name}`}
                  title="Edit image"
                  style={CARD_OVERLAY_BUTTON}
                >
                  <Pencil size={13} />
                </button>
              )}
              <button
                onClick={() => void removeBackground(bg.id)}
                aria-label={`Remove ${bg.name}`}
                title="Remove"
                style={CARD_OVERLAY_BUTTON}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
