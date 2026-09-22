import { describe, expect, it } from "vitest";
import { decodeSignal, encodeSignal } from "../../stream/lib/streamSignal";
import { readPairingCode } from "./sharePairing";

const DATA_CHANNEL_SDP = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:1 1 udp 2113937151 192.168.1.20 50000 typ host generation 0 network-cost 999",
  "a=ice-ufrag:abcd",
  "a=ice-pwd:abcdefghijklmnopqrstuvwx",
  "a=fingerprint:sha-256 AA:BB:CC:DD",
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  "",
].join("\r\n");

describe("readPairingCode", () => {
  it("reads back an invite and a reply", () => {
    const invite = encodeSignal("share-offer", DATA_CHANNEL_SDP);
    const reply = encodeSignal("share-answer", DATA_CHANNEL_SDP);
    expect(readPairingCode(invite, "invite")).toBe(DATA_CHANNEL_SDP);
    expect(readPairingCode(reply, "reply")).toBe(DATA_CHANNEL_SDP);
  });

  it("refuses a code meant for the other step", () => {
    const invite = encodeSignal("share-offer", DATA_CHANNEL_SDP);
    expect(readPairingCode(invite, "reply")).toBeNull();
  });

  it("refuses a camera pairing code, and keeps camera codes apart", () => {
    const cameraInvite = encodeSignal("offer", DATA_CHANNEL_SDP);
    expect(readPairingCode(cameraInvite, "invite")).toBeNull();
    const shareInvite = encodeSignal("share-offer", DATA_CHANNEL_SDP);
    expect(decodeSignal(shareInvite)?.kind).toBe("share-offer");
    expect(decodeSignal(cameraInvite)?.kind).toBe("offer");
  });

  it("refuses text that is not a code", () => {
    expect(readPairingCode("hello", "invite")).toBeNull();
    expect(readPairingCode("WS3!!!", "reply")).toBeNull();
  });
});
