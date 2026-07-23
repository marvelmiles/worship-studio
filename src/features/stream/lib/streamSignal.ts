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

/**
 * Version prefix so a future format change can be detected, not misread. Bumped
 * to WS2 with the move from base64 (QR byte mode) to Base45 (QR alphanumeric
 * mode) — every character below is in the QR alphanumeric charset, which the
 * renderer exploits to pack the same payload into a lower-density, easier-to-
 * scan code.
 */
const PREFIX = "WS2";
const KIND_CODE: Record<SignalKind, string> = { offer: "O", answer: "A" };

/**
 * Base45 (RFC 9285): binary encoded using only the 45 characters QR can carry
 * in alphanumeric mode. That mode spends ~5.5 bits per character versus the 8
 * of byte mode, so a Base45 QR is markedly less dense than the base64 one it
 * replaces — the difference between a webcam decoding it and not.
 */
const B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function toBase45(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let n = bytes[i] * 256 + bytes[i + 1];
      const c = n % 45;
      n = (n - c) / 45;
      const d = n % 45;
      const e = (n - d) / 45;
      out += B45[c] + B45[d] + B45[e];
    } else {
      const n = bytes[i];
      out += B45[n % 45] + B45[(n - (n % 45)) / 45];
    }
  }
  return out;
}

function fromBase45(text: string): Uint8Array | null {
  const vals: number[] = [];
  for (const ch of text) {
    const v = B45.indexOf(ch);
    if (v < 0) return null;
    vals.push(v);
  }
  const out: number[] = [];
  for (let i = 0; i < vals.length; i += 3) {
    if (i + 2 < vals.length) {
      const n = vals[i] + vals[i + 1] * 45 + vals[i + 2] * 45 * 45;
      if (n > 0xffff) return null;
      out.push((n / 256) | 0, n % 256);
    } else if (i + 1 < vals.length) {
      const n = vals[i] + vals[i + 1] * 45;
      if (n > 0xff) return null;
      out.push(n);
    } else {
      return null; // A trailing lone character is not valid Base45.
    }
  }
  return Uint8Array.from(out);
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
  const packed = deflateSync(strToU8(KIND_CODE[kind] + shrinkSdp(sdp)), {
    level: 9,
  });
  return `${PREFIX}${toBase45(packed)}`;
}

export function decodeSignal(
  text: string,
): { kind: SignalKind; sdp: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const bytes = fromBase45(trimmed.slice(PREFIX.length));
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
