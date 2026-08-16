import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Image as ImageIcon, Library, X } from "lucide-react";
import type { SlideMediaSource } from "../../types";
import { useStore } from "../../store/useStore";
import { useUITheme } from "../../theme/ThemeProvider";
import { isImageBackground } from "../../lib/media";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PillTabs } from "../../components/ui/PillTabs";
import { inputStyle } from "../../components/ui/Field";
import { ImageSurface } from "../../components/media/ImageSurface";
import { BgSwatch } from "../../components/controls/BgSwatch";
import type { OverlayImageRef } from "./lib/overlayAppearance";

export interface OverlayImageChoice extends OverlayImageRef {
  name: string;
}

interface PickableImage extends OverlayImageChoice {
  /** Rendered as the row's preview, since the two libraries draw differently. */
  preview: ReactNode;
}

const SOURCE_TABS: { id: SlideMediaSource; label: string }[] = [
  { id: "media", label: "Media library" },
  { id: "background", label: "Asset library" },
];

const SOURCE_EMPTY: Record<SlideMediaSource, string> = {
  media: "Upload a picture in the Media library and it will appear here.",
  background: "Add a picture background in the asset library to use it here.",
};

/**
 * Picks a picture for the broadcast from either library that holds one.
 *
 * Pictures live in two places in this app: uploads in the media module, and
 * picture backgrounds in the asset library. Mid-service an operator reaching
 * for a logo, a lower-third plate or a sponsor card has no reason to remember
 * which one it was filed under, so both are offered side by side and the
 * choice carries its own source back (see OverlayPicture, which resolves it).
 */
export function OverlayImagePicker({
  open,
  title = "Add a picture",
  onPick,
  onClose,
  onClear,
}: {
  open: boolean;
  title?: string;
  onPick: (choice: OverlayImageChoice) => void;
  onClose: () => void;
  /** Offers a "no picture" action, for the settings that allow one. */
  onClear?: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const backgrounds = useStore((s) => s.backgrounds);
  const [source, setSource] = useState<SlideMediaSource>("media");
  const [query, setQuery] = useState("");

  const items = useMemo<PickableImage[]>(() => {
    if (source === "media") {
      return media
        .filter((item) => item.kind === "image")
        .map((item) => ({
          id: item.id,
          name: item.name,
          source: "media" as const,
          preview: <ImageSurface item={item} variant="thumb" />,
        }));
    }
    return backgrounds.filter(isImageBackground).map((background) => ({
      id: background.id,
      name: background.name,
      source: "background" as const,
      preview: (
        <BgSwatch bg={background} style={{ width: "100%", height: "100%" }} />
      ),
    }));
  }, [source, media, backgrounds]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={title} width={470}>
      <div style={{ marginBottom: 12 }}>
        <PillTabs tabs={SOURCE_TABS} value={source} onChange={setSource} />
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search pictures"
        aria-label="Search pictures"
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {onClear && (
        <div style={{ marginBottom: 12 }}>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              onClear();
              onClose();
            }}
          >
            <X size={14} />
            No picture
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={source === "media" ? ImageIcon : Library}
          title={items.length === 0 ? "Nothing here yet" : "No matches"}
          message={
            items.length === 0
              ? SOURCE_EMPTY[source]
              : "Try a different search."
          }
          compact
          bare
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {filtered.map((item) => (
            <button
              key={`${item.source}:${item.id}`}
              onClick={() => onPick(item)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                width: "100%",
                textAlign: "left",
                padding: 7,
                borderRadius: 11,
                cursor: "pointer",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontFamily: fonts.ui,
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  position: "relative",
                  width: 60,
                  height: 34,
                  flexShrink: 0,
                  borderRadius: 7,
                  overflow: "hidden",
                  background: colors.raise,
                }}
              >
                {item.preview}
              </span>
              <span className="ws-ellipsis" style={{ minWidth: 0 }}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
