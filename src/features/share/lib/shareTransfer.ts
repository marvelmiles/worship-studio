import {
  SHARE_BUFFER_HIGH_BYTES,
  SHARE_BUFFER_LOW_BYTES,
  SHARE_CHUNK_BYTES,
} from "./shareProtocol";

/* The link takes more than the network can carry, so the send waits whenever
   what is already queued grows past what it can push out. */
const whenDrained = (channel: RTCDataChannel): Promise<void> => {
  if (channel.bufferedAmount <= SHARE_BUFFER_HIGH_BYTES)
    return Promise.resolve();
  return new Promise((resolve) => {
    const onLow = () => {
      channel.removeEventListener("bufferedamountlow", onLow);
      resolve();
    };
    channel.addEventListener("bufferedamountlow", onLow);
  });
};

interface SendArchiveOptions {
  channel: RTCDataChannel;
  archive: Blob;
  onProgress: (sentBytes: number) => void;
  /** Stops the send between chunks, for a cancelled or broken transfer. */
  shouldStop: () => boolean;
}

/** Streams an archive down an open link, a chunk at a time. */
export const sendArchive = async ({
  channel,
  archive,
  onProgress,
  shouldStop,
}: SendArchiveOptions): Promise<boolean> => {
  channel.bufferedAmountLowThreshold = SHARE_BUFFER_LOW_BYTES;
  const reader = archive.stream().getReader();
  let sent = 0;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (let offset = 0; offset < value.length; offset += SHARE_CHUNK_BYTES) {
        if (shouldStop() || channel.readyState !== "open") return false;
        await whenDrained(channel);
        if (shouldStop() || channel.readyState !== "open") return false;
        const chunk = value.subarray(offset, offset + SHARE_CHUNK_BYTES);
        channel.send(chunk);
        sent += chunk.length;
        onProgress(sent);
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    void reader.cancel().catch(() => {});
  }
};

const FLUSH_POLL_MS = 50;
const FLUSH_TIMEOUT_MS = 1500;

/**
 * Waits for what has been handed to the link to actually leave it. Closing a
 * channel throws away whatever is still queued, so the last word of a
 * conversation has to be seen out before the link goes.
 */
export const whenFlushed = (channel: RTCDataChannel): Promise<void> =>
  new Promise((resolve) => {
    if (channel.readyState !== "open" || channel.bufferedAmount === 0) {
      resolve();
      return;
    }
    const stop = () => {
      window.clearInterval(poll);
      window.clearTimeout(timer);
      resolve();
    };
    const poll = window.setInterval(() => {
      if (channel.readyState !== "open" || channel.bufferedAmount === 0) stop();
    }, FLUSH_POLL_MS);
    const timer = window.setTimeout(stop, FLUSH_TIMEOUT_MS);
  });

/** Collects the chunks of an archive as they land. */
export const createArchiveCollector = () => {
  const parts: ArrayBuffer[] = [];
  let bytes = 0;
  return {
    get bytes() {
      return bytes;
    },
    take: (data: ArrayBuffer): number => {
      parts.push(data);
      bytes += data.byteLength;
      return bytes;
    },
    toFile: (name: string): File =>
      new File(parts as BlobPart[], name, { type: "application/zip" }),
    reset: () => {
      parts.length = 0;
      bytes = 0;
    },
  };
};

export type ArchiveCollector = ReturnType<typeof createArchiveCollector>;
