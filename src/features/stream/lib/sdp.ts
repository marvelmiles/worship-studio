import { MAX_VIDEO_BITRATE, START_VIDEO_BITRATE } from "./videoQuality";

const LINE_BREAK = "\r\n";

const CANDIDATE_PREFIX = "a=candidate:";
const CANDIDATE_TRANSPORT = /^a=candidate:\S+ \d+ (\S+)/;
const LINK_LOCAL_ADDRESS = /^(169\.254\.|fe80:)/i;

const isCandidate = (line: string): boolean =>
  line.startsWith(CANDIDATE_PREFIX);

// A TCP candidate needs a passive peer and a link-local address never routes, so neither can win a LAN pairing.
const isUnreachableCandidate = (line: string): boolean => {
  const transport = line.match(CANDIDATE_TRANSPORT)?.[1];
  if (!transport) return false;
  if (transport.toLowerCase() === "tcp") return true;
  return LINK_LOCAL_ADDRESS.test(line.split(" ")[4] ?? "");
};

// Only the transmitted copy is compacted; the local description keeps every candidate the browser gathered.
export const compactSdp = (sdp: string): string => {
  const lines = sdp.split(/\r\n|\n/).filter((line) => line.trim() !== "");
  const kept = lines.filter(
    (line) => !isCandidate(line) || !isUnreachableCandidate(line),
  );
  // A host with nothing but link-local addresses keeps them: an unusable candidate still beats no candidate at all.
  return (kept.some(isCandidate) ? kept : lines).join("\n");
};

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
