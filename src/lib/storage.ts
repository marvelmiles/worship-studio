// One persistence API over three backends: IndexedDB, then sessionStorage, then memory.
export type StoreName =
  | "manuscripts"
  | "scriptures"
  | "media"
  | "backgrounds"
  | "themes"
  | "audio"
  | "prefs"
  | "files";
export type Backend = "indexeddb" | "session" | "memory";

interface HasId {
  id: string;
}

const DB_NAME = "worshipflow";
const DB_VERSION = 4;
const STORES: StoreName[] = [
  "manuscripts",
  "scriptures",
  "media",
  "backgrounds",
  "themes",
  "audio",
  "prefs",
  "files",
];

const SESSION_SKIP: ReadonlySet<StoreName> = new Set(["files"]);
const SESSION_PREFIX = "ws:";
const MB = 1024 * 1024;

export const storageState: { backend: Backend | null; memFallback: boolean } = {
  backend: null,
  memFallback: false,
};

const mem: Record<StoreName, Map<string, unknown>> = {
  manuscripts: new Map(),
  scriptures: new Map(),
  media: new Map(),
  backgrounds: new Map(),
  themes: new Map(),
  audio: new Map(),
  prefs: new Map(),
  files: new Map(),
};

let idb: IDBDatabase | null = null;
let initPromise: Promise<Backend> | null = null;

const openIDB = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s))
            db.createObjectStore(s, { keyPath: "id" });
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const sessionAvailable = (): boolean => {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const k = "__ws_probe__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};

const loadSessionIntoMem = () => {
  for (const store of STORES) {
    if (SESSION_SKIP.has(store)) continue;
    try {
      const raw = sessionStorage.getItem(SESSION_PREFIX + store);
      if (!raw) continue;
      const rows = JSON.parse(raw) as HasId[];
      mem[store].clear();
      for (const row of rows) mem[store].set(row.id, row);
    } catch {}
  }
};

const persistSession = (store: StoreName) => {
  if (SESSION_SKIP.has(store)) return;
  try {
    sessionStorage.setItem(
      SESSION_PREFIX + store,
      JSON.stringify(Array.from(mem[store].values())),
    );
  } catch {}
};

const init = (): Promise<Backend> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await openIDB();
    if (db) {
      idb = db;
      storageState.backend = "indexeddb";
      storageState.memFallback = false;
      try {
        void navigator.storage?.persist?.();
      } catch {}
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
};

export const readAllRecords = async <T extends HasId>(
  store: StoreName,
): Promise<T[]> => {
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
};

export const readRecord = async <T extends HasId>(
  store: StoreName,
  id: string,
): Promise<T | undefined> => {
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
};

export const saveRecord = async <T extends HasId>(
  store: StoreName,
  val: T,
): Promise<void> => {
  try {
    await saveRecordStrict(store, val);
  } catch {}
};

export const saveRecordStrict = async <T extends HasId>(
  store: StoreName,
  val: T,
): Promise<void> => {
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve, reject) => {
      try {
        const tx = idb!.transaction(store, "readwrite");
        tx.objectStore(store).put(val);
        tx.oncomplete = () => resolve();
        tx.onerror = () =>
          reject(tx.error || new Error("IndexedDB write failed"));
        tx.onabort = () =>
          reject(tx.error || new Error("IndexedDB transaction aborted"));
      } catch (err) {
        reject(err);
      }
    });
  }
  mem[store].set(val.id, val);
  if (backend === "session") persistSession(store);
};

export const saveRecords = async <T extends HasId>(
  store: StoreName,
  values: T[],
): Promise<void> => {
  if (!values.length) return;
  const backend = await init();
  if (backend === "indexeddb" && idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb!.transaction(store, "readwrite");
        const target = tx.objectStore(store);
        for (const value of values) target.put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  for (const value of values) mem[store].set(value.id, value);
  if (backend === "session") persistSession(store);
};

export const deleteRecord = async (
  store: StoreName,
  id: string,
): Promise<void> => {
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
};

export const clearStore = async (store: StoreName): Promise<void> => {
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
    } catch {}
  }
};

export const wipeAllStores = async (): Promise<void> => {
  for (const store of STORES) await clearStore(store);
};

const sessionUsageBytes = (): number => {
  let bytes = 0;
  try {
    for (const store of STORES) {
      const v = sessionStorage.getItem(SESSION_PREFIX + store);
      if (v) bytes += (v.length + (SESSION_PREFIX + store).length) * 2;
    }
  } catch {}
  return bytes;
};

const memUsageBytes = (): number => {
  let bytes = 0;
  for (const store of STORES) {
    try {
      bytes += JSON.stringify(Array.from(mem[store].values())).length * 2;
    } catch {}
  }
  return bytes;
};

export interface QuotaEstimate {
  quota: number;
  usage: number;
  fromEstimate: boolean;
}

export const estimateQuota = async (): Promise<QuotaEstimate> => {
  const backend = await init();
  if (backend === "indexeddb") {
    try {
      if (
        navigator.storage &&
        typeof navigator.storage.estimate === "function"
      ) {
        const e = await navigator.storage.estimate();
        if (e.quota)
          return { quota: e.quota, usage: e.usage || 0, fromEstimate: true };
      }
    } catch {}
    return { quota: 250 * MB, usage: 0, fromEstimate: false };
  }
  if (backend === "session") {
    return { quota: 5 * MB, usage: sessionUsageBytes(), fromEstimate: false };
  }
  return { quota: 100 * MB, usage: memUsageBytes(), fromEstimate: false };
};
