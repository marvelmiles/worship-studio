/**
 * The single source of truth for the projected camera's picture quality, shared
 * by the capture half (cameras.ts) and the transport half (peer.ts) of the
 * stream module. Capture, encode and playout have to agree — asking the camera
 * for 1080p is wasted if the encoder is left at a bitrate that can't carry it —
 * so every number lives here rather than beside the code that applies it.
 *
 * The whole profile is tuned for one situation: a phone camera on the same WiFi
 * filling a projector screen. That means a LAN's headroom to spend and a room
 * full of people who notice when the picture is a beat behind the person on
 * stage.
 */

interface QualityRange {
  /** The floor we will insist on before falling back. */
  min: number;
  /** What we actually want. */
  ideal: number;
}

const WIDTH: QualityRange = { min: 1280, ideal: 1920 };
const HEIGHT: QualityRange = { min: 720, ideal: 1080 };
const FRAME_RATE: QualityRange = { min: 24, ideal: 30 };
const ASPECT_RATIO = 16 / 9;

function captureProfile(withFloors: boolean): MediaTrackConstraints {
  const range = ({ min, ideal }: QualityRange) =>
    withFloors ? { min, ideal } : { ideal };
  return {
    width: range(WIDTH),
    height: range(HEIGHT),
    frameRate: range(FRAME_RATE),
    aspectRatio: { ideal: ASPECT_RATIO },
  };
}

/**
 * The capture profile we ask for first.
 *
 * The floors matter as much as the ideals. Given only an `ideal`, a browser is
 * free to hand back whatever it finds cheapest, and phones routinely answer a
 * 1920x1080 request with a 640x480 capture — which the receiver then stretches
 * across a projector. That upscale is what a soft, mushy feed usually is, and no
 * amount of bitrate fixes it, because the detail was never captured. A `min`
 * makes the browser either honour the request or reject it outright, and a
 * rejection is something we can react to (see VIDEO_CAPTURE_PREFERRED).
 *
 * `aspectRatio` pins the shape. A phone reports its camera in the current
 * interface orientation, so a phone held upright can otherwise deliver a
 * 1080x1920 portrait frame that the 16:9 projection crops to a narrow strip and
 * blows up — sharp pixels, blurry result.
 */
export const VIDEO_CAPTURE = captureProfile(true);

/**
 * The same profile with every floor dropped, tried when the floored one is
 * rejected. Laptop webcams and older phones genuinely cap below 720p, and a
 * lower-resolution feed beats no feed at all.
 */
export const VIDEO_CAPTURE_PREFERRED = captureProfile(false);

/**
 * The encoder's bitrate ceiling. WebRTC aims low unless told otherwise, which on
 * a LAN leaves a projected feed soft for no reason.
 *
 * The ceiling is deliberately not the largest number the network could carry.
 * 1080p30 H.264 looks clean well under 6 Mbps, and a ceiling far above what the
 * picture needs only invites the encoder to fill a phone's uplink queue on a
 * busy WiFi — which is how a stream ends up sharp *and* a second behind. Six
 * megabits is generous for the picture and modest for the link.
 */
export const MAX_VIDEO_BITRATE = 6_000_000;

/**
 * What the encoder opens at, before congestion control has measured the link.
 * WebRTC starts near 300 kbps and ramps over several seconds, so the first thing
 * an operator sees after connecting is the worst the stream will ever look —
 * exactly when they are judging it. On a LAN that caution buys nothing, so we
 * start where a 1080p picture is already presentable and let the usual
 * congestion control adapt from there.
 */
export const START_VIDEO_BITRATE = 2_500_000;

export const MAX_VIDEO_FRAMERATE = 30;

/**
 * Video codecs to offer ahead of the rest, most preferred first.
 *
 * This is the single most consequential setting in the module for a phone
 * sender. An iPhone encodes H.264 in dedicated silicon; for VP8, VP9 and AV1 it
 * has to fall back to a software encoder. Software-encoding 1080p saturates the
 * CPU, so the phone throttles: it drops resolution to keep up, which is the soft
 * picture, and still misses the frame deadline, which is the lag — and it heats
 * up doing it. Both reported symptoms, one cause.
 *
 * The receiver publishes the offer, so it is the receiver's codec order that
 * decides which encoder the phone ends up running. VP8 is listed second because
 * every WebRTC stack has it, making it the safe common ground when a sender has
 * no H.264 at all.
 */
export const PREFERRED_VIDEO_CODECS = ["video/h264", "video/vp8"] as const;

/**
 * What the encoder should protect when it cannot have everything.
 *
 * "detail" tells it to hold the resolution and pay for a shortfall in frame
 * rate. That is right for a shared spreadsheet and wrong for a camera pointed at
 * people: the picture visibly stutters, which is what "the broadcast lags" looks
 * like from the pew even when the network is fine.
 */
export const VIDEO_CONTENT_HINT = "motion";

/**
 * How the encoder should adapt under load. "maintain-resolution" forbids any
 * downscale, so a bandwidth dip is paid for entirely in frame rate and
 * compression artefacts — a 1080p image that judders and smears, which is worse
 * on a projector than a slightly smaller one that stays clean. "balanced" lets
 * the encoder give up a little of each.
 */
export const VIDEO_DEGRADATION_PREFERENCE: RTCDegradationPreference =
  "balanced";

/**
 * How much video the receiver may buffer before playing it, in seconds.
 *
 * Chrome sizes its jitter buffer for the open internet and, once a hiccup has
 * stretched it, is slow to give the delay back — so the projection drifts
 * steadily behind the room and stays there. One WiFi hop needs almost none of
 * that. A tenth of a second still absorbs ordinary WiFi jitter while cutting the
 * bulk of the delay; asking for a true zero trades the lag for frozen frames.
 */
export const PLAYOUT_DELAY_SECONDS = 0.1;
