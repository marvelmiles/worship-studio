import { Inbox } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { formatBytes } from "../../../lib/storageStats";
import type { IncomingShare } from "../lib/useIncomingShare";

interface IncomingShareDialogProps {
  incoming: IncomingShare | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

const TITLE: Record<IncomingShare["state"], string> = {
  asking: "Incoming library",
  receiving: "Receiving",
  importing: "Adding to your library",
  done: "Received",
  declined: "Turned down",
  failed: "Nothing was added",
};

export const IncomingShareDialog = ({
  incoming,
  onAccept,
  onDecline,
  onDismiss,
}: IncomingShareDialogProps) => {
  const { colors, fonts } = useUITheme();
  if (!incoming) return null;

  const { state, fromName, summary, bytes, receivedBytes, message } = incoming;
  const isAsking = state === "asking";
  const isWorking = state === "receiving" || state === "importing";
  const percent =
    state === "importing"
      ? 100
      : bytes > 0
        ? Math.min(99, Math.round((receivedBytes / bytes) * 100))
        : 0;

  const body = {
    margin: "0 0 12px",
    fontFamily: fonts.ui,
    fontSize: 13.5,
    lineHeight: 1.6,
    color: colors.sub,
  };

  return (
    <Modal
      open
      onClose={isAsking ? onDecline : onDismiss}
      dismissible={!isWorking}
      title={TITLE[state]}
      width={440}
      footer={
        isAsking ? (
          <>
            <Button onClick={onDecline}>Not now</Button>
            <Button variant="primary" onClick={onAccept}>
              Accept
            </Button>
          </>
        ) : isWorking ? undefined : (
          <Button variant="primary" onClick={onDismiss}>
            Done
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
          <p style={body}>
            <strong style={{ color: colors.text }}>{fromName}</strong> is
            sending {summary}
            {bytes > 0 ? ` (${formatBytes(bytes)})` : ""}.
          </p>
          {isAsking && (
            <p style={{ ...body, marginBottom: 0 }}>
              Everything you already have is kept. Where the same item exists on
              both devices, the incoming copy wins.
            </p>
          )}
          {isWorking && (
            <>
              <ProgressBar
                value={percent}
                label={
                  state === "importing" ? "Adding to your library" : "Receiving"
                }
              />
              <p
                style={{
                  ...body,
                  marginTop: 8,
                  marginBottom: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {state === "importing"
                  ? "Keep this page open until it finishes."
                  : `${formatBytes(receivedBytes)} of ${formatBytes(bytes)}`}
              </p>
            </>
          )}
          {!isAsking && !isWorking && message && (
            <p
              style={{
                ...body,
                marginBottom: 0,
                color: state === "done" ? colors.sub : colors.warning,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};
