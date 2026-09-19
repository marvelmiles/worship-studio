import type { AppAlert, Toast } from "../../types";
import { uid } from "../../lib/id";
import { missingCapabilities } from "../../lib/capabilities";
import type { SliceCreator } from "../storeTypes";
import { APP_NAME } from "../../lib/appInfo";

export type OverlayName = "assets" | "settings" | "shortcuts" | "about";

export interface OverlayOptions {
  lockSection?: boolean;
}

export interface UiSlice {
  overlay: OverlayName | null;
  overlayContext: string | null;
  overlaySectionLocked: boolean;
  toasts: Toast[];
  alerts: AppAlert[];
  showGuide: boolean;
  goLiveTipOpen: boolean;

  openOverlay: (
    name: OverlayName,
    context?: string,
    options?: OverlayOptions,
  ) => void;
  closeOverlay: () => void;
  pushToast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  pushAlert: (message: string, kind?: AppAlert["kind"], key?: string) => void;
  dismissAlert: (id: string) => void;
  clearAlert: (key: string) => void;
  completeGuide: () => void;
  showGoLiveTip: () => void;
  dismissGoLiveTip: (dontShowAgain: boolean) => void;
  runCapabilityCheck: () => void;
}

export const createUiSlice: SliceCreator<UiSlice> = (set, get) => ({
  overlay: null,
  overlayContext: null,
  overlaySectionLocked: false,
  toasts: [],
  alerts: [],
  showGuide: false,
  goLiveTipOpen: false,

  openOverlay: (name, context, options) =>
    set({
      overlay: name,
      overlayContext: context ?? null,
      overlaySectionLocked: Boolean(context && options?.lockSection),
    }),
  closeOverlay: () =>
    set({ overlay: null, overlayContext: null, overlaySectionLocked: false }),

  pushToast: (message, kind = "success") =>
    set((state) => ({
      toasts: [...state.toasts, { id: uid(), message, kind }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  pushAlert: (message, kind = "warning", key) =>
    set((state) => {
      const without = key
        ? state.alerts.filter((a) => a.key !== key)
        : state.alerts;
      return { alerts: [...without, { id: uid(), message, kind, key }] };
    }),
  dismissAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  clearAlert: (key) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.key !== key) })),

  completeGuide: () => {
    set({ showGuide: false });
    get().savePrefs({ ...get().prefs, onboarded: true });
  },

  showGoLiveTip: () => {
    if (get().prefs.goLiveTipDismissed) return;
    set({ goLiveTipOpen: true });
  },

  dismissGoLiveTip: (dontShowAgain) => {
    set({ goLiveTipOpen: false });
    if (dontShowAgain)
      get().savePrefs({ ...get().prefs, goLiveTipDismissed: true });
  },

  runCapabilityCheck: () => {
    const missing = missingCapabilities();
    if (missing.length === 0) return;
    const critical = missing.some((m) => m.critical);
    const names = missing.map((m) => m.label).join(", ");
    get().pushAlert(
      critical
        ? `This browser is missing features ${APP_NAME} needs to run: ${names}. Please update to the latest version of your browser.`
        : `Some features are unavailable in this browser: ${names}. Everything else works; updating your browser usually restores them.`,
      critical ? "error" : "warning",
      "capabilities",
    );
  },
});
