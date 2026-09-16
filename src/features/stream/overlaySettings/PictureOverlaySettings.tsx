import { useState } from "react";
import { OverlayImageField } from "../OverlayControls";
import { OverlayImagePicker } from "../OverlayImagePicker";
import { useOverlayImageName } from "../lib/useOverlayImageName";
import type { ContentOverlay } from "../lib/streamOverlay";
import { editStreamOverlay } from "../lib/streamOverlayStore";
import { MissingContentNotice } from "./MissingContentNotice";

export const PictureOverlaySettings = ({
  overlay,
}: {
  overlay: ContentOverlay;
}) => {
  const [isPicking, setIsPicking] = useState(false);
  const pictureName = useOverlayImageName({
    id: overlay.contentId,
    source: overlay.source,
  });

  return (
    <>
      {!pictureName && <MissingContentNotice />}
      <OverlayImageField
        label="Picture"
        pictureName={pictureName}
        onChoose={() => setIsPicking(true)}
        onClear={() => setIsPicking(true)}
      />
      <OverlayImagePicker
        open={isPicking}
        title="Change the picture"
        onClose={() => setIsPicking(false)}
        onPick={(choice) => {
          editStreamOverlay(overlay.id, {
            contentId: choice.id,
            source: choice.source,
            label: choice.name,
          });
          setIsPicking(false);
        }}
      />
    </>
  );
};
