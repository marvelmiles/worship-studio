import { strToU8 } from "fflate";
import { MAX_VIDEO_BITRATE, START_VIDEO_BITRATE } from "./videoQuality";

const SESSION_LINES = [
  "v=0",
  "o=- 0 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0 1 2",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126",
  "m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 103 104 105 106 107 108 109 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 35 36 37 38 39 40 41 42 43 44 45 46",
];

const TRANSPORT_LINES = [
  "c=IN IP4 0.0.0.0",
  "a=rtcp:9 IN IP4 0.0.0.0",
  "a=candidate:1 1 udp 2113937151 192.168.1.1 50000 typ host generation 0 ufrag network-cost 999",
  "a=ice-ufrag:",
  "a=ice-pwd:",
  "a=ice-options:trickle",
  "a=fingerprint:sha-256 ",
  "a=setup:actpass",
  "a=setup:active",
  "a=setup:passive",
  "a=mid:0",
  "a=mid:1",
  "a=mid:2",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  "a=sendrecv",
  "a=sendonly",
  "a=recvonly",
  "a=inactive",
  "a=rtcp-mux",
  "a=rtcp-rsize",
];

const HEADER_EXTENSION_LINES = [
  "a=extmap:1 urn:ietf:params:rtp-hdrext:toffset",
  "a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
  "a=extmap:3 urn:3gpp:video-orientation",
  "a=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
  "a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay",
  "a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type",
  "a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing",
  "a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space",
  "a=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid",
  "a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
  "a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id",
  "a=extmap:13 urn:3gpp:video-orientation",
  "a=extmap:14 urn:ietf:params:rtp-hdrext:ssrc-audio-level",
];

const AUDIO_CODEC_LINES = [
  "a=rtpmap:0 PCMU/8000",
  "a=rtpmap:8 PCMA/8000",
  "a=rtpmap:9 G722/8000",
  "a=rtpmap:13 CN/8000",
  "a=rtpmap:110 telephone-event/48000",
  "a=rtpmap:126 telephone-event/8000",
  "a=rtpmap:63 red/48000/2",
  "a=fmtp:63 111/111",
  "a=rtpmap:111 opus/48000/2",
  "a=rtcp-fb:111 transport-cc",
  "a=fmtp:111 minptime=10;useinbandfec=1",
];

const STREAM_IDENTITY_LINES = [
  "a=ssrc-group:FID 1000000000 1000000001",
  "a=msid:- 00000000-0000-0000-0000-000000000000",
  "a=ssrc:1000000000 cname:aaaaaaaaaaaaaaaa",
  "a=ssrc:1000000000 msid:- 00000000-0000-0000-0000-000000000000",
];

const VIDEO_CODEC_LINES = [
  "a=rtpmap:96 red/90000",
  "a=rtpmap:96 ulpfec/90000",
  "a=rtpmap:96 flexfec-03/90000",
  "a=fmtp:96 repair-window=10000000",
  "a=rtpmap:96 H265/90000",
  "a=fmtp:96 level-id=93;profile-id=1;tier-flag=0;tx-mode=SRST",
  "a=rtpmap:96 AV1/90000",
  "a=fmtp:96 level-idx=5;profile=0;tier=0",
  "a=rtpmap:96 VP9/90000",
  "a=fmtp:96 profile-id=0",
  "a=fmtp:96 profile-id=2",
  "a=rtpmap:96 VP8/90000",
  "a=rtpmap:96 rtx/90000",
  "a=fmtp:96 apt=96",
  "a=rtpmap:96 H264/90000",
  "a=rtcp-fb:96 goog-remb",
  "a=rtcp-fb:96 transport-cc",
  "a=rtcp-fb:96 ccm fir",
  "a=rtcp-fb:96 nack",
  "a=rtcp-fb:96 nack pli",
  "a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f",
  "a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
  "a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f",
  "a=fmtp:96 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f",
];

const QUALITY_HINT_LINES = [
  `b=AS:${Math.round(MAX_VIDEO_BITRATE / 1000)}`,
  `b=TIAS:${MAX_VIDEO_BITRATE}`,
  `;x-google-start-bitrate=${Math.round(START_VIDEO_BITRATE / 1000)}`,
];

// Both devices deflate against this same boilerplate, so a description costs only the bytes that are unique to the call.
// Changing it changes the wire format: bump SIGNAL_PREFIX in streamSignal.ts alongside it.
export const SDP_DICTIONARY = strToU8(
  [
    ...SESSION_LINES,
    ...TRANSPORT_LINES,
    ...HEADER_EXTENSION_LINES,
    ...AUDIO_CODEC_LINES,
    ...STREAM_IDENTITY_LINES,
    ...VIDEO_CODEC_LINES,
    ...QUALITY_HINT_LINES,
  ].join("\n"),
);
