const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

const scrollParentOf = (element: HTMLElement): HTMLElement | null => {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      SCROLLABLE_OVERFLOW.test(overflowY) &&
      node.scrollHeight > node.clientHeight
    )
      return node;
    node = node.parentElement;
  }
  return null;
};

export const revealInScrollParent = (element: HTMLElement): void => {
  const container = scrollParentOf(element);
  if (!container) return;
  const inset = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const bounds = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const visibleTop = bounds.top + inset;
  if (rect.top >= visibleTop && rect.bottom <= bounds.bottom) return;

  const visibleHeight = bounds.height - inset;
  const offsetInContainer = rect.top - bounds.top + container.scrollTop;
  const centred =
    offsetInContainer - inset - Math.max(0, (visibleHeight - rect.height) / 2);
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  container.scrollTo({
    top: Math.max(0, centred),
    behavior: reduceMotion ? "auto" : "smooth",
  });
};
