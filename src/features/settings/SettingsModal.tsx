import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Combine,
  Download,
  Replace,
  RotateCcw,
  Shield,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  EasingKind,
  ImportMode,
  PresentationView,
  Prefs,
} from "../../types";
import { useStore } from "../../store/useStore";
import { getStorageLabel } from "../../lib/storageStats";
import {
  MAX_KEPT_ITEMS,
  keptManuscripts,
  keptThemes,
} from "../../lib/keepOnReset";
import { fade, mix, colors, DISPLAY, UI } from "../../theme/tokens";
import { Modal } from "../../components/ui/Modal";
import {
  Field,
  Range,
  Select,
  TextInput,
  Toggle,
  SectionTitle,
} from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";
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

const IMPORT_OPTIONS: {
  mode: ImportMode;
  title: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    mode: "override",
    title: "Replace everything",
    desc: "Clear current data, then load the file.",
    icon: Replace,
  },
  {
    mode: "merge-imported",
    title: "Merge · imported wins",
    desc: "Combine both; the file overrides clashes.",
    icon: Combine,
  },
  {
    mode: "merge-existing",
    title: "Merge · keep mine",
    desc: "Combine both; current data wins clashes.",
    icon: Shield,
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SettingsModal() {
  const overlay = useStore((s) => s.overlay);
  const close = useStore((s) => s.closeOverlay);
  const prefs = useStore((s) => s.prefs);
  const savePrefs = useStore((s) => s.savePrefs);
  const themes = useStore((s) => s.themes);
  const manuscripts = useStore((s) => s.manuscripts);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const pushToast = useStore((s) => s.pushToast);
  const isMemoryFallback = useStore((s) => s.isMemoryFallback);
  const resetApp = useStore((s) => s.resetApp);
  const storage = useStore((s) => s.storage);
  const refreshStorage = useStore((s) => s.refreshStorage);

  useEffect(() => {
    if (overlay === "settings") void refreshStorage();
  }, [overlay, refreshStorage]);

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<ImportMode | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [phrase, setPhrase] = useState("");

  const update = (changes: Partial<Prefs>) =>
    savePrefs({ ...prefs, ...changes });

  /** Titles of the manuscripts and themes registered to survive a reset. */
  const keptItems = useMemo(
    () => [
      ...keptManuscripts(manuscripts).map((m) => m.title),
      ...keptThemes(themes).map((t) => t.name),
    ],
    [manuscripts, themes],
  );

  const runExport = async () => {
    if (busy) return;
    setBusy("export");
    setProgress(0);
    const result = await exportData((f) => setProgress(Math.round(f * 100)));
    setProgress(100);
    await delay(450);
    setBusy(null);
    if (result.ok) pushToast("Backup exported successfully.");
    else if (!result.cancelled)
      pushToast("Export failed. Please try again.", "error");
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
    const result = await importData(file, mode, (f) =>
      setProgress(Math.round(f * 100)),
    );
    setProgress(100);
    await delay(300);
    setBusy(null);
    pendingMode.current = null;
    pushToast(result.message, result.ok ? "success" : "error");
  };

  return (
    <>
      <Modal
        open={overlay === "settings"}
        onClose={close}
        title="Settings"
        width={560}
      >
        <SectionTitle>Presentation</SectionTitle>
        <Field label="Default screen fit">
          <Select
            value={prefs.presentationView}
            options={VIEW_OPTIONS}
            onChange={(e) =>
              update({ presentationView: e.target.value as PresentationView })
            }
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

        <SectionTitle>Default Themes</SectionTitle>
        <p
          style={{
            fontFamily: UI,
            fontSize: 13,
            color: colors.sub,
            marginTop: 0,
            lineHeight: 1.6,
          }}
        >
          Applied to newly created manuscripts and to Bible passages presented
          or saved from the reader.
        </p>
        <Field label="Manuscripts">
          <Select
            value={prefs.defaultManuscriptThemeId}
            options={themes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(e) =>
              update({ defaultManuscriptThemeId: e.target.value })
            }
          />
        </Field>
        <Field label="Bible">
          <Select
            value={prefs.defaultScriptureThemeId}
            options={themes.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(e) =>
              update({ defaultScriptureThemeId: e.target.value })
            }
          />
        </Field>

        <SectionTitle>Transitions</SectionTitle>
        <AnimationPicker
          label="Default animation"
          value={prefs.transition}
          onSelect={(value) =>
            update({ transition: value as Prefs["transition"] })
          }
        />
        <Field label={`Duration (${prefs.transitionDuration}ms)`}>
          <Range
            value={prefs.transitionDuration}
            min={150}
            max={1500}
            step={50}
            suffix="ms"
            onChange={(e) =>
              update({ transitionDuration: Number(e.target.value) })
            }
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
            onChange={(e) =>
              update({ backgroundVolume: Number(e.target.value) })
            }
          />
        </Field>
        <div style={{ marginBottom: 6 }}>
          <Toggle
            label="Loop background audio"
            checked={prefs.loopAudio}
            onChange={(checked) => update({ loopAudio: checked })}
          />
        </div>

        {storage && (
          <>
            <SectionTitle>Storage</SectionTitle>
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 20,
                    fontWeight: 600,
                    color:
                      storage.level === "critical"
                        ? colors.danger
                        : colors.text,
                    lineHeight: 1,
                  }}
                >
                  {Math.min(100, Math.round(storage.pct * 100))}%
                </div>
                <div
                  style={{ fontFamily: UI, fontSize: 12, color: colors.sub }}
                >
                  {getStorageLabel(storage)}
                </div>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                  marginTop: 9,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(2, Math.min(100, storage.pct * 100))}%`,
                    borderRadius: 99,
                    background:
                      storage.level === "critical"
                        ? `linear-gradient(90deg, ${colors.danger}, ${mix(colors.danger, "#ffffff", 0.28)})`
                        : storage.level === "warn"
                          ? `linear-gradient(90deg, ${colors.warning}, ${mix(colors.warning, "#ffffff", 0.28)})`
                          : `linear-gradient(90deg, ${colors.success}, ${mix(colors.success, "#ffffff", 0.28)})`,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          </>
        )}

        <SectionTitle>Data</SectionTitle>
        <p
          style={{
            fontFamily: UI,
            fontSize: 13,
            color: colors.sub,
            marginTop: 0,
            lineHeight: 1.6,
          }}
        >
          Export everything (manuscripts, scripture passages, images, videos,
          themes, custom backgrounds, audio and settings) to a single backup
          file (.zip), then bring it back here on any device. Older JSON backups
          can still be imported.
        </p>
        {busy && (
          <div style={{ marginBottom: 14 }}>
            <ProgressBar
              value={progress}
              label={busy === "export" ? "Exporting" : "Importing"}
            />
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Button
            variant="primary"
            onClick={runExport}
            busy={busy === "export"}
            disabled={busy === "import"}
          >
            <Download size={15} />
            Export Data
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowImport((v) => !v)}
            busy={busy === "import"}
            disabled={busy === "export"}
          >
            <Upload size={15} />
            Import Data
          </Button>
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
                  background: colors.raise,
                  border: `1px solid ${colors.border}`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = fade(colors.accent, 0.4))
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = colors.border)
                }
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    background: fade(colors.accent, 0.14),
                    color: colors.accentSoft,
                  }}
                >
                  <option.icon size={17} />
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: colors.text,
                  }}
                >
                  {option.title}
                </div>
                <div
                  style={{
                    fontFamily: UI,
                    fontSize: 12,
                    color: colors.sub,
                    lineHeight: 1.45,
                  }}
                >
                  {option.desc}
                </div>
              </button>
            ))}
          </div>
        )}

        {isMemoryFallback() && (
          <p
            style={{
              fontFamily: UI,
              fontSize: 12,
              color: colors.danger,
              opacity: 0.85,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Storage is running in memory only, so data won't survive a refresh
            in this browser.
          </p>
        )}

        <SectionTitle>Reset</SectionTitle>
        <p
          style={{
            fontFamily: UI,
            fontSize: 13,
            color: colors.sub,
            marginTop: 0,
            lineHeight: 1.6,
          }}
        >
          Restore WorshipStudio to its original state, exactly like the first
          time you opened it.{" "}
          {keptItems.length > 0
            ? `${keptItems.length} of ${MAX_KEPT_ITEMS} "keep on reset" slots are in use, and those items will survive.`
            : `Manuscripts and custom themes you mark "Keep on reset" (up to ${MAX_KEPT_ITEMS}) survive this.`}
        </p>
        <Button
          variant="danger"
          onClick={() => {
            setPhrase("");
            setConfirmReset(true);
          }}
        >
          <RotateCcw size={15} />
          Reset App to Defaults
        </Button>
      </Modal>

      {confirmReset && (
        <Modal
          open
          onClose={() => setConfirmReset(false)}
          title="Reset everything?"
          width={480}
          footer={
            <>
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={phrase.trim() !== RESET_PHRASE}
                onClick={async () => {
                  setConfirmReset(false);
                  close();
                  await resetApp();
                }}
              >
                Reset everything
              </Button>
            </>
          }
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 14,
              borderRadius: 11,
              background: fade(colors.danger, 0.1),
              border: `1px solid ${fade(colors.danger, 0.3)}`,
              marginBottom: 16,
            }}
          >
            <AlertTriangle
              size={20}
              color={colors.danger}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div
              style={{
                fontFamily: UI,
                fontSize: 13.5,
                color: colors.text,
                lineHeight: 1.6,
              }}
            >
              This permanently deletes{" "}
              <strong>
                all your manuscripts, custom themes, backgrounds, audio, and
                settings
              </strong>
              , and restores the built-in defaults. You'll be treated as a
              first-time user again. This can't be undone, so export a backup
              first if you want to keep anything.
              {keptItems.length > 0 && (
                <>
                  {" "}
                  The {keptItems.length} item
                  {keptItems.length === 1 ? "" : "s"} you marked{" "}
                  <strong>Keep on reset</strong> will survive:{" "}
                  {keptItems.join(", ")}.
                </>
              )}
            </div>
          </div>
          <p
            style={{
              fontFamily: UI,
              fontSize: 13.5,
              color: colors.sub,
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            Type{" "}
            <code style={{ textTransform: "none", color: colors.text }}>
              {RESET_PHRASE}
            </code>{" "}
            below to confirm (case-sensitive).
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
