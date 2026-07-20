import { useState } from "react";
import { QrCode as QrIcon, Clipboard, Check, Camera } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { QrCode } from "./QrCode";
import { QrScanner } from "./QrScanner";

/**
 * Shows one device's handshake code as a QR *and* as copyable text, so it can
 * travel two ways:
 *  - by camera, when both devices are together (the offline path), or
 *  - by any messaging app, when scanning isn't practical — e.g. a laptop with
 *    no webcam. That paste channel is the internet-based fallback, and it needs
 *    no server of our own.
 */
export function ShowCode({ value, caption }: { value: string; caption: string }) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      pushToast("Couldn't copy. Long-press the code to select it.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <QrCode value={value} />
      <p style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub, textAlign: "center", margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
        {caption}
      </p>
      <Button variant="ghost" size="sm" onClick={copy}>
        {copied ? <Check size={14} /> : <Clipboard size={14} />}
        {copied ? "Copied" : "Copy code instead"}
      </Button>
    </div>
  );
}

/**
 * Reads the other device's code, by scanning its QR or pasting the text it
 * shared. Calls `onCode` with the raw string; the caller decodes and applies.
 */
export function ReadCode({
  scanFacing = "environment",
  scanLabel,
  onCode,
}: {
  scanFacing?: "environment" | "user";
  scanLabel: string;
  onCode: (text: string) => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [mode, setMode] = useState<"scan" | "paste">("scan");
  const [pasted, setPasted] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="ws-row" style={{ gap: 6 }}>
        <Button variant={mode === "scan" ? "primary" : "ghost"} size="sm" onClick={() => setMode("scan")}>
          <QrIcon size={14} />
          Scan code
        </Button>
        <Button variant={mode === "paste" ? "primary" : "ghost"} size="sm" onClick={() => setMode("paste")}>
          <Clipboard size={14} />
          Paste code
        </Button>
      </div>

      {mode === "scan" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <QrScanner
            facing={scanFacing}
            onResult={onCode}
            onError={(m) => {
              pushToast(m, "error");
              setMode("paste");
            }}
          />
          <p style={{ fontFamily: fonts.ui, fontSize: 12.5, color: colors.dim, textAlign: "center", margin: 0 }}>
            <Camera size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {scanLabel}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
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
            disabled={!pasted.trim()}
            onClick={() => onCode(pasted.trim())}
          >
            <Check size={14} />
            Use this code
          </Button>
        </div>
      )}
    </div>
  );
}
