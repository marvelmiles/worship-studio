import type { CSSProperties, ReactNode } from "react";
import type { Background, ImageSettings } from "../../types";
import { BackgroundSurface } from "../media/BackgroundSurface";

interface BgSwatchProps {
  bg?: Background;
  settings?: ImageSettings | null;
  style?: CSSProperties;
  children?: ReactNode;
}

export const BgSwatch = ({ bg, settings, style, children }: BgSwatchProps) => {
  return (
    <div style={{ position: "relative", overflow: "hidden", ...style }}>
      <BackgroundSurface background={bg} settings={settings} variant="thumb" />
      {children != null && (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {children}
        </div>
      )}
    </div>
  );
};
