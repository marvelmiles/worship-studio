const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

function scrollParentOf(element: HTMLElement): HTMLElement | null {
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
}

/**
 * Scrolls the nearest scrolling ancestor, and only that one, until `element`
 * sits fully inside it, centring it when it has to move. The element's
 * `scroll-margin-top` is kept clear, so a sticky header over the list never
 * covers the row being revealed.
 *
 * `scrollIntoView` is not used because it scrolls every ancestor up to the
 * page, which drags the whole editor layout along with a panel that moved.
 */
export function revealInScrollParent(element: HTMLElement): void {
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
}
