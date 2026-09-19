import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useStore } from "../../store/useStore";
import { overlayTarget } from "../../lib/overlayTarget";
import { isRoutePath } from "../../routes";

export type AssetSection = "backgrounds" | "audio";

export interface OpenAssetLibraryOptions {
  itemId?: string | null;
  locked?: boolean;
}

const returnStateSchema = z.object({
  returnTo: z.object({
    path: z.string().refine(isRoutePath),
    section: z.enum(["backgrounds", "audio"]),
    locked: z.boolean(),
  }),
});

export type AssetLibraryReturn = z.infer<typeof returnStateSchema>["returnTo"];

export const useOpenAssetLibrary = () => {
  const openOverlay = useStore((s) => s.openOverlay);
  return useCallback(
    (section: AssetSection, options: OpenAssetLibraryOptions = {}) =>
      openOverlay("assets", overlayTarget(section, options.itemId), {
        lockSection: options.locked,
      }),
    [openOverlay],
  );
};

export const useOpenAssetEditor = () => {
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
};

const reopenStateSchema = z.object({
  reopenAssets: z.object({
    section: z.enum(["backgrounds", "audio"]),
    itemId: z.string().nullable(),
    locked: z.boolean(),
  }),
});

const SECTION_TITLE: Record<AssetSection, string> = {
  backgrounds: "Back to the background library",
  audio: "Back to the audio library",
};

export interface EditorReturn {
  fromLibrary: boolean;
  /** Names where the back arrow goes, so the editor does not have to guess. */
  backTitle: string;
  back: () => void;
}

export const useEditorReturn = (
  fallbackPath: string,
  itemId: string,
  fallbackTitle: string,
  fallbackSection?: AssetSection,
): EditorReturn => {
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

  return {
    fromLibrary: Boolean(returnTo),
    backTitle: returnTo ? SECTION_TITLE[returnTo.section] : fallbackTitle,
    back,
  };
};

export const useReopenAssetLibraryOnArrival = (): void => {
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
};
