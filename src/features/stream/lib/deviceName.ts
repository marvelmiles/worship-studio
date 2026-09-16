interface HighEntropyUAData {
  getHighEntropyValues?: (
    hints: string[],
  ) => Promise<{ model?: string; platform?: string }>;
}

export const detectDeviceName = async (): Promise<string> => {
  const uaData = (navigator as unknown as { userAgentData?: HighEntropyUAData })
    .userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hv = await uaData.getHighEntropyValues(["model", "platform"]);
      if (hv.model && hv.model.trim() && hv.model.trim() !== "K")
        return hv.model.trim();
      if (hv.platform && hv.platform.trim())
        return platformName(hv.platform.trim());
    } catch {}
  }
  return fromUserAgent(navigator.userAgent);
};

const platformName = (platform: string): string => {
  if (/android/i.test(platform)) return "Android device";
  if (/win/i.test(platform)) return "Windows PC";
  if (/mac/i.test(platform)) return "Mac";
  if (/linux/i.test(platform)) return "Linux device";
  return platform;
};

const fromUserAgent = (ua: string): string => {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    const match = ua.match(/;\s?([^;)]+?)\s+Build\//);
    if (match?.[1]) return match[1].trim();
    return "Android device";
  }
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux device";
  return "Camera";
};
