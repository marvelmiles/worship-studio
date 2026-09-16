import { useRef, useState } from "react";
import { QrCode as QrIcon, Clipboard, Check, Camera } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useElementSize } from "../../hooks/useElementSize";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import { QrCode } from "./QrCode";
import { QrScanner } from "./QrScanner";
import type { ScanFacing } from "./lib/useQrScanner";

const MAX_QR_SIZE = 420;
const MIN_QR_SIZE = 240;
const QR_TILE_PADDING = 34;
const COPIED_FEEDBACK_MS = 1600;

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
