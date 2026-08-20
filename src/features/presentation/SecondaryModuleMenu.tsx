import { useMemo, useState } from "react";
import {
  Combine,
  Film,
  Image as ImageIcon,
  Radio,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { MediaItem } from "../../types";
import type { SecondaryModuleKind } from "../../lib/presentChannel";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { sortMediaByRecency } from "../../lib/media";
import { useThumbUrl } from "../../lib/blobUrls";
import { Button } from "../../components/ui/Button";
import { Popover } from "../../components/ui/Popover";
import { PillTabs, type PillTab } from "../../components/ui/PillTabs";
import { SearchInput } from "../../components/ui/SearchInput";
import { PipPlacementControls } from "../../components/ui/PipPlacementControls";
import { StageButton } from "../../components/ui/Button";
import { primaryCamera, useStreamSession } from "../stream/lib/streamSession";

const PANEL_WIDTH = 320;

const TABS: PillTab<SecondaryModuleKind>[] = [
  { id: "stream", label: "Live camera", icon: Radio },
  { id: "video", label: "Videos", icon: Film },
  { id: "image", label: "Images", icon: ImageIcon },
];

interface SecondaryModuleMenuProps {
  /** "stage" matches the presentation's own controls; "mini" the floating presenter. */
  variant: "stage" | "mini";
}

/**
 * The controls for the second module running in a corner of the stage: what it
 * shows, where it sits, how big it is, whether it is heard, and taking it away
 * again.
 *
 * One panel serves the full stage and the floating presenter, because it is the
 * same decision from either: the operator who put a clip in the corner during a
 * sermon is the one who moves it out of the preacher's way ten seconds later,
 * and they should not have to leave whichever surface they are working on.
 */
export function SecondaryModuleMenu({ variant }: SecondaryModuleMenuProps) {
  const [open, setOpen] = useState(false);
  const secondary = useStore((s) => s.secondaryPresentation);
  const active = Boolean(secondary);

  const title = active
    ? "Second module: choose, move or remove it"
    : "Add a second module in a corner of the stage";

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="bottom"
      align="end"
      trigger={
        variant === "stage" ? (
          <StageButton icon={Combine} title={title} active={active || open} />
        ) : (
          <MiniTrigger active={active || open} title={title} />
        )
      }
    >
      <SecondaryModulePanel onDone={() => setOpen(false)} />
    </Popover>
  );
}

function MiniTrigger({ active, title }: { active: boolean; title: string }) {
  const { colors } = useUITheme();
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: 8,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        background: active ? fade(colors.accent, 0.18) : "transparent",
        color: active ? colors.accentSoft : colors.sub,
        border: `1px solid ${active ? fade(colors.accent, 0.3) : "transparent"}`,
      }}
    >
      <Combine size={15} />
    </button>
  );
}

