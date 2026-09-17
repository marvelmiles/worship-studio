import { useEffect, useState, useSyncExternalStore } from "react";
import { getFileBlob, thumbId } from "./fileStore";

interface UrlEntry {
  url: string | null;
  refs: number;
  loading: Promise<string | null> | null;
  releaseTimer: number | null;
}

// Object URLs are reference counted and released after a grace period, so a remount reuses one instead of reloading the blob.
const entries = new Map<string, UrlEntry>();
const RELEASE_GRACE_MS = 4000;

const entryFor = (id: string): UrlEntry => {
  let entry = entries.get(id);
  if (!entry) {
    entry = { url: null, refs: 0, loading: null, releaseTimer: null };
    entries.set(id, entry);
  }
  return entry;
};

export const acquireBlobUrl = (id: string): Promise<string | null> => {
  const entry = entryFor(id);
  entry.refs += 1;
  if (entry.releaseTimer !== null) {
    window.clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }
  if (entry.url) return Promise.resolve(entry.url);
  if (entry.loading) return entry.loading;
  entry.loading = getFileBlob(id)
    .then((blob) => {
      entry.loading = null;
      if (!blob) return null;
      if (entry.refs <= 0) return null;
      entry.url = URL.createObjectURL(blob);
      return entry.url;
    })
    .catch(() => {
      entry.loading = null;
      return null;
    });
  return entry.loading;
};

export const releaseBlobUrl = (id: string): void => {
  const entry = entries.get(id);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0) return;
  if (entry.releaseTimer !== null) window.clearTimeout(entry.releaseTimer);
  entry.releaseTimer = window.setTimeout(() => {
    if (entry.refs > 0) return;
    if (entry.url) URL.revokeObjectURL(entry.url);
    entries.delete(id);
  }, RELEASE_GRACE_MS);
};

/* Dropping a cached url is not enough on its own: mounted readers hold the
   revoked string in state, so they are woken through this epoch to re-acquire. */
let epoch = 0;
const epochListeners = new Set<() => void>();

const subscribeEpoch = (listener: () => void): (() => void) => {
  epochListeners.add(listener);
  return () => {
    epochListeners.delete(listener);
  };
};

const readEpoch = (): number => epoch;

const bumpEpoch = (): void => {
  epoch += 1;
  for (const listener of epochListeners) listener();
};

const dropEntry = (key: string): boolean => {
  const entry = entries.get(key);
  if (!entry) return false;
  if (entry.releaseTimer !== null) window.clearTimeout(entry.releaseTimer);
  if (entry.url) URL.revokeObjectURL(entry.url);
  entries.delete(key);
  return true;
};

export const invalidateBlobUrl = (id: string): void => {
  invalidateBlobUrls([id, thumbId(id)]);
};

export const invalidateBlobUrls = (ids: Iterable<string>): void => {
  let dropped = false;
  for (const id of ids) dropped = dropEntry(id) || dropped;
  if (dropped) bumpEpoch();
};

export const resetBlobUrls = (): void => {
  if (entries.size === 0) return;
  for (const key of [...entries.keys()]) dropEntry(key);
  bumpEpoch();
};

type Disposer = () => void;

const acquireManaged = (
  id: string,
  onUrl: (url: string | null) => void,
): Disposer => {
  let disposed = false;
  let settled = false;
  void acquireBlobUrl(id).then((url) => {
    settled = true;
    if (disposed) {
      releaseBlobUrl(id);
      return;
    }
    onUrl(url);
  });
  return () => {
    if (disposed) return;
    disposed = true;
    if (settled) releaseBlobUrl(id);
  };
};

export const useBlobUrl = (id: string | undefined | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  const currentEpoch = useSyncExternalStore(subscribeEpoch, readEpoch);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const dispose = acquireManaged(id, setUrl);
    return () => {
      setUrl(null);
      dispose();
    };
  }, [id, currentEpoch]);

  return url;
};

export const useThumbUrl = (id: string | undefined | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  const currentEpoch = useSyncExternalStore(subscribeEpoch, readEpoch);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let disposed = false;
    let disposeInner: Disposer = acquireManaged(thumbId(id), (thumb) => {
      if (thumb) {
        setUrl(thumb);
        return;
      }
      disposeInner();
      if (disposed) return;
      disposeInner = acquireManaged(id, setUrl);
    });
    return () => {
      disposed = true;
      setUrl(null);
      disposeInner();
    };
  }, [id, currentEpoch]);

  return url;
};
