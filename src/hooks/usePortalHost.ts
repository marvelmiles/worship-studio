import { useState } from "react";

export const usePortalHost = (): HTMLDivElement => {
  const [host] = useState(() => {
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.inset = "0";
    return element;
  });
  return host;
};
