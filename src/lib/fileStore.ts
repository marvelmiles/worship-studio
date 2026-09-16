import { deleteRecord, readRecord, saveRecordStrict } from "./storage";

interface FileRecord {
  id: string;
  blob: Blob;
}

export const thumbId = (id: string): string => `${id}:thumb`;

const inFlight = new Map<string, Promise<Blob | null>>();

export const getFileBlob = (id: string): Promise<Blob | null> => {
  const pending = inFlight.get(id);
  if (pending) return pending;
  const request = readRecord<FileRecord>("files", id)
    .then((record) => record?.blob ?? null)
    .catch(() => null)
    .finally(() => inFlight.delete(id));
  inFlight.set(id, request);
  return request;
};

export const putFileBlob = (id: string, blob: Blob): Promise<void> => {
  return saveRecordStrict<FileRecord>("files", { id, blob });
};

export const deleteFileBlob = async (id: string): Promise<void> => {
  await deleteRecord("files", id);
};

export const deleteFileWithThumb = async (id: string): Promise<void> => {
  await Promise.all([
    deleteRecord("files", id),
    deleteRecord("files", thumbId(id)),
  ]);
};

export const isQuotaError = (err: unknown): boolean => {
  return err instanceof DOMException && err.name === "QuotaExceededError";
};
