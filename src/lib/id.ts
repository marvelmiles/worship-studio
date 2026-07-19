export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const now = (): string => new Date().toISOString();

export const formatDate = (d: string): string => {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const fmtClock = (s: number): string => {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};
