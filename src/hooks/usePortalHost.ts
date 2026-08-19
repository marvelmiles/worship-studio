import { useState } from "react";

/**
 * A detached element that content is rendered into once and then moved between
 * mount points, instead of being torn down and rebuilt at each one.
 *
 * A `<video>` is the reason this exists: React would unmount the element when
 * the tree around it changes, and the replacement opens empty, buffers and
 * starts again, which an audience sees as the clip stopping. Rendering it into
 * a host that only ever changes parent keeps the same element, and with it the
 * clip's position and buffer, across the move.
 */
export function usePortalHost(): HTMLDivElement {
  const [host] = useState(() => {
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.inset = "0";
    return element;
  });
  return host;
}
