import { deleteRecord, readRecord, saveRecordStrict } from "./storage";

interface FileRecord {
  id: string;
  blob: Blob;
}

export const thumbId = (id: string): string => `${id}:thumb`;

const inFlight = new Map<string, Promise<Blob | null>>();

/**
 * Binary payload repository. Blobs are stored one record per file in the
 * dedicated "files" store and are only ever fetched individually, on demand,
 * never with getAll, so opening the app doesn't pull media into memory.
 * Concurrent reads of the same id share one request.
 */
export function getFileBlob(id: string): Promise<Blob | null> {
  const pending = inFlight.get(id);
  if (pending) return pending;
  const request = readRecord<FileRecord>("files", id)
    .then((record) => record?.blob ?? null)
    .catch(() => null)
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
}

/** Rejects on failure (e.g. QuotaExceededError) so callers can react. */
export function putFileBlob(id: string, blob: Blob): Promise<void> {
  return saveRecordStrict<FileRecord>("files", { id, blob });
}

export async function deleteFileBlob(id: string): Promise<void> {
  await deleteRecord("files", id);
}

export async function deleteFileWithThumb(id: string): Promise<void> {
  await Promise.all([deleteRecord("files", id), deleteRecord("files", thumbId(id))]);
}

export function isQuotaError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "QuotaExceededError";
}
