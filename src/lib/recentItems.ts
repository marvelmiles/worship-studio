interface RecentOptions<T> {
  /** How many to keep, or nothing to keep them all. */
  limit?: number;
  createdAt: (item: T) => string | undefined;
  /** Items that stay on the list however old they are, such as the one in use. */
  keep?: (item: T) => boolean;
}

/**
 * The most recently added items first. Anything without a date, such as what
 * ships with the app, sorts last, and a capped list still carries whatever is
 * in use so a picker never hides its own selection.
 */
export const mostRecent = <T>(
  items: T[],
  { limit, createdAt, keep }: RecentOptions<T>,
): T[] => {
  const ordered = [...items].sort((a, b) =>
    (createdAt(b) ?? "").localeCompare(createdAt(a) ?? ""),
  );
  if (limit === undefined || ordered.length <= limit) return ordered;

  const kept = keep ? ordered.filter(keep) : [];
  const room = Math.max(0, limit - kept.length);
  const shown = new Set([
    ...kept,
    ...ordered.filter((item) => !kept.includes(item)).slice(0, room),
  ]);
  return ordered.filter((item) => shown.has(item));
};
