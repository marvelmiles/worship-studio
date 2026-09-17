/**
 * The stacking order of the pop-out windows, shared by all of them so that
 * touching one brings it in front of the others. Raising only reorders the
 * pop-outs among themselves: the whole band sits below every piece of app
 * chrome, so dialogs, the full-screen stage, alerts and toasts always cover a
 * pop-out however many times it has been brought forward.
 */
const BASE_Z = 160;

let order: string[] = [];
const listeners = new Set<() => void>();

const publish = (next: string[]): void => {
  order = next;
  for (const listener of listeners) listener();
};

export const subscribeFloatingStack = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A window opens in front of the ones already on screen. */
export const registerFloating = (id: string): void => {
  if (order.includes(id)) return;
  publish([...order, id]);
};

export const releaseFloating = (id: string): void => {
  if (!order.includes(id)) return;
  publish(order.filter((entry) => entry !== id));
};

export const raiseFloating = (id: string): void => {
  if (order[order.length - 1] === id) return;
  publish([...order.filter((entry) => entry !== id), id]);
};

export const floatingZIndex = (id: string): number =>
  BASE_Z + Math.max(0, order.indexOf(id));
