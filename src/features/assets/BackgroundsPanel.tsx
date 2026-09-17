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
import { LibrarySection } from "../../components/ui/LibrarySection";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import type { SegmentedTab } from "../../components/ui/SegmentedTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { CustomColorPicker } from "../../components/controls/CustomColorPicker";
import { BackgroundImageEditorModal } from "../../components/media/BackgroundImageEditorModal";
import { VideoSourceList } from "./VideoSourceList";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";

type BackgroundTab = "images" | "colors" | "videos";

const TAB_PREFIX = "asset-backgrounds";

const isColorBackground = (background: Background): boolean =>
  background.type === "solid" || background.type === "gradient";

const tabOf = (background: Background): BackgroundTab =>
  background.type === "image"
    ? "images"
    : background.type === "video"
      ? "videos"
      : "colors";

interface BackgroundsPanelProps {
  attentionId: string | null;
  targetItemId: string | null;
}

export const BackgroundsPanel = ({
  attentionId,
  targetItemId,
}: BackgroundsPanelProps) => {
  const backgrounds = useStore((s) => s.backgrounds);
  const media = useStore((s) => s.media);
  const [tab, setTab] = useState<BackgroundTab>(() => {
    const target = backgrounds.find((bg) => bg.id === targetItemId);
    if (target) return tabOf(target);
    return media.some((item) => item.id === targetItemId) ? "videos" : "images";
  });

  const images = useMemo(
    () => backgrounds.filter(isImageBackground),
    [backgrounds],
  );
  const colors = useMemo(
    () => backgrounds.filter(isColorBackground),
    [backgrounds],
  );
  const videoCount = useMemo(
    () => backgrounds.filter(isVideoBackground).length,
    [backgrounds],
  );

  const tabs: SegmentedTab<BackgroundTab>[] = [
    { id: "images", label: "Images", icon: ImageIcon, count: images.length },
    { id: "colors", label: "Colors", icon: Palette, count: colors.length },
    { id: "videos", label: "Videos", icon: Film, count: videoCount },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SegmentedTabs<BackgroundTab>
        ariaLabel="Background kinds"
        idPrefix={TAB_PREFIX}
        tabs={tabs}
        value={tab}
        onChange={setTab}
        minSegmentWidth={104}
      />
      <div {...pillTabPanelProps(TAB_PREFIX, tab)}>
        {tab === "images" && (
          <ImagesTab images={images} attentionId={attentionId} />
        )}
        {tab === "colors" && (
          <ColorsTab colors={colors} attentionId={attentionId} />
        )}
        {tab === "videos" && <VideosTab attentionId={attentionId} />}
      </div>
    </div>
  );
};

interface BackgroundTabProps {
  attentionId: string | null;
}

const ImagesTab = ({
  images,
  attentionId,
}: BackgroundTabProps & { images: Background[] }) => {
  const beginUpload = useStore((s) => s.beginUpload);
  const imageInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Background | null>(null);

  return (
    <LibrarySection
      title="Image backgrounds"
      meta={`${images.length} saved`}
      description="Pictures you can set behind any slide, cropped and adjusted here."
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() => imageInput.current?.click()}
        >
          <Upload size={14} />
          Upload images
        </Button>
      }
    >
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
    </LibrarySection>
  );
};

const ColorsTab = ({
  colors,
  attentionId,
}: BackgroundTabProps & { colors: Background[] }) => {
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  return (
    <LibrarySection
      title="Colors and gradients"
      meta={`${colors.length} saved`}
      description="Pick a preset or write any CSS color or gradient of your own."
    >
      <CustomColorPicker
        onAdd={(value, name) => addCustomBackground(value, name)}
      />
      <BackgroundGrid backgrounds={colors} attentionId={attentionId} />
    </LibrarySection>
  );
};

const VideosTab = ({ attentionId }: BackgroundTabProps) => {
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
      title="Video backgrounds"
      description="Attach a clip from your video library to loop behind slides."
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
};

interface BackgroundGridProps {
  backgrounds: Background[];
  attentionId: string | null;
  onEditImage?: (background: Background) => void;
}

const BackgroundGrid = ({
  backgrounds,
  attentionId,
  onEditImage,
}: BackgroundGridProps) => {
  const { colors, fonts } = useUITheme();
  const removeBackground = useStore((s) => s.removeBackground);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
        gap: 10,
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
            className="ws-ellipsis"
            style={{
              fontFamily: fonts.ui,
              fontSize: 11.5,
              color: colors.sub,
              marginTop: 5,
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
};
