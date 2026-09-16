import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  PresentationMode,
  ScriptureSelection,
} from "../../store/useStore";
import { useStore } from "../../store/useStore";

export const usePresentScripture = () => {
  const navigate = useNavigate();
  const presentScriptureSelection = useStore(
    (s) => s.presentScriptureSelection,
  );
  const stageScriptureSelection = useStore((s) => s.stageScriptureSelection);

  const present = useCallback(
    (
      selection: ScriptureSelection | null,
      mode: PresentationMode = "stage",
    ) => {
      if (!selection?.verses.length) return;
      presentScriptureSelection(selection, mode);
    },
    [presentScriptureSelection],
  );

  const edit = useCallback(
    (selection: ScriptureSelection | null) => {
      if (!selection?.verses.length) return;
      const passage = stageScriptureSelection(selection);
      if (passage) navigate(`/scripture/${passage.id}`);
    },
    [stageScriptureSelection, navigate],
  );

  return { present, edit };
};
