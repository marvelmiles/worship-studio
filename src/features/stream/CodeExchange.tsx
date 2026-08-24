import { useRef, useState } from "react";
import { QrCode as QrIcon, Clipboard, Check, Camera } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useElementSize } from "../../hooks/useElementSize";
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
/**
 * The handshake code is dense enough that how big it is drawn decides whether
 * the other device's camera can read it at all, so it takes as much of the
 * screen as the layout can spare rather than a fixed thumbnail.
 */
const MAX_QR_SIZE = 420;
const MIN_QR_SIZE = 240;
/** The white tile's own padding, which the code must not be sized into. */
const QR_TILE_PADDING = 24;

export function ShowCode({
  value,
  caption,
}: {
  value: string;
  caption: string;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);
  // Measured from the column it sits in rather than the window: this card is
  // one of two beside each other on a laptop and the only thing on screen on a
  // phone, and the code should fill whichever of those it is given.
  const columnRef = useRef<HTMLDivElement>(null);
  const { width: columnWidth } = useElementSize(columnRef);
  const qrSize = Math.round(
    Math.max(MIN_QR_SIZE, Math.min(MAX_QR_SIZE, columnWidth - QR_TILE_PADDING)),
  );

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
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: colors.sub,
          textAlign: "center",
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        {caption}
      </p>
      <p
        style={{
          fontFamily: fonts.ui,
          fontSize: 12,
          color: colors.dim,
          textAlign: "center",
          margin: 0,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        Hold the other device close enough that the code fills its viewfinder,
        and keep both still until it reads.
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
            facing={scanFacing}
            onResult={onCode}
            onError={(m) => {
              pushToast(m, "error");
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
