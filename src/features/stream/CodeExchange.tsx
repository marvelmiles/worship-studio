import { useRef, useState, type ReactNode } from "react";
import { QrCode as QrIcon, Clipboard, Check, Camera } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useElementSize } from "../../hooks/useElementSize";
import { useViewport } from "../../hooks/useViewport";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import { PillTabs } from "../../components/ui/PillTabs";
import { pillTabPanelProps } from "../../components/ui/tabPanel";
import { QrCode } from "./QrCode";
import { QrScanner } from "./QrScanner";
import type { ScanFacing } from "./lib/useQrScanner";

const MAX_QR_SIZE = 420;
const MIN_QR_SIZE = 240;
const QR_TILE_PADDING = 34;
const COPIED_FEEDBACK_MS = 1600;

export type CodePane = "show" | "read";

interface CodeExchangePanesProps {
  /** Keeps this pair's tab and panel ids apart from any other on the page. */
  idPrefix: string;
  show: ReactNode;
  read: ReactNode;
  showLabel?: string;
  readLabel?: string;
  /** The pane to hold open, for news the other pane would otherwise hide. */
  focus?: CodePane;
}

/**
 * The two halves of a pairing: the code this device shows, and the one it
 * reads back. Side by side there is room for both at once. On a narrower
 * screen they would stack into a long scroll with the camera far below the
 * code, so they become tabs and the device shows one at a time.
 */
export const CodeExchangePanes = ({
  idPrefix,
  show,
  read,
  showLabel = "Show code",
  readLabel = "Scan code",
  focus,
}: CodeExchangePanesProps) => {
  const { isLaptop } = useViewport();
  const [chosenPane, setChosenPane] = useState<CodePane>("show");
  const pane = focus ?? chosenPane;

  if (!isLaptop)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        {show}
        {read}
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PillTabs<CodePane>
        tabs={[
          { id: "show", label: showLabel, icon: QrIcon },
          { id: "read", label: readLabel, icon: Camera },
        ]}
        value={pane}
        onChange={setChosenPane}
        ariaLabel="Pairing steps"
        idPrefix={idPrefix}
      />
      <div {...pillTabPanelProps(idPrefix, pane)}>
        {pane === "show" ? show : read}
      </div>
    </div>
  );
};

interface ShowCodeProps {
  value: string;
  caption: string;
}

export const ShowCode = ({ value, caption }: ShowCodeProps) => {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [isCopied, setIsCopied] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const { width: columnWidth } = useElementSize(columnRef);
  const qrSize = Math.round(
    Math.max(MIN_QR_SIZE, Math.min(MAX_QR_SIZE, columnWidth - QR_TILE_PADDING)),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      pushToast("Couldn't copy. Long-press the code to select it.", "error");
    }
  };

  return (
    <div
      ref={columnRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <QrCode value={value} size={qrSize} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: fonts.ui,
          fontSize: 13,
          color: colors.sub,
        }}
      >
        Scan with the other device
        <InfoTip title="Scanning this code" align="center">
          {caption} Hold the code steady in view of the other camera. It does
          not have to fill the scan box.
        </InfoTip>
      </div>
      <Button variant="ghost" size="sm" onClick={copy}>
        {isCopied ? <Check size={14} /> : <Clipboard size={14} />}
        {isCopied ? "Copied" : "Copy code instead"}
      </Button>
    </div>
  );
};

interface ReadCodeProps {
  scanFacing?: ScanFacing;
  scanLabel: string;
  onCode: (text: string) => boolean;
}

export const ReadCode = ({
  scanFacing = "environment",
  scanLabel,
  onCode,
}: ReadCodeProps) => {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [mode, setMode] = useState<"scan" | "paste">("scan");
  const [pastedCode, setPastedCode] = useState("");
  const [scanAttempt, setScanAttempt] = useState(0);

  const handleScan = (text: string) => {
    if (!onCode(text)) setScanAttempt((attempt) => attempt + 1);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="ws-row" style={{ gap: 6 }}>
        <Button
          variant={mode === "scan" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setMode("scan")}
        >
          <QrIcon size={14} />
          Scan code
        </Button>
        <Button
          variant={mode === "paste" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setMode("paste")}
        >
          <Clipboard size={14} />
          Paste code
        </Button>
      </div>

      {mode === "scan" ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <QrScanner
            key={scanAttempt}
            facing={scanFacing}
            onResult={handleScan}
            onError={(message) => {
              pushToast(message, "error");
              setMode("paste");
            }}
          />
          <p
            style={{
              fontFamily: fonts.ui,
              fontSize: 12.5,
              color: colors.dim,
              textAlign: "center",
              margin: 0,
            }}
          >
            <Camera size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {scanLabel}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={pastedCode}
            onChange={(event) => setPastedCode(event.target.value)}
            placeholder="Paste the code the other device shared with you"
            rows={4}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 11,
              borderRadius: 10,
              fontFamily: "monospace",
              fontSize: 12,
              wordBreak: "break-all",
              background: colors.raise,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              outline: "none",
            }}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={!pastedCode.trim()}
            onClick={() => onCode(pastedCode.trim())}
          >
            <Check size={14} />
            Use this code
          </Button>
        </div>
      )}
    </div>
  );
};
