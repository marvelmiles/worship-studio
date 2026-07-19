// Unified persistence layer. The app talks to ONE interface (readAllRecords/saveRecord/deleteRecord/
// clearStore) and never cares which backend is active. We prefer IndexedDB, fall
// back to sessionStorage when IndexedDB is unavailable, and fall back again to
// in-memory storage when neither works. Import/export and all CRUD behave
// identically regardless of the active backend.

export type StoreName =
  | "songs"
  | "scriptures"
  | "media"
  | "backgrounds"
  | "themes"
  | "audio"
  | "prefs"
  | "bible"
  | "files";
export type Backend = "indexeddb" | "session" | "memory";

interface HasId {
  id: string;
}

const DB_NAME = "worshipflow";
const DB_VERSION = 3;
const STORES: StoreName[] = [
  "songs",
  "scriptures",
  "media",
  "backgrounds",
  "themes",
  "audio",
  "prefs",
  "bible",
  "files",
];

// Binary payloads (Blobs) can't survive JSON serialization, so under the
// sessionStorage fallback the "files" store lives in memory only.
const SESSION_SKIP: ReadonlySet<StoreName> = new Set(["files"]);
const SESSION_PREFIX = "ws:";
const MB = 1024 * 1024;

export const storageState: { backend: Backend | null; memFallback: boolean } = {
  backend: null,
  memFallback: false,
};

// Working copy held in memory for every backend; it is the source of truth for
// the session/memory backends and a write-through cache for IndexedDB.
const mem: Record<StoreName, Map<string, unknown>> = {
  songs: new Map(),
  scriptures: new Map(),
  media: new Map(),
  backgrounds: new Map(),
  themes: new Map(),
  audio: new Map(),
  prefs: new Map(),
  bible: new Map(),
  files: new Map(),
};

let idb: IDBDatabase | null = null;
let initPromise: Promise<Backend> | null = null;

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function sessionAvailable(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const k = "__ws_probe__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function loadSessionIntoMem() {
  for (const store of STORES) {
    if (SESSION_SKIP.has(store)) continue;
    try {
      const raw = sessionStorage.getItem(SESSION_PREFIX + store);
      if (!raw) continue;
      const rows = JSON.parse(raw) as HasId[];
      mem[store].clear();
      for (const row of rows) mem[store].set(row.id, row);
    } catch {
      /* ignore corrupt entry */
    }
  }
}

function persistSession(store: StoreName) {
  if (SESSION_SKIP.has(store)) return;
  try {
    sessionStorage.setItem(SESSION_PREFIX + store, JSON.stringify(Array.from(mem[store].values())));
  } catch {
    /* quota errors are prevented proactively by the storage guard */
  }
}

function init(): Promise<Backend> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await openIDB();
    if (db) {
      idb = db;
      storageState.backend = "indexeddb";
      storageState.memFallback = false;
      // Ask the browser to exempt this origin from best-effort eviction so a
      // large media library isn't silently wiped under disk pressure.
      try {
        void navigator.storage?.persist?.();
      } catch {
        /* optional, denial or absence changes nothing */
      }
      return "indexeddb";
    }
    if (sessionAvailable()) {
      storageState.backend = "session";
      storageState.memFallback = false;
      loadSessionIntoMem();
      return "session";
    }
    storageState.backend = "memory";
    storageState.memFallback = true;
    return "memory";
  })();
  return initPromise;
}

export async function getBackend(): Promise<Backend> {
  return init();
}

export async function readAllRecords<T extends HasId>(store: StoreName): Promise<T[]> {
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb!.transaction(store, "readonly");
        const r = tx.objectStore(store).getAll();
        r.onsuccess = () => resolve((r.result || []) as T[]);
        r.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
  return Array.from(mem[store].values()) as T[];
}

export async function readRecord<T extends HasId>(store: StoreName, id: string): Promise<T | undefined> {
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb!.transaction(store, "readonly");
        const r = tx.objectStore(store).get(id);
        r.onsuccess = () => resolve((r.result as T) || undefined);
        r.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }
  return mem[store].get(id) as T | undefined;
}

export async function saveRecord<T extends HasId>(store: StoreName, val: T): Promise<void> {
  try {
    await saveRecordStrict(store, val);
  } catch {
    /* best-effort writes swallow failures; use saveRecordStrict when they matter */
  }
}

/**
 * Like `saveRecord` but rejects on failure (notably QuotaExceededError) so upload
 * pipelines can surface the problem instead of silently losing data. Under
 * IndexedDB the value is NOT kept in the in-memory map, critical for Blobs,
 * which would otherwise pin the whole file in RAM for the session.
 */
export async function saveRecordStrict<T extends HasId>(store: StoreName, val: T): Promise<void> {
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve, reject) => {
      try {
        const tx = idb!.transaction(store, "readwrite");
        tx.objectStore(store).put(val);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
        tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
      } catch (err) {
        reject(err);
      }
    });
  }
  mem[store].set(val.id, val);
  if (backend === "session") persistSession(store);
}

export async function deleteRecord(store: StoreName, id: string): Promise<void> {
  const backend = await init();
  mem[store].delete(id);
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb!.transaction(store, "readwrite");
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  if (backend === "session") persistSession(store);
}

export async function clearStore(store: StoreName): Promise<void> {
  mem[store].clear();
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb!.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  if (backend === "session") {
    try {
      sessionStorage.removeItem(SESSION_PREFIX + store);
    } catch {
      /* ignore */
    }
  }
}

// Wipe everything across the active backend (used by "free up storage" / reset).
export async function wipeAllStores(): Promise<void> {
  for (const store of STORES) await clearStore(store);
}

function sessionUsageBytes(): number {
  let bytes = 0;
  try {
    for (const store of STORES) {
      const v = sessionStorage.getItem(SESSION_PREFIX + store);
      if (v) bytes += (v.length + (SESSION_PREFIX + store).length) * 2;
    }
  } catch {
    /* ignore */
  }
  return bytes;
}

function memUsageBytes(): number {
  let bytes = 0;
  for (const store of STORES) {
    try {
      bytes += JSON.stringify(Array.from(mem[store].values())).length * 2;
    } catch {
      /* ignore */
    }
  }
  return bytes;
}

export interface QuotaEstimate {
  quota: number;
  usage: number;
  fromEstimate: boolean;
}

// Best-effort total allowed vs total used for the active backend.
export async function estimateQuota(): Promise<QuotaEstimate> {
  const backend = await init();
  if (backend === "indexeddb") {
    try {
      if (navigator.storage && typeof navigator.storage.estimate === "function") {
        const e = await navigator.storage.estimate();
        // Note: this quota is dynamic, browsers may grow it as the origin
        // stores more data. The meter shows usage as a percentage of it, so
        // levels reflect how close we are to the CURRENT grant, not a fixed max.
        if (e.quota) return { quota: e.quota, usage: e.usage || 0, fromEstimate: true };
      }
    } catch {
      /* fall through to nominal */
    }
    return { quota: 250 * MB, usage: 0, fromEstimate: false };
  }
  if (backend === "session") {
    return { quota: 5 * MB, usage: sessionUsageBytes(), fromEstimate: false };
  }
  return { quota: 100 * MB, usage: memUsageBytes(), fromEstimate: false };
}
