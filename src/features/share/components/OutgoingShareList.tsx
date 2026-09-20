import { AlertTriangle, CircleCheck, MonitorSmartphone } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { ProgressBar } from "../../../components/ui/ProgressBar";
import { formatBytes } from "../../../lib/storageStats";
import type { OutgoingShare } from "../lib/useOutgoingShares";

const STATE_LABEL: Record<OutgoingShare["state"], string> = {
  queued: "Waiting its turn",
  connecting: "Connecting",
  asking: "Waiting for them to accept",
  sending: "Sending",
  importing: "They are taking it in",
  done: "Sent",
  declined: "Declined",
  failed: "Did not go through",
};

const isFinished = (state: OutgoingShare["state"]): boolean =>
  state === "done" || state === "declined" || state === "failed";

export const OutgoingShareList = ({
  transfers,
}: {
  transfers: OutgoingShare[];
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    {transfers.map((transfer) => (
      <OutgoingRow key={transfer.deviceId} transfer={transfer} />
    ))}
  </div>
);

const OutgoingRow = ({ transfer }: { transfer: OutgoingShare }) => {
  const { colors, fonts } = useUITheme();
  const { state, sentBytes, totalBytes } = transfer;
  const percent =
    state === "done"
      ? 100
      : totalBytes > 0
        ? Math.min(99, Math.round((sentBytes / totalBytes) * 100))
        : 0;
  const tone =
    state === "done"
      ? colors.accent
      : state === "failed"
        ? colors.danger
        : colors.sub;

  return (
    <div
      style={{
        padding: "11px 13px",
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <MonitorSmartphone
          size={15}
          color={colors.accentSoft}
          style={{ flexShrink: 0 }}
        />
        <span
          className="ws-ellipsis"
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: fonts.ui,
            fontSize: 13,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {transfer.name}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            fontWeight: 600,
            color: tone,
          }}
        >
          {state === "done" && <CircleCheck size={13} />}
          {state === "failed" && <AlertTriangle size={13} />}
          {STATE_LABEL[state]}
        </span>
      </div>

      {state === "sending" && (
        <>
          <ProgressBar value={percent} />
          <div
            style={{
              marginTop: 6,
              fontFamily: fonts.ui,
              fontSize: 11.5,
              color: colors.dim,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatBytes(sentBytes)} of {formatBytes(totalBytes)}
          </div>
        </>
      )}

      {isFinished(state) && transfer.message && (
        <div
          style={{
            marginTop: 6,
            fontFamily: fonts.ui,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: state === "done" ? colors.dim : colors.warning,
          }}
        >
          {transfer.message}
        </div>
      )}
    </div>
  );
};
