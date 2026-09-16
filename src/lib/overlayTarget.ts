export interface OverlayTarget {
  section: string;
  itemId: string | null;
}

export const overlayTarget = (
  section: string,
  itemId?: string | null,
): string => (itemId ? `${section}:${itemId}` : section);

export const parseOverlayTarget = (
  context: string | null,
): OverlayTarget | null => {
  if (!context) return null;
  const separator = context.indexOf(":");
  if (separator < 0) return { section: context, itemId: null };
  return {
    section: context.slice(0, separator),
    itemId: context.slice(separator + 1) || null,
  };
};
