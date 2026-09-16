import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Music } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useAttention } from "../../hooks/useAttention";
import { parseOverlayTarget } from "../../lib/overlayTarget";
import { Modal } from "../../components/ui/Modal";
import { PillTabs } from "../../components/ui/PillTabs";
import type { PillTab } from "../../components/ui/PillTabs";
import type { AssetSection } from "./assetLibraryNavigation";
import { useReopenAssetLibraryOnArrival } from "./assetLibraryNavigation";
import { BackgroundsPanel } from "./BackgroundsPanel";
import { AudioPanel } from "./AudioPanel";

const TABS: PillTab<AssetSection>[] = [
  { id: "backgrounds", label: "Backgrounds", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
];

const LOCKED_TITLE: Record<AssetSection, string> = {
  backgrounds: "Background Cover Library",
  audio: "Audio Library",
};

const isAssetSection = (value?: string): value is AssetSection =>
  value === "backgrounds" || value === "audio";

export const AssetsModal = () => {
  const overlay = useStore((s) => s.overlay);
  const overlayContext = useStore((s) => s.overlayContext);
  const locked = useStore((s) => s.overlaySectionLocked);
  const close = useStore((s) => s.closeOverlay);
  const backgrounds = useStore((s) => s.backgrounds);

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

  return (
    <Modal
      open={overlay === "assets"}
      onClose={close}
      title={sectionLocked ? LOCKED_TITLE[tab] : "Asset Library"}
      width={680}
    >
      <div ref={contentRef}>
        {!sectionLocked && (
          <div style={{ marginBottom: 18 }}>
            <PillTabs<AssetSection> tabs={TABS} value={tab} onChange={setTab} />
          </div>
        )}
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
    </Modal>
  );
};
