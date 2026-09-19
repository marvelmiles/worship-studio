import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { ContentKind, SlideDeckDoc } from "../../types";
import type {
  AssetUsageEdit,
  AssetUsagePlace,
  AssetUsageRequest,
} from "../../lib/assetUsage";
import {
  applyAssetUsage,
  assetUsageEditSchema,
  assetUsagePath,
  assetUsageReturnPath,
  isAssetUsageDocKind,
} from "../../lib/assetUsage";
import { now } from "../../lib/id";
import { useStore } from "../../store/useStore";
import type { DeckEditor } from "../editor/useDeckEditor";

/**
 * Editing an asset for one place it is used: a slide, a manuscript or a
 * passage. The settings are saved onto that one place from the asset's own
 * editor page, so the picture, clip or sound in the library is never touched
 * and every other place it is used stays as it is.
 */

const editStateSchema = z.object({ assetUsageEdit: assetUsageEditSchema });

/** What the opening page fills in; the editor works out the rest. */
export type AssetUsagePlaceRequest = Pick<AssetUsagePlace, "label" | "slideId">;

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
    (request: AssetUsageRequest, place: AssetUsagePlaceRequest) => {
      if (!isAssetUsageDocKind(kind)) return;
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
      const edit: AssetUsageEdit = {
        ...request,
        ...place,
        docKind: kind,
        docId: doc.id,
      };
      navigate(assetUsagePath(edit), { state: { assetUsageEdit: edit } });
    },
    [dirty, doc.id, kind, navigate, pushToast, save],
  );
};

export type OpenAssetUsageEditor = ReturnType<typeof useOpenAssetUsageEditor>;

export interface AssetUsageEditorSession {
  edit: AssetUsageEdit;
  /** Where the back arrow goes, once there is nothing left unsaved. */
  returnTo: string;
  back: () => void;
  /** Writes the settings onto the one place they were edited for. */
  save: (settings: AssetUsageEdit["settings"]) => boolean;
}

/**
 * Saving reads the document straight from the store rather than from an open
 * editor: the page that opened this one was left behind, and the asset editor
 * only ever touches the single slide or document the edit names.
 */
const saveAssetUsage = (edit: AssetUsageEdit): boolean => {
  const state = useStore.getState();
  if (edit.docKind === "manuscript") {
    const manuscript = state.manuscripts.find((item) => item.id === edit.docId);
    if (!manuscript) return false;
    return state.upsertManuscript({
      ...applyAssetUsage(manuscript, edit),
      updatedAt: now(),
    });
  }
  const passage = state.scriptures.find((item) => item.id === edit.docId);
  if (!passage) return false;
  return state.upsertScripture({
    ...applyAssetUsage(passage, edit),
    updatedAt: now(),
  });
};

export const useAssetUsageEditor = (): AssetUsageEditorSession | null => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const edit = useMemo(() => {
    const parsed = editStateSchema.safeParse(state);
    return parsed.success ? parsed.data.assetUsageEdit : null;
  }, [state]);

  const returnTo = edit ? assetUsageReturnPath(edit) : "";

  const back = useCallback(() => {
    if (returnTo) navigate(returnTo);
  }, [navigate, returnTo]);

  const save = useCallback(
    (settings: AssetUsageEdit["settings"]): boolean => {
      if (!edit) return false;
      const parsed = assetUsageEditSchema.safeParse({ ...edit, settings });
      return parsed.success ? saveAssetUsage(parsed.data) : false;
    },
    [edit],
  );

  return useMemo(
    () => (edit ? { edit, returnTo, back, save } : null),
    [back, edit, returnTo, save],
  );
};
