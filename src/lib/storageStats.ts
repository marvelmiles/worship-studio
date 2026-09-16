import type { Backend } from "./storage";

const MB = 1024 * 1024;

export const MIN_VIABLE_BYTES = 4 * MB;
export const SAFETY_BYTES = 2 * MB;
export const APP_RESERVE_IDB = 8 * MB;

const WARN_RATIO = 0.7;
const CRITICAL_RATIO = 0.9;

export interface StorageInfo {
  backend: Backend;
  quota: number;
  reserved: number;
  budget: number;
  userMax: number;
  userUsed: number;
  pct: number;
  level: "ok" | "warn" | "critical";
  blocked: boolean;
  viable: boolean;
  fromEstimate: boolean;
}

export const bytesOf = (value: unknown): number => {
  try {
    return JSON.stringify(value).length * 2;
  } catch {
    return 0;
  }
};

export const formatBytes = (n: number): string => {
  if (n <= 0) return "0 MB";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < MB) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * MB) return `${(n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`;
  return `${(n / (1024 * MB)).toFixed(2)} GB`;
};

export const getStorageLabel = (storage: StorageInfo) => {
  return `${formatBytes(storage.userUsed)} used • ~${formatBytes(Math.max(0, storage.userMax - storage.userUsed))} available`;
};

export const computeStorageInfo = (
  estimate: { quota: number; usage: number; fromEstimate: boolean },
  userUsed: number,
  reserved: number,
  backend: Backend,
): StorageInfo => {
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
};
