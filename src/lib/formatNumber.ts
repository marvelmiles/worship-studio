/**
 * Stat numbers everywhere in the app read the same way: exact while they are
 * small enough to take in at a glance, and shortened once they are not.
 */

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const COMPACT_FROM = 1000;

export const formatCount = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const whole = Math.trunc(value);
  return Math.abs(whole) < COMPACT_FROM
    ? String(whole)
    : COMPACT.format(whole).toLowerCase();
};

export const formatCountLabel = (
  value: number,
  singular: string,
  plural = `${singular}s`,
): string => `${formatCount(value)} ${value === 1 ? singular : plural}`;
