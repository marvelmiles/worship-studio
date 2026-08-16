import { MAX_VIDEO_BITRATE, START_VIDEO_BITRATE } from "./videoQuality";

/**
 * The one quality lever the receiver has over the sender.
 *
 * WebRTC exposes bitrate control through `setParameters` on the *sending* side
 * only, and in this module the sender is a phone we don't run any code on
 * beyond what it loads itself. What the receiver can do is state its terms in
 * the offer: SDP carries bandwidth as a property of the media the offerer is
 * willing to receive, and every stack reads that when configuring its encoder.
 *
 * Only the SDP that goes over the wire is rewritten — never the description
 * handed to `setLocalDescription`, which browsers increasingly validate against
 * the one they generated.
 */

/** SDP is CRLF-delimited by spec, but arrives LF-delimited from some paths. */
const LINE_BREAK = "\r\n";

/**
 * Marks the receiver's offer with the bandwidth and opening bitrate the sender's
 * encoder should aim for.
 *
 * Two mechanisms, because no single one is honoured everywhere:
 *
 * - `b=AS` (kbps) and `b=TIAS` (bps) are the standard bandwidth lines. Without
 *   one, a stack that applies a conservative internal default never uses the LAN
 *   headroom that is actually sitting there.
 * - `x-google-start-bitrate` is libwebrtc's own hint, read off the negotiated
 *   codec, and it is the only way to skip the slow ramp from ~300 kbps. Chrome
 *   and Safari both build on libwebrtc so both honour it; anything else ignores
 *   an unknown fmtp parameter, which is the required behaviour and why adding it
 *   is safe.
 */
export function withVideoQualityHints(sdp: string): string {
  return withStartBitrate(withVideoBandwidth(sdp));
}

/**
 * Writes the bandwidth lines into every video section, replacing any already
 * there so a value can never be applied twice or contradict itself.
 *
 * Placement is fixed by RFC 4566: within a media section the order is m, i, c,
 * b, k, a. Inserting immediately before the section's first attribute line is
 * therefore always valid, and unlike anchoring to `c=` it still works if a
 * description carries its connection data at session level.
 */
function withVideoBandwidth(sdp: string): string {
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
}

const START_BITRATE_PARAM = "x-google-start-bitrate";

/**
 * Appends the opening-bitrate hint to the format parameters declared inside
 * video sections.
 *
 * The section, not the payload type number, is what decides. Payload numbers are
 * only unique within a media section, so an audio codec is free to reuse a
 * video one — collecting the video numbers and then matching `a=fmtp` lines on
 * the number alone tags the audio codec's parameters too.
 *
 * Deliberately append-only: existing parameters are never rewritten, payload
 * types without an `a=fmtp` line are left alone rather than given a fabricated
 * one, and a description that already carries the hint is untouched, so the
 * rewrite is safe to apply twice. A stream that ramps up slowly is a far smaller
 * problem than one that fails to negotiate.
 */
function withStartBitrate(sdp: string): string {
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
}
