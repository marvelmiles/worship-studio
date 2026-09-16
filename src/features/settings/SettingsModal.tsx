import { useEffect, useMemo } from "react";
import type { Prefs } from "../../types";
import { useStore } from "../../store/useStore";
import { keptManuscripts, keptThemes } from "../../lib/keepOnReset";
import { Modal } from "../../components/ui/Modal";
import {
  AudioSection,
  DefaultThemesSection,
  PresentationSection,
  TransitionsSection,
} from "./PreferenceSections";
import { DataSection } from "./DataSection";
import { ResetSection } from "./ResetSection";
import { StorageSection } from "./StorageSection";

export const SettingsModal = () => {
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);
  const prefs = useStore((s) => s.prefs);
  const savePrefs = useStore((s) => s.savePrefs);
  const themes = useStore((s) => s.themes);
  const manuscripts = useStore((s) => s.manuscripts);
  const storage = useStore((s) => s.storage);
  const refreshStorage = useStore((s) => s.refreshStorage);

  useEffect(() => {
    if (overlay === "settings") void refreshStorage();
  }, [overlay, refreshStorage]);

  const updatePrefs = (changes: Partial<Prefs>) =>
    savePrefs({ ...prefs, ...changes });

  const keptItems = useMemo(
    () => [
      ...keptManuscripts(manuscripts).map((manuscript) => manuscript.title),
      ...keptThemes(themes).map((theme) => theme.name),
    ],
    [manuscripts, themes],
  );

  return (
    <Modal
      open={overlay === "settings"}
      onClose={close}
      title="Settings"
      width={560}
    >
      <PresentationSection prefs={prefs} onChange={updatePrefs} />
      <DefaultThemesSection
        prefs={prefs}
        themes={themes}
        onChange={updatePrefs}
      />
      <TransitionsSection prefs={prefs} onChange={updatePrefs} />
      <AudioSection prefs={prefs} onChange={updatePrefs} />
      {storage && <StorageSection storage={storage} />}
      <DataSection />
      <ResetSection keptItems={keptItems} onBeforeReset={close} />
    </Modal>
  );
};
