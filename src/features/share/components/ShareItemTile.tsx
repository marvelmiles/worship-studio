import type { KeyboardEvent } from "react";
import { Check, Music, Settings } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { BgSwatch } from "../../../components/controls/BgSwatch";
import { ImageSurface } from "../../../components/media/ImageSurface";
import { VideoThumb } from "../../../components/media/VideoThumb";
import { LazyMount } from "../../../components/ui/LazyMount";
import type { ShareItem, SharePreview } from "../../../lib/shareCatalog";

interface ShareItemTileProps {
  item: ShareItem;
  picked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export const ShareItemTile = ({
  item,
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
        <ShareItemCover preview={item.preview} />
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

const FILL = { width: "100%", height: "100%" } as const;

const ShareItemCover = ({ preview }: { preview: SharePreview }) => {
  const { colors, fonts } = useUITheme();

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
        settings={preview.settings}
        videoSettings={preview.videoSettings}
        style={FILL}
      />
    );
  }

  if (preview.kind === "deck") {
    const theme = preview.theme;
    return (
      <BgSwatch
        bg={preview.background}
        settings={preview.settings}
        videoSettings={preview.videoSettings}
        style={FILL}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: "8px 10px",
            textAlign: theme?.align ?? "center",
            fontFamily: theme?.fontFamily ?? fonts.display,
            fontWeight: theme?.fontWeight ?? 600,
            fontSize: 11,
            lineHeight: 1.35,
            letterSpacing: theme ? theme.letterSpacing / 4 : 0,
            textTransform: theme?.uppercase ? "uppercase" : "none",
            color: theme?.color ?? colors.text,
            textShadow: preview.background
              ? "0 1px 6px rgba(0,0,0,0.65)"
              : undefined,
            overflow: "hidden",
          }}
        >
          <span className="ws-clamp-3">{preview.text}</span>
        </span>
      </BgSwatch>
    );
  }

  if (preview.kind === "theme") {
    const { theme } = preview;
    return (
      <BgSwatch bg={preview.background} style={FILL}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: theme.fontFamily,
            fontWeight: theme.fontWeight,
            fontSize: 22,
            letterSpacing: theme.letterSpacing / 3,
            textTransform: theme.uppercase ? "uppercase" : "none",
            color: theme.color,
            textShadow: preview.background
              ? "0 1px 6px rgba(0,0,0,0.65)"
              : undefined,
          }}
        >
          Aa
        </span>
      </BgSwatch>
    );
  }

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
      {preview.kind === "audio" ? <Music size={22} /> : <Settings size={22} />}
    </div>
  );
};
