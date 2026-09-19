import { useMemo, useState } from "react";
import { Film, Image as ImageIcon, Palette, Pencil, X } from "lucide-react";
import type { Background } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { ATTENTION_CLASS, attentionAttribute } from "../../hooks/useAttention";
import { isImageBackground, isVideoBackground } from "../../lib/media";
import { LibrarySection } from "../../components/ui/LibrarySection";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import type { SegmentedTab } from "../../components/ui/SegmentedTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { BgSwatch } from "../../components/controls/BgSwatch";
import { CustomColorPicker } from "../../components/controls/CustomColorPicker";
import { BackgroundImageEditorModal } from "../../components/media/BackgroundImageEditorModal";
import { MediaSourceList } from "./MediaSourceList";
import { CARD_OVERLAY_BUTTON } from "./assetCardStyles";
import { formatCount } from "../../lib/formatNumber";

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
  /* Coming back from a media editor, open the tab that file lives on. */
  const [tab, setTab] = useState<BackgroundTab>(() => {
    const target = backgrounds.find((bg) => bg.id === targetItemId);
    if (target) return tabOf(target);
    const item = media.find((entry) => entry.id === targetItemId);
    return item?.kind === "video" ? "videos" : "images";
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
  const media = useStore((s) => s.media);
  const attachImageBackground = useStore((s) => s.attachImageBackground);
  const removeBackground = useStore((s) => s.removeBackground);
  const [editing, setEditing] = useState<Background | null>(null);

  const pictureIds = useMemo(
    () =>
      new Set(
        media.flatMap((item) => (item.kind === "image" ? [item.id] : [])),
      ),
    [media],
  );

  const attached = useMemo(() => {
    const map = new Map<string, string>();
    for (const background of images)
      if (background.blobId && pictureIds.has(background.blobId))
        map.set(background.blobId, background.id);
    return map;
  }, [images, pictureIds]);

  /* Pictures saved straight into the asset library have no entry on the Images
     page, so they are listed on their own and keep their own editor. */
  const standalone = useMemo(
    () =>
      images.filter(
        (background) =>
          !background.blobId || !pictureIds.has(background.blobId),
      ),
    [images, pictureIds],
  );

  return (
    <>
      <MediaSourceList
        kind="image"
        title="Image backgrounds"
        description="Your Images page. Attach a picture to set it behind any slide; the pencil opens it in the image editor."
        attentionId={attentionId}
        addedByMediaId={attached}
        onAdd={attachImageBackground}
        onRemove={(backgroundId) => void removeBackground(backgroundId)}
        addLabel="Attach"
        addedLabel="Attached"
        addedFilterLabel="Background images"
        section="backgrounds"
        filterable
        emptyMessage="Upload a picture and it is attached as a background."
      />
      {standalone.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <LibrarySection
            title="Saved pictures"
            meta={`${formatCount(standalone.length)} saved`}
            description="Backgrounds saved on their own rather than from your Images page."
          >
            <BackgroundGrid
              backgrounds={standalone}
              attentionId={attentionId}
              onEditImage={setEditing}
            />
          </LibrarySection>
        </div>
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
};

const ColorsTab = ({
  colors,
  attentionId,
}: BackgroundTabProps & { colors: Background[] }) => {
  const addCustomBackground = useStore((s) => s.addCustomBackground);

  return (
    <LibrarySection
      title="Colors and gradients"
      meta={`${formatCount(colors.length)} saved`}
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
    <MediaSourceList
      kind="video"
      title="Video backgrounds"
      description="Your Videos page. Attach a clip to loop it behind slides; the pencil opens it in the video editor."
      attentionId={attentionId}
      addedByMediaId={attached}
      onAdd={attachVideoBackground}
      onRemove={(backgroundId) => void removeBackground(backgroundId)}
      addLabel="Attach"
      addedLabel="Attached"
      addedFilterLabel="Background videos"
      section="backgrounds"
      filterable
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
              fontSize: 12,
              color: colors.text,
              marginTop: 5,
            }}
          >
            {bg.name}
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