function SecondaryModulePanel({ onDone }: { onDone: () => void }) {
  const { colors, fonts } = useUITheme();
  const media = useStore((s) => s.media);
  const pushToast = useStore((s) => s.pushToast);
  const secondary = useStore((s) => s.secondaryPresentation);
  const presentSecondary = useStore((s) => s.presentSecondary);
  const patchPlacement = useStore((s) => s.patchSecondaryPlacement);
  const setMuted = useStore((s) => s.setSecondaryMuted);
  const stopSecondary = useStore((s) => s.stopSecondary);
  const session = useStreamSession();

  const [tab, setTab] = useState<SecondaryModuleKind>(
    secondary?.kind ?? "video",
  );
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    if (tab === "stream") return [];
    const needle = query.trim().toLowerCase();
    return media
      .filter((item) => item.kind === tab)
      .filter((item) => !needle || item.name.toLowerCase().includes(needle))
      .sort(sortMediaByRecency);
  }, [media, tab, query]);

  const cameraName = primaryCamera(session)?.deviceName;

  const choose = (kind: SecondaryModuleKind, id?: string) => {
    if (presentSecondary(kind, id)) {
      onDone();
      return;
    }
    pushToast("That item is no longer in the library.", "error");
  };

  return (
    <div
      style={{
        width: PANEL_WIDTH,
        maxWidth: "calc(100vw - 24px)",
        padding: 14,
        borderRadius: 14,
        background: fade(colors.panelSolid, 0.97),
        backdropFilter: "blur(18px) saturate(150%)",
        WebkitBackdropFilter: "blur(18px) saturate(150%)",
        border: `1px solid ${colors.border}`,
        boxShadow: "0 20px 55px rgba(0,0,0,0.55)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 15,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          Second module
        </div>
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 12,
            lineHeight: 1.5,
            color: colors.sub,
            margin: "4px 0 0",
          }}
        >
          Runs in a corner of the stage beside whatever is already on it, on the
          preview and on the audience display alike.
        </p>
      </div>

      {secondary && (
        <div
          style={{
            padding: 11,
            borderRadius: 11,
            background: colors.bg,
            border: `1px solid ${fade(colors.accent, 0.35)}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="ws-ellipsis"
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: fonts.ui,
                fontSize: 13,
                fontWeight: 700,
                color: colors.text,
              }}
            >
              {secondary.kind === "stream"
                ? (cameraName ?? "Live camera")
                : (secondary.item?.name ?? "Missing item")}
            </span>
            <Button
              variant={secondary.muted ? "ghost" : "primary"}
              size="sm"
              onClick={() => setMuted(!secondary.muted)}
              title={
                secondary.muted
                  ? "Let this window be heard"
                  : "Silence this window"
              }
            >
              {secondary.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {secondary.muted ? "Muted" : "Audible"}
            </Button>
          </div>

          <PipPlacementControls
            placement={secondary.placement}
            onChange={patchPlacement}
          />

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              stopSecondary();
              onDone();
            }}
          >
            <Trash2 size={14} />
            Remove the second module
          </Button>
        </div>
      )}

      <PillTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "stream" ? (
        <CameraChoice
          connected={Boolean(primaryCamera(session)?.stream)}
          name={cameraName}
          chosen={secondary?.kind === "stream"}
          onChoose={() => choose("stream")}
        />
      ) : (
        <>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={tab === "video" ? "Search videos…" : "Search images…"}
            style={{ minWidth: 0 }}
          />
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {items.length === 0 ? (
              <span
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 12.5,
                  color: colors.dim,
                  padding: "10px 2px",
                }}
              >
                {query
                  ? "Nothing matches that."
                  : `No ${tab === "video" ? "videos" : "images"} in the library yet.`}
              </span>
            ) : (
              items.map((item) => (
                <MediaChoice
                  key={item.id}
                  item={item}
                  chosen={secondary?.id === item.id}
                  onChoose={() => choose(item.kind, item.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CameraChoice({
  connected,
  name,
  chosen,
  onChoose,
}: {
  connected: boolean;
  name?: string;
  chosen: boolean;
  onChoose: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 12,
          lineHeight: 1.5,
          color: colors.sub,
          margin: 0,
        }}
      >
        {connected
          ? `Shows ${name ?? "the camera"} the Stream module is receiving, live in the corner.`
          : "No camera is connected yet. Join one from the Stream page and it appears here on its own."}
      </p>
      <Button
        variant={chosen ? "ghost" : "primary"}
        size="sm"
        onClick={onChoose}
        disabled={chosen}
      >
        <Radio size={14} />
        {chosen ? "Already in the corner" : "Show the live camera"}
      </Button>
    </div>
  );
}

function MediaChoice({
  item,
  chosen,
  onChoose,
}: {
  item: MediaItem;
  chosen: boolean;
  onChoose: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const thumbUrl = useThumbUrl(item.hasThumb ? item.id : null);
  return (
    <button
      onClick={onChoose}
      title={chosen ? `${item.name} is already showing` : `Show ${item.name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 6,
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        background: chosen ? fade(colors.accent, 0.16) : "transparent",
        border: `1px solid ${chosen ? fade(colors.accent, 0.3) : "transparent"}`,
        color: colors.text,
      }}
    >
      <span
        style={{
          width: 52,
          height: 30,
          flexShrink: 0,
          borderRadius: 6,
          overflow: "hidden",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          display: "grid",
          placeItems: "center",
          color: colors.dim,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : item.kind === "video" ? (
          <Film size={14} />
        ) : (
          <ImageIcon size={14} />
        )}
      </span>
      <span
        className="ws-ellipsis"
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: fonts.ui,
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {item.name}
      </span>
    </button>
  );
}
