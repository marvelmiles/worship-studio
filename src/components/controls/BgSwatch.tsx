import type { CSSProperties, ReactNode } from "react";
import type { Background, ImageSettings } from "../../types";
import { BackgroundSurface } from "../media/BackgroundSurface";

interface BgSwatchProps {
  bg?: Background;
  /** Picture settings to preview with; defaults to the asset library's own. */
  settings?: ImageSettings | null;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Small preview surface for any background. Uploaded pictures resolve their
 * stored thumbnail to an object URL only while this swatch is mounted.
 */
export function BgSwatch({ bg, settings, style, children }: BgSwatchProps) {
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
}
