import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useAttention } from "../../hooks/useAttention";
import { parseOverlayTarget } from "../../lib/overlayTarget";
import { Modal } from "../../components/ui/Modal";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import type { SegmentedTab } from "../../components/ui/SegmentedTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import type { AssetSection } from "./assetLibraryNavigation";
import { useReopenAssetLibraryOnArrival } from "./assetLibraryNavigation";
import { BackgroundsPanel } from "./BackgroundsPanel";
import { AudioPanel } from "./AudioPanel";

interface AssetSectionMeta {
  label: string;
  icon: LucideIcon;
  lockedTitle: string;
}

const SECTIONS: Record<AssetSection, AssetSectionMeta> = {
  backgrounds: {
    label: "Backgrounds",
    icon: ImageIcon,
    lockedTitle: "Background Cover Library",
  },
  audio: {
    label: "Audio",
    icon: Music,
    lockedTitle: "Audio Library",
  },
};

const TAB_PREFIX = "asset-library";

const isAssetSection = (value?: string): value is AssetSection =>
  value === "backgrounds" || value === "audio";

export const AssetsModal = () => {
  const overlay = useStore((s) => s.overlay);
  const overlayContext = useStore((s) => s.overlayContext);
  const locked = useStore((s) => s.overlaySectionLocked);
  const close = useStore((s) => s.closeOverlay);
  const backgrounds = useStore((s) => s.backgrounds);
  const audio = useStore((s) => s.audio);

  useReopenAssetLibraryOnArrival();

  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<AssetSection>("backgrounds");

  const target =
    overlay === "assets" ? parseOverlayTarget(overlayContext) : null;
  const targetItemId = target?.itemId ?? null;
  const attentionTarget =
    backgrounds.find((bg) => bg.type === "video" && bg.id === targetItemId)
      ?.mediaId ?? targetItemId;
  const attentionId = useAttention(attentionTarget, contentRef);
  const targetSection = target?.section;
  useEffect(() => {
    if (isAssetSection(targetSection)) setTab(targetSection);
  }, [targetSection]);

  const sectionLocked = locked && isAssetSection(targetSection);

  const tabs = useMemo<SegmentedTab<AssetSection>[]>(
    () => [
      {
        id: "backgrounds",
        label: SECTIONS.backgrounds.label,
        icon: SECTIONS.backgrounds.icon,
        count: backgrounds.length,
      },
      {
        id: "audio",
        label: SECTIONS.audio.label,
        icon: SECTIONS.audio.icon,
        count: audio.length,
      },
    ],
    [audio.length, backgrounds.length],
  );

  return (
    <Modal
      open={overlay === "assets"}
      onClose={close}
      title={sectionLocked ? SECTIONS[tab].lockedTitle : "Asset Library"}
      width={720}
    >
      <div
        ref={contentRef}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {!sectionLocked && (
          <SegmentedTabs<AssetSection>
            ariaLabel="Asset kinds"
            idPrefix={TAB_PREFIX}
            tabs={tabs}
            value={tab}
            onChange={setTab}
          />
        )}
        <div {...pillTabPanelProps(TAB_PREFIX, tab)}>
          {tab === "backgrounds" ? (
            <BackgroundsPanel
              attentionId={attentionId}
              targetItemId={attentionTarget}
            />
          ) : (
            <AudioPanel
              attentionId={attentionId}
              targetItemId={attentionTarget}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};
