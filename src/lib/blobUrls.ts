import { useEffect, useState } from "react";
import { getFileBlob, thumbId } from "./fileStore";

interface UrlEntry {
  url: string | null;
  refs: number;
  loading: Promise<string | null> | null;
  releaseTimer: number | null;
}

const entries = new Map<string, UrlEntry>();
const RELEASE_GRACE_MS = 4000;

function entryFor(id: string): UrlEntry {
  let entry = entries.get(id);
  if (!entry) {
    entry = { url: null, refs: 0, loading: null, releaseTimer: null };
    entries.set(id, entry);
  }
  return entry;
}

/**
 * Ref-counted object-URL cache over the "files" store. Components acquire a
 * URL while mounted and release it on unmount; the underlying object URL is
 * revoked shortly after the last consumer lets go, so blobs never stay
 * addressable (and therefore pinned) longer than needed. The grace period
 * keeps remounts (tab switches, list re-renders) from thrashing revoke/create.
 */
export function acquireBlobUrl(id: string): Promise<string | null> {
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
}

export function releaseBlobUrl(id: string): void {
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
}

/** Immediate revoke, call when the underlying file is deleted or replaced. */
export function invalidateBlobUrl(id: string): void {
  for (const key of [id, thumbId(id)]) {
    const entry = entries.get(key);
    if (!entry) continue;
    if (entry.releaseTimer !== null) window.clearTimeout(entry.releaseTimer);
    if (entry.url) URL.revokeObjectURL(entry.url);
    entries.delete(key);
  }
}

type Disposer = () => void;

/** Acquires exactly once and guarantees exactly one matching release. */
function acquireManaged(
  id: string,
  onUrl: (url: string | null) => void,
): Disposer {
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
}

/**
 * Resolves a stored blob to a temporary object URL for the component's
 * lifetime. Returns null while loading or when the id has no stored file.
 */
export function useBlobUrl(id: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

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
  }, [id]);

  return url;
}

/** Prefers the small thumbnail record, falling back to the full file. */
export function useThumbUrl(id: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

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
  }, [id]);

  return url;
}
