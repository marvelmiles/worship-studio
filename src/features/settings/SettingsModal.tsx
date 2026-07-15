import { useRef, useState } from "react";
import { AlertTriangle, Combine, Download, Replace, RotateCcw, Shield, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EasingKind, ImportMode, PresentationView, Prefs } from "../../types";
import { useStore } from "../../store/useStore";
import { C, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import { Field, Range, Select, TextInput, Toggle, SectionTitle } from "../../components/ui/Field";
import { Btn } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { AnimationPicker } from "../../components/controls/AnimationPicker";

const RESET_PHRASE = "ResetApp";

const VIEW_OPTIONS = [
  { value: "normal", label: "Normal (fit, letterboxed)" },
  { value: "cover", label: "Cover (fill, may crop)" },
  { value: "fill", label: "Fill (stretch to screen)" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "ease-out", label: "Ease out" },
  { value: "linear", label: "Linear" },
];

const IMPORT_OPTIONS: { mode: ImportMode; title: string; desc: string; icon: LucideIcon }[] = [
  { mode: "override", title: "Replace everything", desc: "Clear current data, then load the file.", icon: Replace },
  { mode: "merge-imported", title: "Merge · imported wins", desc: "Combine both; the file overrides clashes.", icon: Combine },
  { mode: "merge-existing", title: "Merge · keep mine", desc: "Combine both; current data wins clashes.", icon: Shield },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SettingsModal() {
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);
  const prefs = useStore((s) => s.prefs);
  const savePrefs = useStore((s) => s.savePrefs);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const pushToast = useStore((s) => s.pushToast);
  const isMemoryFallback = useStore((s) => s.isMemoryFallback);
  const resetApp = useStore((s) => s.resetApp);

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<ImportMode | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [phrase, setPhrase] = useState("");

  const update = (changes: Partial<Prefs>) => savePrefs({ ...prefs, ...changes });

  const runExport = async () => {
    if (busy) return;
    setBusy("export");
    setProgress(0);
    const result = await exportData((f) => setProgress(Math.round(f * 100)));
    setProgress(100);
    await delay(450);
    setBusy(null);
    if (result.ok) pushToast("Backup exported successfully.");
    else if (!result.cancelled) pushToast("Export failed — please try again.", "error");
  };

  const chooseMode = (mode: ImportMode) => {
    pendingMode.current = mode;
    inputRef.current?.click();
  };

  const onFile = async (file: File) => {
    const mode = pendingMode.current;
    if (!mode) return;
    setShowImport(false);
    setBusy("import");
    setProgress(0);
    const result = await importData(file, mode, (f) => setProgress(Math.round(f * 100)));
    setProgress(100);
    await delay(300);
    setBusy(null);
    pendingMode.current = null;
    pushToast(result.message, result.ok ? "success" : "error");
  };

  return (
    <>
      <Modal open={overlay === "settings"} onClose={close} title="Settings" width={560}>
      <SectionTitle>Presentation</SectionTitle>
      <Field label="Default screen fit">
        <Select
          value={prefs.presentationView}
          options={VIEW_OPTIONS}
          onChange={(e) => update({ presentationView: e.target.value as PresentationView })}
        />
      </Field>
      <div style={{ marginBottom: 14 }}>
        <Toggle
          label="Show presenter bar"
          checked={prefs.showPresenterBar}
          onChange={(checked) => update({ showPresenterBar: checked })}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Toggle
          label="Auto-hide controls on mouse leave"
          checked={prefs.autoHideControls}
          onChange={(checked) => update({ autoHideControls: checked })}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Toggle
          label="Auto-hide presenter bar on mouse leave"
          checked={prefs.autoHidePresenterBar}
          onChange={(checked) => update({ autoHidePresenterBar: checked })}
        />
      </div>

      <SectionTitle>Transitions</SectionTitle>
      <AnimationPicker
        label="Default animation"
        value={prefs.transition}
        onSelect={(value) => update({ transition: value as Prefs["transition"] })}
      />
      <Field label={`Duration (${prefs.transitionDuration}ms)`}>
        <Range
          value={prefs.transitionDuration}
          min={150}
          max={1500}
          step={50}
          suffix="ms"
          onChange={(e) => update({ transitionDuration: Number(e.target.value) })}
        />
      </Field>
      <Field label="Easing">
        <Select
          value={prefs.easing}
          options={EASING_OPTIONS}
          onChange={(e) => update({ easing: e.target.value as EasingKind })}
        />
      </Field>

      <SectionTitle>Audio</SectionTitle>
      <Field label={`Background audio volume (${prefs.backgroundVolume}%)`}>
        <Range
          value={prefs.backgroundVolume}
          min={0}
          max={100}
          suffix="%"
          onChange={(e) => update({ backgroundVolume: Number(e.target.value) })}
        />
      </Field>
      <div style={{ marginBottom: 6 }}>
        <Toggle
          label="Loop background audio"
          checked={prefs.loopAudio}
          onChange={(checked) => update({ loopAudio: checked })}
        />
      </div>

      <SectionTitle>Data</SectionTitle>
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>
        Export everything — songs, scripture passages, images, videos, themes, custom backgrounds,
        audio and settings — to a single backup file (.zip), then bring it back here on any device.
        Older JSON backups can still be imported.
      </p>
      {busy && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar value={progress} label={busy === "export" ? "Exporting…" : "Importing…"} />
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Btn variant="primary" onClick={runExport} disabled={Boolean(busy)}>
          <Download size={15} />
          Export Data
        </Btn>
        <Btn variant="ghost" onClick={() => setShowImport((v) => !v)} disabled={Boolean(busy)}>
          <Upload size={15} />
          Import Data
        </Btn>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {showImport && !busy && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 10,
          }}
        >
          {IMPORT_OPTIONS.map((option) => (
            <button
              key={option.mode}
              onClick={() => chooseMode(option.mode)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 14,
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                background: C.raise,
                border: `1px solid ${C.border}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(216,162,74,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(216,162,74,0.14)",
                  color: C.goldSoft,
                }}
              >
                <option.icon size={17} />
              </div>
              <div style={{ fontFamily: UI, fontWeight: 600, fontSize: 13.5, color: C.text }}>
                {option.title}
              </div>
              <div style={{ fontFamily: UI, fontSize: 12, color: C.sub, lineHeight: 1.45 }}>
                {option.desc}
              </div>
            </button>
          ))}
        </div>
      )}

      {isMemoryFallback() && (
        <p style={{ fontFamily: UI, fontSize: 12, color: C.danger, opacity: 0.85, marginTop: 12, marginBottom: 0 }}>
          Storage is running in memory only — data won't persist after a refresh in this browser.
        </p>
      )}

      <SectionTitle>Reset</SectionTitle>
      <p style={{ fontFamily: UI, fontSize: 13, color: C.sub, marginTop: 0, lineHeight: 1.6 }}>
        Restore WorshipStudio to its original state — exactly like the first time you opened it.
      </p>
      <Btn
        variant="danger"
        onClick={() => {
          setPhrase("");
          setConfirmReset(true);
        }}
      >
        <RotateCcw size={15} />
        Reset App to Defaults
      </Btn>
      </Modal>

      {confirmReset && (
        <Modal
          open
          onClose={() => setConfirmReset(false)}
          title="Reset everything?"
          width={480}
          footer={
            <>
              <Btn onClick={() => setConfirmReset(false)}>Cancel</Btn>
              <Btn
                variant="danger"
                disabled={phrase.trim() !== RESET_PHRASE}
                onClick={async () => {
                  setConfirmReset(false);
                  close();
                  await resetApp();
                }}
              >
                Reset everything
              </Btn>
            </>
          }
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 14,
              borderRadius: 11,
              background: "rgba(224,100,79,0.1)",
              border: `1px solid rgba(224,100,79,0.3)`,
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={20} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: UI, fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>
              This permanently deletes <strong>all your songs, custom themes, backgrounds, audio, and
              settings</strong>, and restores the built-in defaults. You'll be treated as a first-time
              user again. This can't be undone — export a backup first if you want to keep anything.
            </div>
          </div>
          <p style={{ fontFamily: UI, fontSize: 13.5, color: C.sub, margin: "0 0 8px", lineHeight: 1.6 }}>
            Type <code style={{ textTransform: "none", color: C.text }}>{RESET_PHRASE}</code> below to
            confirm (case-sensitive).
          </p>
          <TextInput
            value={phrase}
            placeholder={RESET_PHRASE}
            onChange={(e) => setPhrase(e.target.value)}
          />
        </Modal>
      )}
    </>
  );
}
