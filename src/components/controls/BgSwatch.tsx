import type { CSSProperties, ReactNode } from "react";
import type { Background, ImageSettings, VideoSettings } from "../../types";
import { BackgroundSurface } from "../media/BackgroundSurface";

interface BgSwatchProps {
  bg?: Background;
  settings?: ImageSettings | null;
  videoSettings?: VideoSettings | null;
  style?: CSSProperties;
  children?: ReactNode;
}

export const BgSwatch = ({
  bg,
  settings,
  videoSettings,
  style,
  children,
}: BgSwatchProps) => {
  return (
    <div style={{ position: "relative", overflow: "hidden", ...style }}>
      <BackgroundSurface
        background={bg}
        settings={settings}
        videoSettings={videoSettings}
        variant="thumb"
      />
      {children != null && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {children}
        </div>
      )}
    </div>
  );
};
