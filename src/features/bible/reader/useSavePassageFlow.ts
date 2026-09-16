import { useState } from "react";
import type { ScripturePassage } from "../../../types";
import { useStore } from "../../../store/useStore";
import type {
  SavePassageOptions,
  ScriptureSelection,
} from "../../../store/useStore";
import {
  findSavedDuplicates,
  hasSameContent,
  nextCopyTitle,
} from "../lib/passageDuplicates";
import { formatReference } from "../lib/reference";

interface DuplicatePrompt {
  options: SavePassageOptions;
  existing: ScripturePassage;
}

/** Saving a selection, including what to do when the same passage is already saved. */
export const useSavePassageFlow = () => {
  const pushToast = useStore((s) => s.pushToast);
  const scriptures = useStore((s) => s.scriptures);
  const saveScripturePassage = useStore((s) => s.saveScripturePassage);
  const overwriteScripturePassage = useStore(
    (s) => s.overwriteScripturePassage,
  );
  const [pendingSave, setPendingSave] = useState<ScriptureSelection | null>(
    null,
  );
  const [duplicatePrompt, setDuplicatePrompt] =
    useState<DuplicatePrompt | null>(null);

  const savePassage = (options: SavePassageOptions) => {
    const passage = saveScripturePassage(options);
    if (passage) pushToast(`Saved ${passage.title} to your passages.`);
  };

  const saveSelection = (
    versesPerSlide: number,
    showVerseNumbers: boolean,
    showReference: boolean,
  ) => {
    if (!pendingSave) return;
    const options: SavePassageOptions = {
      ...pendingSave,
      versesPerSlide,
      showVerseNumbers,
      showReference,
    };
    setPendingSave(null);

    const duplicates = findSavedDuplicates(scriptures, options);
    if (duplicates.length === 0) {
      savePassage(options);
      return;
    }
    if (duplicates.some((passage) => hasSameContent(passage, options))) {
      pushToast(
        `${formatReference(options.range, options.version)} is already in your passages.`,
      );
      return;
    }
    setDuplicatePrompt({
      options,
      existing: duplicates.reduce((latest, passage) =>
        latest.updatedAt > passage.updatedAt ? latest : passage,
      ),
    });
  };

  const overwriteDuplicate = () => {
    if (!duplicatePrompt) return;
    const updated = overwriteScripturePassage(
      duplicatePrompt.existing.id,
      duplicatePrompt.options,
    );
    setDuplicatePrompt(null);
    if (updated) pushToast(`Updated ${updated.title} with the new content.`);
  };

  const saveDuplicateAsCopy = () => {
    if (!duplicatePrompt) return;
    const { options } = duplicatePrompt;
    setDuplicatePrompt(null);
    savePassage({
      ...options,
      title: nextCopyTitle(
        formatReference(options.range, options.version),
        scriptures,
      ),
    });
  };

  return {
    pendingSave,
    setPendingSave,
    duplicateTitle: duplicatePrompt?.existing.title ?? null,
    closeDuplicatePrompt: () => setDuplicatePrompt(null),
    saveSelection,
    overwriteDuplicate,
    saveDuplicateAsCopy,
  };
};
