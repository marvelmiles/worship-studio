import { MAX_VIDEO_BITRATE, START_VIDEO_BITRATE } from "./videoQuality";

const LINE_BREAK = "\r\n";

// Only the copy sent to the phone carries these hints; browsers validate a local description against the one they generated.
export const withVideoQualityHints = (sdp: string): string => {
  return withStartBitrate(withVideoBandwidth(sdp));
};

const withVideoBandwidth = (sdp: string): string => {
  const kilobitsPerSecond = Math.round(MAX_VIDEO_BITRATE / 1000);
  const out: string[] = [];
  let inVideoSection = false;
  let bandwidthPending = false;

  for (const line of sdp.split(/\r\n|\n/)) {
    if (line.startsWith("m=")) {
      inVideoSection = line.startsWith("m=video");
      bandwidthPending = inVideoSection;
      out.push(line);
      continue;
    }
    if (bandwidthPending && line.startsWith("a=")) {
      out.push(`b=AS:${kilobitsPerSecond}`, `b=TIAS:${MAX_VIDEO_BITRATE}`);
      bandwidthPending = false;
    }
    if (inVideoSection && line.startsWith("b=")) continue;
    out.push(line);
  }

  return out.join(LINE_BREAK);
};

const START_BITRATE_PARAM = "x-google-start-bitrate";

const withStartBitrate = (sdp: string): string => {
  const kilobitsPerSecond = Math.round(START_VIDEO_BITRATE / 1000);
  const out: string[] = [];
  let inVideoSection = false;

  for (const line of sdp.split(/\r\n|\n/)) {
    if (line.startsWith("m=")) {
      inVideoSection = line.startsWith("m=video");
      out.push(line);
      continue;
    }
    const formatParameters = inVideoSection
      ? line.match(/^a=fmtp:\d+ (.+)$/)
      : null;
    out.push(
      formatParameters && !formatParameters[1].includes(START_BITRATE_PARAM)
        ? `${line};${START_BITRATE_PARAM}=${kilobitsPerSecond}`
        : line,
    );
  }

  return out.join(LINE_BREAK);
};
