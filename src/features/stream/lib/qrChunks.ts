const CHUNK_PREFIX = "WSC";
const TAG_LENGTH = 4;
const COUNTER_DIGITS = 2;
const HEADER_LENGTH = CHUNK_PREFIX.length + TAG_LENGTH + COUNTER_DIGITS * 2;
const TAG_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_CHUNKS = 99;

export const QR_CHUNK_PAYLOAD_LENGTH = 300;

export type ChunkReadResult =
  | { status: "complete"; value: string }
  | { status: "partial"; received: number; total: number };

const createTag = (): string =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(TAG_LENGTH)),
    (byte) => TAG_ALPHABET[byte % TAG_ALPHABET.length],
  ).join("");

const padCounter = (value: number): string =>
  String(value).padStart(COUNTER_DIGITS, "0");

// A long code is cycled as several small QR frames, which a laptop webcam reads far more reliably than one dense code.
export const splitIntoQrChunks = (
  value: string,
  payloadLength = QR_CHUNK_PAYLOAD_LENGTH,
): string[] => {
  if (value.length <= payloadLength) return [value];
  const total = Math.ceil(value.length / payloadLength);
  if (total > MAX_CHUNKS) return [value];
  const tag = createTag();
  return Array.from({ length: total }, (_, index) => {
    const payload = value.slice(
      index * payloadLength,
      (index + 1) * payloadLength,
    );
    return `${CHUNK_PREFIX}${tag}${padCounter(index)}${padCounter(total)}${payload}`;
  });
};

interface ParsedChunk {
  tag: string;
  index: number;
  total: number;
  payload: string;
}

const parseChunk = (text: string): ParsedChunk | null => {
  if (!text.startsWith(CHUNK_PREFIX) || text.length <= HEADER_LENGTH) {
    return null;
  }
  const tagEnd = CHUNK_PREFIX.length + TAG_LENGTH;
  const index = Number(text.slice(tagEnd, tagEnd + COUNTER_DIGITS));
  const total = Number(
    text.slice(tagEnd + COUNTER_DIGITS, tagEnd + COUNTER_DIGITS * 2),
  );
  if (!Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (total < 1 || index < 0 || index >= total) return null;
  return {
    tag: text.slice(CHUNK_PREFIX.length, tagEnd),
    index,
    total,
    payload: text.slice(HEADER_LENGTH),
  };
};

export const createQrChunkCollector = () => {
  let tag = "";
  let parts: (string | undefined)[] = [];

  const read = (text: string): ChunkReadResult => {
    const chunk = parseChunk(text);
    if (!chunk) return { status: "complete", value: text };

    if (chunk.tag !== tag || parts.length !== chunk.total) {
      tag = chunk.tag;
      parts = new Array<string | undefined>(chunk.total);
    }
    parts[chunk.index] = chunk.payload;

    const received = parts.filter((part) => part !== undefined).length;
    if (received < chunk.total) {
      return { status: "partial", received, total: chunk.total };
    }
    return { status: "complete", value: parts.join("") };
  };

  return { read };
};
