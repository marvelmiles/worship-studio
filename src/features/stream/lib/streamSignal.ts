import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";

/**
 * Packs a WebRTC session description small enough to travel inside a QR code.
 *
 * An SDP with its ICE candidates is 1.5–3 KB of highly repetitive text, which
 * overflows a scannable QR outright. Deflate takes roughly 70% off, and the
 * peer only ever gathers host (LAN) candidates, so there are no bulky
 * server-reflexive or relay lines to carry in the first place.
 */

export type SignalKind = "offer" | "answer";

/** Version prefix so a future format change can be detected, not misread. */
const PREFIX = "WS1";
const KIND_CODE: Record<SignalKind, string> = { offer: "O", answer: "A" };

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Drops lines that cost bytes without affecting a one-way LAN video link.
 * Deliberately conservative: codec and crypto lines are never touched, since
 * a stripped SDP that fails to negotiate is far worse than a larger QR.
 */
function shrinkSdp(sdp: string): string {
  return sdp
    .split(/\r\n|\n/)
    .filter((line) => line.trim() !== "")
    .join("\n");
}

export function encodeSignal(kind: SignalKind, sdp: string): string {
  const packed = deflateSync(strToU8(KIND_CODE[kind] + shrinkSdp(sdp)), { level: 9 });
  return `${PREFIX}${toBase64Url(packed)}`;
}

export function decodeSignal(text: string): { kind: SignalKind; sdp: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const bytes = fromBase64Url(trimmed.slice(PREFIX.length));
  if (!bytes) return null;
  try {
    const raw = strFromU8(inflateSync(bytes));
    const kind = raw[0] === "O" ? "offer" : raw[0] === "A" ? "answer" : null;
    if (!kind) return null;
    // SDP must use CRLF line endings; the shrink step normalised them away.
    const sdp = raw.slice(1).replace(/\n/g, "\r\n") + "\r\n";
    return { kind, sdp };
  } catch {
    return null;
  }
}

/**
 * Roughly the largest byte-mode payload a QR can hold at error-correction
 * level L (version 40). Used to warn before rendering an unscannable code.
 */
export const QR_BYTE_CAPACITY = 2953;
