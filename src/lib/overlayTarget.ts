/**
 * A deep link into an overlay: which section it opens on, and the item inside
 * that section the user asked for. Written as `section:itemId` so one string
 * carries both through the store's overlay context.
 */
export interface OverlayTarget {
  section: string;
  itemId: string | null;
}

export const overlayTarget = (
  section: string,
  itemId?: string | null,
): string => (itemId ? `${section}:${itemId}` : section);

export function parseOverlayTarget(
  context: string | null,
): OverlayTarget | null {
  if (!context) return null;
  const separator = context.indexOf(":");
  if (separator < 0) return { section: context, itemId: null };
  return {
    section: context.slice(0, separator),
    itemId: context.slice(separator + 1) || null,
  };
}
