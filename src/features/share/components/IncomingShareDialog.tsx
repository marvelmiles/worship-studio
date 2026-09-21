import { useState } from "react";
import { Inbox, Square } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { formatBytes } from "../../../lib/storageStats";
import type { IncomingShare } from "../lib/useIncomingShare";

interface IncomingShareDialogProps {
  incoming: IncomingShare | null;
  onAccept: () => void;
  onDecline: () => void;
  onStop: () => void;
}

const TITLE: Record<IncomingShare["stage"], string> = {
  asking: "Incoming library",
  receiving: "Receiving",
  importing: "Receiving",
};

export const IncomingShareDialog = ({
  incoming,
  onAccept,
  onDecline,
  onStop,
}: IncomingShareDialogProps) => {
  const { colors, fonts } = useUITheme();
  const [isConfirmingStop, setIsConfirmingStop] = useState(false);
  if (!incoming) return null;

  const { stage, fromName, summary, bytes, receivedBytes } = incoming;
  const isAsking = stage === "asking";
  const percent =
    bytes > 0 ? Math.min(99, Math.round((receivedBytes / bytes) * 100)) : 0;

  const body = {
    margin: "0 0 12px",
    fontFamily: fonts.ui,
    fontSize: 13.5,
    lineHeight: 1.6,
    color: colors.sub,
  };

  return (
    <>
      <Modal
        open
        onClose={isAsking ? onDecline : () => setIsConfirmingStop(true)}
        dismissible={isAsking}
        title={TITLE[stage]}
        width={440}
        footer={
          isAsking ? (
            <>
              <Button onClick={onDecline}>Not now</Button>
              <Button variant="primary" onClick={onAccept}>
                Accept
              </Button>
            </>
          ) : (
            <Button
              variant="danger"
              disabled={stage === "importing"}
              onClick={() => setIsConfirmingStop(true)}
            >
              <Square size={14} />
              Stop
            </Button>
          )
        }
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              background: fade(colors.accent, 0.14),
              color: colors.accentSoft,
            }}
          >
            <Inbox size={19} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ ...body, marginBottom: isAsking ? 12 : 14 }}>
              <strong style={{ color: colors.text }}>{fromName}</strong> is
              sending {summary}
              {bytes > 0 ? ` (${formatBytes(bytes)})` : ""}.
            </p>
            {isAsking ? (
              <p style={{ ...body, marginBottom: 0 }}>
                Everything you already have is kept. Where the same item exists
                on both devices, the incoming copy wins.
              </p>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ProgressRing
                  size={44}
                  thickness={4}
                  value={percent}
                  indeterminate={stage === "importing"}
                  label="Receiving"
                />
                <span
                  style={{
                    fontFamily: fonts.ui,
                    fontSize: 12.5,
                    color: colors.dim,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stage === "importing"
                    ? "Finishing"
                    : `${formatBytes(receivedBytes)} of ${formatBytes(bytes)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={isConfirmingStop}
        title="Stop receiving?"
        message={`Nothing from ${fromName} is added, and your library stays as it is.`}
        confirmLabel="Stop"
        onConfirm={() => {
          setIsConfirmingStop(false);
          onStop();
        }}
        onCancel={() => setIsConfirmingStop(false)}
      />
    </>
  );
};
