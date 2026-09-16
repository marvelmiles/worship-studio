import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useQrScanner, type ScanFacing } from "./lib/useQrScanner";

interface QrScannerProps {
  facing?: ScanFacing;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}

export const QrScanner = ({
  facing = "environment",
  onResult,
  onError,
}: QrScannerProps) => {
  const { colors, fonts, stage } = useUITheme();
  const { videoRef, isCameraReady, progress } = useQrScanner({
    facing,
    onResult,
    onError,
  });
  const frameColor = isCameraReady ? colors.accentSoft : fade(stage.text, 0.5);
  const statusText = !isCameraReady
    ? "Starting camera"
    : progress
      ? `Read ${progress.received} of ${progress.total} parts, hold steady`
      : "Looking for a code";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 360,
        aspectRatio: "1 / 1",
        borderRadius: 16,
        overflow: "hidden",
        background: stage.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: facing === "user" ? "scaleX(-1)" : undefined,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "8%",
          borderRadius: 12,
          overflow: "hidden",
          border: `2px solid ${frameColor}`,
          boxShadow: `0 0 0 100vmax ${fade(stage.surface, 0.35)}`,
        }}
      >
        {isCameraReady && (
          <div className="ws-scan-sweep">
            <div
              style={{
                height: 2,
                marginTop: -1,
                background: colors.accentSoft,
                boxShadow: `0 0 12px 3px ${fade(colors.accentSoft, 0.6)}`,
              }}
            />
          </div>
        )}
      </div>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          pointerEvents: "none",
        }}
      >
        {progress && <ScanProgressDots {...progress} />}
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: stage.overlayStrong,
            color: stage.text,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
};

const ScanProgressDots = ({
  received,
  total,
}: {
  received: number;
  total: number;
}) => {
  const { colors, stage } = useUITheme();
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          style={{
            width: 14,
            height: 4,
            borderRadius: 99,
            background:
              index < received ? colors.accentSoft : fade(stage.text, 0.3),
          }}
        />
      ))}
    </div>
  );
};
