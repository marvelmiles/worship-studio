import { useEffect, type RefObject } from "react";

// Mobile browsers pause live video while the page is hidden and do not always resume it on return.
export const useResumePlaybackOnVisible = (
  videoRef: RefObject<HTMLVideoElement>,
): void => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (document.visibilityState !== "visible" || !video) return;
      if (video.srcObject && video.paused) void video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [videoRef]);
};
