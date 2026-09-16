import type { CSSProperties } from "react";
import type { Background } from "../../../types";
import { studioTheme } from "../../../theme/uiTheme";

const STAGE_BLACK = studioTheme.stage.surface;

export const STAGE_TRANSPORT_STYLE: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 86,
  transform: "translateX(-50%)",
  zIndex: 20,
  width: "min(680px, calc(100vw - 32px))",
};

export const DECK_END_LABELS: Record<string, string> = {
  manuscript: "End of manuscript",
  scripture: "End of passage",
  image: "End of images",
  video: "End of video",
};

/** The projected backdrop behind the slide, which a video background paints over. */
export const stageBackgroundStyle = (
  background: Background | null,
  blobUrl: string | null,
): CSSProperties => {
  if (!background) return { background: STAGE_BLACK };
  if (background.type === "image") {
    const url = background.blobId ? blobUrl : background.dataUrl;
    return {
      backgroundImage: url ? `url(${url})` : undefined,
      backgroundColor: STAGE_BLACK,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (background.type === "solid") return { background: background.color };
  if (background.type === "video") return { background: STAGE_BLACK };
  return { background: background.css || STAGE_BLACK };
};
