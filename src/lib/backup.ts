import {
  strFromU8,
  strToU8,
  Unzip,
  UnzipInflate,
  Zip,
  ZipDeflate,
  ZipPassThrough,
} from "fflate";
import { getFileBlob, putFileBlob } from "./fileStore";
import { APP_NAME } from "./appInfo";

const DATA_ENTRY = "data.json";
const FILES_PREFIX = "files/";

interface SaveFilePicker {
  (options: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }): Promise<{ createWritable: () => Promise<WritableSink> }>;
}

interface WritableSink {
  write: (chunk: Uint8Array | Blob) => Promise<void>;
  close: () => Promise<void>;
}

const getSavePicker = (): SaveFilePicker | undefined =>
  (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;

export const entryNameFor = (fileId: string): string =>
  `${FILES_PREFIX}${encodeURIComponent(fileId)}`;

const fileIdFromEntry = (name: string): string | null =>
  name.startsWith(FILES_PREFIX)
    ? decodeURIComponent(name.slice(FILES_PREFIX.length))
    : null;

export const isZipFile = async (file: File): Promise<boolean> => {
  if (file.size < 4) return false;
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
};

export interface ExportResult {
  ok: boolean;
  cancelled?: boolean;
}

export const exportBackup = async (
  payload: unknown,
  fileIds: string[],
  onProgress?: (fraction: number) => void,
): Promise<ExportResult> => {
  const suggestedName = `worshipstudio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  const picker = getSavePicker();
  let sink: WritableSink | null = null;
  const fallbackChunks: Uint8Array[] = [];

  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [
          {
            description: `${APP_NAME} backup`,
            accept: { "application/zip": [".zip"] },
          },
        ],
      });
      sink = await handle.createWritable();
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError")
        return { ok: false, cancelled: true };
      sink = null;
    }
  }

  let writeQueue: Promise<void> = Promise.resolve();
  let zipError: Error | null = null;
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      zipError = err;
      return;
    }
    if (sink) {
      writeQueue = writeQueue.then(() => sink!.write(chunk));
    } else {
      fallbackChunks.push(chunk);
    }
    void final;
  });

  const meta = new ZipDeflate(DATA_ENTRY, { level: 6 });
  zip.add(meta);
  meta.push(strToU8(JSON.stringify(payload)), true);

  let done = 0;
  for (const fileId of fileIds) {
    const blob = await getFileBlob(fileId);
    done += 1;
    if (!blob) continue;
    const entry = new ZipPassThrough(entryNameFor(fileId));
    zip.add(entry);
    const reader = blob.stream().getReader();
    for (;;) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      entry.push(value);
      await writeQueue;
      if (zipError) break;
    }
    entry.push(new Uint8Array(0), true);
    if (zipError) break;
    onProgress?.(done / Math.max(1, fileIds.length));
  }

  zip.end();
  await writeQueue;
  if (zipError) {
    if (sink) await sink.close().catch(() => {});
    return { ok: false };
  }

  if (sink) {
    await sink.close();
  } else {
    const blob = new Blob(fallbackChunks as BlobPart[], {
      type: "application/zip",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  onProgress?.(1);
  return { ok: true };
};

const concat = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

export const readBackupPayload = (file: File): Promise<unknown | null> => {
  return new Promise((resolve) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    let settled = false;
    const finish = (value: unknown | null) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    unzip.onfile = (entry) => {
      if (entry.name !== DATA_ENTRY) return;
      const chunks: Uint8Array[] = [];
      entry.ondata = (err, chunk, final) => {
        if (err) return finish(null);
        chunks.push(chunk);
        if (final) {
          try {
            finish(JSON.parse(strFromU8(concat(chunks))));
          } catch {
            finish(null);
          }
        }
      };
      entry.start();
    };
    void (async () => {
      const reader = file.stream().getReader();
      try {
        for (;;) {
          if (settled) break;
          const { value, done } = await reader.read();
          if (done) {
            unzip.push(new Uint8Array(0), true);
            break;
          }
          unzip.push(value, false);
        }
      } catch {}
      finish(null);
      void reader.cancel().catch(() => {});
    })();
  });
};

export const importBackupFiles = (
  file: File,
  acceptId: (id: string) => boolean,
  onProgress?: (bytesRead: number, totalBytes: number) => void,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const unzip = new Unzip();
    unzip.register(UnzipInflate);
    let putQueue: Promise<void> = Promise.resolve();
    let failed: Error | null = null;

    unzip.onfile = (entry) => {
      const fileId = fileIdFromEntry(entry.name);
      if (!fileId || !acceptId(fileId)) return;
      const chunks: Uint8Array[] = [];
      entry.ondata = (err, chunk, final) => {
        if (err) {
          failed = failed || err;
          return;
        }
        chunks.push(chunk);
        if (final) {
          const blob = new Blob(chunks as BlobPart[]);
          chunks.length = 0;
          putQueue = putQueue.then(() =>
            putFileBlob(fileId, blob).catch((putErr: Error) => {
              failed = failed || putErr;
            }),
          );
        }
      };
      entry.start();
    };

    void (async () => {
      const reader = file.stream().getReader();
      let bytesRead = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            unzip.push(new Uint8Array(0), true);
            break;
          }
          bytesRead += value.length;
          unzip.push(value, false);
          await putQueue;
          onProgress?.(bytesRead, file.size);
          if (failed) break;
        }
        await putQueue;
        if (failed) reject(failed);
        else resolve();
      } catch (err) {
        reject(err as Error);
      }
    })();
  });
};
