import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { ContentKind, SlideDeckDoc } from "../../types";
import type {
  AssetUsageEdit,
  AssetUsagePlace,
  AssetUsageRequest,
} from "../../lib/assetUsage";
import {
  assetUsageDocumentChanges,
  assetUsageEditSchema,
  assetUsagePath,
  assetUsageSlideChanges,
} from "../../lib/assetUsage";
import { useStore } from "../../store/useStore";
import type { DeckEditor } from "../editor/useDeckEditor";
import routes from "../../routes";

/**
 * Editing an asset for one place it is used: a slide, a manuscript or a
 * passage. The settings travel to the asset's own editor page and come back
 * with it, so the picture, clip or sound in the library is never touched and
 * every other place it is used stays as it is.
 */

const editStateSchema = z.object({ assetUsageEdit: assetUsageEditSchema });

const resultStateSchema = z.object({ assetUsageResult: assetUsageEditSchema });

const DOCUMENT_ROUTE: Partial<Record<ContentKind, (id: string) => string>> = {
  manuscript: routes.manuscript,
  scripture: routes.passage,
};

interface AssetUsageEditorOptions {
  kind: ContentKind;
  doc: SlideDeckDoc;
  editor: DeckEditor;
}

/**
 * Opens an asset's editor for one place in this document. The document is
 * written first: its editor is left behind while the asset is being tuned, and
 * an unsaved draft would not survive the trip.
 */
export const useOpenAssetUsageEditor = ({
  kind,
  doc,
  editor,
}: AssetUsageEditorOptions) => {
  const navigate = useNavigate();
  const pushToast = useStore((s) => s.pushToast);
  const { dirty, save } = editor;

  return useCallback(
    (request: AssetUsageRequest, place: Omit<AssetUsagePlace, "returnTo">) => {
      const returnTo = DOCUMENT_ROUTE[kind]?.(doc.id);
      if (!returnTo) return;
      /* Written even when nothing has changed: a document that has never been
         saved would have nothing to come back to. */
      if (!save()) {
        pushToast(
          "This document could not be saved, so its asset editor stayed closed.",
          "error",
        );
        return;
      }
      if (dirty) pushToast("Changes saved.");
      const edit: AssetUsageEdit = { ...request, ...place, returnTo };
      navigate(assetUsagePath(edit), { state: { assetUsageEdit: edit } });
    },
    [dirty, doc.id, kind, navigate, pushToast, save],
  );
};

export type OpenAssetUsageEditor = ReturnType<typeof useOpenAssetUsageEditor>;

export interface AssetUsageEditorSession {
  edit: AssetUsageEdit;
  /** Leaves the settings as they were. */
  cancel: () => void;
  /** Hands the settings back to the page the edit came from. */
  apply: (settings: AssetUsageEdit["settings"]) => void;
}

export const useAssetUsageEditor = (): AssetUsageEditorSession | null => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const edit = useMemo(() => {
    const parsed = editStateSchema.safeParse(state);
    return parsed.success ? parsed.data.assetUsageEdit : null;
  }, [state]);

  const cancel = useCallback(() => {
    if (edit) navigate(edit.returnTo);
  }, [edit, navigate]);

  const apply = useCallback(
    (settings: AssetUsageEdit["settings"]) => {
      if (!edit) return;
      navigate(edit.returnTo, {
        state: { assetUsageResult: { ...edit, settings } },
      });
    },
    [edit, navigate],
  );

  return useMemo(
    () => (edit ? { edit, cancel, apply } : null),
    [apply, cancel, edit],
  );
};

/**
 * Takes the settings coming back from an asset editor and stages them on the
 * slide or document they were edited for, like any other edit, so undo can take
 * them back and Save decides.
 */
export const useAssetUsageResult = (editor: DeckEditor): void => {
  const navigate = useNavigate();
  const location = useLocation();
  const pushToast = useStore((s) => s.pushToast);
  const { patchDoc, patchSlideOverrides } = editor;

  useEffect(() => {
    const parsed = resultStateSchema.safeParse(location.state);
    if (!parsed.success) return;
    const result = parsed.data.assetUsageResult;
    if (result.slideId)
      patchSlideOverrides(result.slideId, assetUsageSlideChanges(result));
    else patchDoc(assetUsageDocumentChanges(result));
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
    pushToast(`Applied to ${result.label}. Save to keep it.`);
  }, [location, navigate, patchDoc, patchSlideOverrides, pushToast]);
};
