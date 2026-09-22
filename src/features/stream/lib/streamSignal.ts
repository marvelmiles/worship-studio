import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { compactSdp } from "./sdp";
import { SDP_DICTIONARY } from "./sdpDictionary";

export type SignalKind = "offer" | "answer" | "share-offer" | "share-answer";

const PREFIX = "WS3";
const KIND_CODE: Record<SignalKind, string> = {
  offer: "O",
  answer: "A",
  "share-offer": "S",
  "share-answer": "R",
};
const KIND_BY_CODE = new Map<string, SignalKind>(
  Object.entries(KIND_CODE).map(([kind, code]) => [code, kind as SignalKind]),
);
const SDP_FIRST_LINE = "v=0";

// Base45 keeps the payload inside QR alphanumeric mode, which is far less dense than byte mode.
const B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const toBase45 = (bytes: Uint8Array): string => {
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
};

const fromBase45 = (text: string): Uint8Array | null => {
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
      return null;
    }
  }
  return Uint8Array.from(out);
};

export const encodeSignal = (kind: SignalKind, sdp: string): string => {
  const packed = deflateSync(strToU8(KIND_CODE[kind] + compactSdp(sdp)), {
    level: 9,
    dictionary: SDP_DICTIONARY,
  });
  return `${PREFIX}${toBase45(packed)}`;
};

export const decodeSignal = (
  text: string,
): { kind: SignalKind; sdp: string } | null => {
  const trimmed = text.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const bytes = fromBase45(trimmed.slice(PREFIX.length));
  if (!bytes) return null;
  try {
    const raw = strFromU8(inflateSync(bytes, { dictionary: SDP_DICTIONARY }));
    const kind = KIND_BY_CODE.get(raw[0]);
    const body = raw.slice(1);
    if (!kind || !body.startsWith(SDP_FIRST_LINE)) return null;
    return { kind, sdp: body.replace(/\n/g, "\r\n") + "\r\n" };
  } catch {
    return null;
  }
};
