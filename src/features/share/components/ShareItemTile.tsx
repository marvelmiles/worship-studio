import type { KeyboardEvent } from "react";
import {
  BookOpen,
  Check,
  FileText,
  Layers,
  Music,
  Palette,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { BgSwatch } from "../../../components/controls/BgSwatch";
import { ImageSurface } from "../../../components/media/ImageSurface";
import { VideoThumb } from "../../../components/media/VideoThumb";
import { LazyMount } from "../../../components/ui/LazyMount";
import type { ShareItem, ShareTabId } from "../../../lib/shareCatalog";

const TAB_ICON: Record<ShareTabId, LucideIcon> = {
  manuscripts: FileText,
  passages: BookOpen,
  images: FileText,
  videos: FileText,
  audio: Music,
  colours: Palette,
  themes: Palette,
  overlays: Layers,
  settings: Settings,
};

interface ShareItemTileProps {
  item: ShareItem;
  tab: ShareTabId;
  picked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const ShareItemTile = ({
  item,
  tab,
  picked,
  disabled,
  onToggle,
}: ShareItemTileProps) => {
  const { colors, fonts } = useUITheme();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (!disabled) onToggle();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={picked}
      aria-label={item.name}
      title={item.name}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={onKeyDown}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        background: picked ? fade(colors.accent, 0.12) : colors.bg,
        border: `1.5px solid ${picked ? colors.accent : colors.border}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          background: colors.raise,
        }}
      >
        <ShareItemCover item={item} tab={tab} />
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 21,
            height: 21,
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            background: picked ? colors.accent : "rgba(0,0,0,0.55)",
            border: `1px solid ${picked ? colors.accent : "rgba(255,255,255,0.35)"}`,
            color: picked ? colors.onAccent : "rgba(255,255,255,0.85)",
          }}
        >
          {picked && <Check size={13} strokeWidth={3} />}
        </span>
      </div>
      <div style={{ minWidth: 0, padding: "8px 10px 10px" }}>
        <div
          className="ws-ellipsis"
          style={{
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {item.name}
        </div>
        {item.detail && (
          <div
            className="ws-ellipsis"
            style={{
              marginTop: 2,
              fontFamily: fonts.ui,
              fontSize: 11,
              color: colors.dim,
            }}
          >
            {item.detail}
          </div>
        )}
      </div>
    </div>
  );
};

const ShareItemCover = ({
  item,
  tab,
}: {
  item: ShareItem;
  tab: ShareTabId;
}) => {
  const { colors } = useUITheme();
  const preview = item.preview;

  if (preview.kind === "media") {
    return (
      <LazyMount>
        {preview.item.kind === "image" ? (
          <ImageSurface item={preview.item} variant="thumb" />
        ) : (
          <VideoThumb item={preview.item} />
        )}
      </LazyMount>
    );
  }

  if (preview.kind === "background") {
    return (
      <BgSwatch
        bg={preview.background}
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  const Icon = preview.kind === "audio" ? Music : TAB_ICON[tab];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: fade(colors.accent, 0.1),
        color: colors.accentSoft,
      }}
    >
      <Icon size={22} />
    </div>
  );
};
