import type { Backend } from "./storage";

const MB = 1024 * 1024;

// The user's budget must be at least this large for the app to run smoothly
// (comfortably more than enough for manuscripts + a handful of assets).
export const MIN_VIABLE_BYTES = 4 * MB;
// Keep this much of the physical quota free as headroom.
export const SAFETY_BYTES = 2 * MB;
// App's default footprint reserved out of an IndexedDB quota (precache + seed).
export const APP_RESERVE_IDB = 8 * MB;

const WARN_RATIO = 0.7; // of the user's allocation (userMax)
const CRITICAL_RATIO = 0.9;

export interface StorageInfo {
  backend: Backend;
  quota: number;
  reserved: number;
  budget: number; // quota - reserved : what the user can fill
  userMax: number; // 90% of budget : the meter's full mark
  userUsed: number; // bytes the user has added
  pct: number; // userUsed / userMax (0..>1)
  level: "ok" | "warn" | "critical";
  blocked: boolean; // additive operations disabled
  viable: boolean; // budget big enough to run at all
  fromEstimate: boolean;
}

export function bytesOf(value: unknown): number {
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return 0;
  }
}

export function formatBytes(n: number): string {
  if (n <= 0) return "0 MB";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < MB) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * MB) return `${(n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`;
  return `${(n / (1024 * MB)).toFixed(2)} GB`;
}

export const getStorageLabel = (storage: StorageInfo) => {
  return `${formatBytes(storage.userUsed)} used • ~${formatBytes(Math.max(0, storage.userMax - storage.userUsed))} available`;
};

export function computeStorageInfo(
  estimate: { quota: number; usage: number; fromEstimate: boolean },
  userUsed: number,
  reserved: number,
  backend: Backend,
): StorageInfo {
  const budget = Math.max(1, estimate.quota - reserved);
  const userMax = budget * CRITICAL_RATIO;
  const pct = userMax > 0 ? userUsed / userMax : 1;
  const physicalTight =
    estimate.fromEstimate && estimate.quota - estimate.usage < SAFETY_BYTES;
  const blocked = pct >= 1 || physicalTight;
  const level: StorageInfo["level"] =
    blocked || pct >= CRITICAL_RATIO
      ? "critical"
      : pct >= WARN_RATIO
        ? "warn"
        : "ok";
  const viable =
    budget >= MIN_VIABLE_BYTES && !(physicalTight && userUsed < SAFETY_BYTES);
  return {
    backend,
    quota: estimate.quota,
    reserved,
    budget,
    userMax,
    userUsed,
    pct,
    level,
    blocked,
    viable,
    fromEstimate: estimate.fromEstimate,
  };
}
