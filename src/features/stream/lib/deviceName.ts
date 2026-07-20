/**
 * Best-effort real name for the device sharing its camera, so the other side's
 * list reads like "Itel A60" or "Pixel 7" rather than a generic label.
 *
 * The reliable source is the User-Agent Client Hints `model` value, which
 * Android Chromium exposes (that's where a real model name comes from). Browsers
 * do not expose a computer's hostname to web pages, so on desktop this falls
 * back to the platform (e.g. "Windows PC"). It's a hint, never guaranteed.
 */

interface HighEntropyUAData {
  getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platform?: string }>;
}

export async function detectDeviceName(): Promise<string> {
  const uaData = (navigator as unknown as { userAgentData?: HighEntropyUAData }).userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const hv = await uaData.getHighEntropyValues(["model", "platform"]);
      if (hv.model && hv.model.trim() && hv.model.trim() !== "K") return hv.model.trim();
      if (hv.platform && hv.platform.trim()) return platformName(hv.platform.trim());
    } catch {
      /* fall through to UA sniffing */
    }
  }
  return fromUserAgent(navigator.userAgent);
}

function platformName(platform: string): string {
  if (/android/i.test(platform)) return "Android device";
  if (/win/i.test(platform)) return "Windows PC";
  if (/mac/i.test(platform)) return "Mac";
  if (/linux/i.test(platform)) return "Linux device";
  return platform;
}

function fromUserAgent(ua: string): string {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    // Older Android UAs still carry the model between the build tag markers.
    const match = ua.match(/;\s?([^;)]+?)\s+Build\//);
    if (match?.[1]) return match[1].trim();
    return "Android device";
  }
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux device";
  return "Camera";
}
