import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Combine,
  Download,
  Replace,
  Share2,
  Shield,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ImportMode } from "../../types";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import { SectionTitle } from "../../components/ui/Field";
import { ProgressBar } from "../../components/ui/ProgressBar";
import routes from "../../routes";

const EXPORT_SETTLE_MS = 450;
const IMPORT_SETTLE_MS = 300;

const IMPORT_OPTIONS: {
  mode: ImportMode;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    mode: "override",
    title: "Replace everything",
    description: "Clear current data, then load the file.",
    icon: Replace,
  },
  {
    mode: "merge-imported",
    title: "Merge · imported wins",
    description: "Combine both; the file overrides clashes.",
    icon: Combine,
  },
  {
    mode: "merge-existing",
    title: "Merge · keep mine",
    description: "Combine both; current data wins clashes.",
    icon: Shield,
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const DataSection = () => {
  const { colors, fonts } = useUITheme();
  const navigate = useNavigate();
  const closeOverlay = useStore((s) => s.closeOverlay);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const pushToast = useStore((s) => s.pushToast);
  const isMemoryFallback = useStore((s) => s.isMemoryFallback);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingMode = useRef<ImportMode | null>(null);
  const [isChoosingMode, setIsChoosingMode] = useState(false);
  const [busyWith, setBusyWith] = useState<"export" | "import" | null>(null);
  const [progress, setProgress] = useState(0);

  const runExport = async () => {
    if (busyWith) return;
    setBusyWith("export");
    setProgress(0);
    const result = await exportData((fraction) =>
      setProgress(Math.round(fraction * 100)),
    );
    setProgress(100);
    await delay(EXPORT_SETTLE_MS);
    setBusyWith(null);
    if (result.ok) pushToast("Backup exported successfully.");
    else if (!result.cancelled) {
      pushToast("Export failed. Please try again.", "error");
    }
  };

  const runImport = async (file: File) => {
    const mode = pendingMode.current;
    if (!mode) return;
    setIsChoosingMode(false);
    setBusyWith("import");
    setProgress(0);
    const result = await importData(file, mode, (fraction) =>
      setProgress(Math.round(fraction * 100)),
    );
    setProgress(100);
    await delay(IMPORT_SETTLE_MS);
    setBusyWith(null);
    pendingMode.current = null;
    pushToast(result.message, result.ok ? "success" : "error");
  };

  return (
    <>
      <SectionTitle
        info={
          <InfoTip title="Backup and restore">
            Export everything (manuscripts, scripture passages, images, videos,
            themes, custom backgrounds, audio and settings) to a single backup
            file (.zip), then bring it back here on any device. Quick Share
            sends the same data straight to a device on the same WiFi, with no
            file to carry.
          </InfoTip>
        }
      >
        Data
      </SectionTitle>

      {busyWith && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar
            value={progress}
            label={busyWith === "export" ? "Exporting" : "Importing"}
          />
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Button
          variant="primary"
          onClick={runExport}
          busy={busyWith === "export"}
          disabled={busyWith === "import"}
        >
          <Download size={15} />
          Export Data
        </Button>
        <Button
          variant="ghost"
          onClick={() => setIsChoosingMode((open) => !open)}
          busy={busyWith === "import"}
          disabled={busyWith === "export"}
        >
          <Upload size={15} />
          Import Data
        </Button>
        <Button
          variant="ghost"
          disabled={Boolean(busyWith)}
          onClick={() => {
            closeOverlay();
            navigate(routes.share());
          }}
          title="Send this library straight to another device on the same WiFi"
        >
          <Share2 size={15} />
          Quick Share
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await runImport(file);
            event.target.value = "";
          }}
        />
      </div>

      {isChoosingMode && !busyWith && (
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
              onClick={() => {
                pendingMode.current = option.mode;
                fileInputRef.current?.click();
              }}
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
                  fontFamily: fonts.ui,
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: colors.text,
                }}
              >
                {option.title}
              </div>
              <div
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 12,
                  color: colors.sub,
                  lineHeight: 1.45,
                }}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {isMemoryFallback() && (
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 12,
            color: colors.danger,
            opacity: 0.85,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          Memory-only storage: data won&apos;t survive a refresh.
        </p>
      )}
    </>
  );
};
