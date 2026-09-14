import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useStore } from "../../store/useStore";
import { overlayTarget } from "../../lib/overlayTarget";

export type AssetSection = "backgrounds" | "audio";

export interface OpenAssetLibraryOptions {
  /** The item to scroll to and ring once the library is open. */
  itemId?: string | null;
  /** Shows this section alone, the way an editor's "Manage" button asks for it. */
  locked?: boolean;
}

/**
 * Where an editor opened from the asset library goes back to: the page the
 * library was open over, with the library reopened on the section it was left
 * on, so tuning a clip or a sound is a round trip rather than a detour.
 */
const returnStateSchema = z.object({
  returnTo: z.object({
    path: z.string().startsWith("/"),
    section: z.enum(["backgrounds", "audio"]),
    locked: z.boolean(),
  }),
});

export type AssetLibraryReturn = z.infer<typeof returnStateSchema>["returnTo"];

export function useOpenAssetLibrary() {
  const openOverlay = useStore((s) => s.openOverlay);
  return useCallback(
    (section: AssetSection, options: OpenAssetLibraryOptions = {}) =>
      openOverlay("assets", overlayTarget(section, options.itemId), {
        lockSection: options.locked,
      }),
    [openOverlay],
  );
}

/**
 * Leaves the library for an item's editor, carrying the way back with it. The
 * library is closed first so the editor is not opened underneath it.
 */
export function useOpenAssetEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const closeOverlay = useStore((s) => s.closeOverlay);
  const locked = useStore((s) => s.overlaySectionLocked);

  return useCallback(
    (editorPath: string, section: AssetSection) => {
      const returnTo: AssetLibraryReturn = {
        path: `${location.pathname}${location.search}`,
        section,
        locked,
      };
      closeOverlay();
      navigate(editorPath, { state: { returnTo } });
    },
    [closeOverlay, locked, location.pathname, location.search, navigate],
  );
}

const reopenStateSchema = z.object({
  reopenAssets: z.object({
    section: z.enum(["backgrounds", "audio"]),
    itemId: z.string().nullable(),
    locked: z.boolean(),
  }),
});

export interface EditorReturn {
  /** True when the editor was opened from the asset library. */
  fromLibrary: boolean;
  back: () => void;
}

/**
 * The editor side of the round trip. Without a library to return to, `back`
 * goes to `fallbackPath`, which is where the editor's own module lives, opening
 * the library on `fallbackSection` when the editor has no module page of its own.
 *
 * The library is reopened by the page arrived at rather than from here, so a
 * navigation held back by an unsaved-changes prompt never opens it over the
 * editor that is still on screen.
 */
export function useEditorReturn(
  fallbackPath: string,
  itemId: string,
  fallbackSection?: AssetSection,
): EditorReturn {
  const navigate = useNavigate();
  const location = useLocation();
  const parsed = returnStateSchema.safeParse(location.state);
  const returnTo = parsed.success ? parsed.data.returnTo : null;

  const back = useCallback(() => {
    const reopen = returnTo
      ? { section: returnTo.section, itemId, locked: returnTo.locked }
      : fallbackSection
        ? { section: fallbackSection, itemId, locked: false }
        : null;
    navigate(returnTo?.path ?? fallbackPath, {
      state: reopen ? { reopenAssets: reopen } : undefined,
    });
  }, [fallbackPath, fallbackSection, itemId, navigate, returnTo]);

  return { fromLibrary: Boolean(returnTo), back };
}

/** Reopens the asset library on a page an editor returned to. */
export function useReopenAssetLibraryOnArrival(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const openLibrary = useOpenAssetLibrary();

  useEffect(() => {
    const parsed = reopenStateSchema.safeParse(location.state);
    if (!parsed.success) return;
    const { section, itemId, locked } = parsed.data.reopenAssets;
    openLibrary(section, { itemId, locked });
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location, navigate, openLibrary]);
}
