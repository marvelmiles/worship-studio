import { useState } from "react";
import { OverlayImageField } from "../OverlayControls";
import { OverlayImagePicker } from "../OverlayImagePicker";
import { useOverlayImageName } from "../lib/useOverlayImageName";
import type { OverlayImageRef } from "../lib/overlayAppearance";

interface SurfacePictureFieldProps {
  label: string;
  image: OverlayImageRef | null;
  onChange: (image: OverlayImageRef | null) => void;
}

export const SurfacePictureField = ({
  label,
  image,
  onChange,
}: SurfacePictureFieldProps) => {
  const [isPicking, setIsPicking] = useState(false);
  const pictureName = useOverlayImageName(image);

  return (
    <>
      <OverlayImageField
        label={label}
        pictureName={pictureName}
        onChoose={() => setIsPicking(true)}
        onClear={() => onChange(null)}
      />
      <OverlayImagePicker
        open={isPicking}
        title={label}
        onClose={() => setIsPicking(false)}
        onClear={() => onChange(null)}
        onPick={(choice) => {
          onChange({ id: choice.id, source: choice.source });
          setIsPicking(false);
        }}
      />
    </>
  );
};
