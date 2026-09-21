import { Check, CircleCheck, MonitorSmartphone, Square } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { fade } from "../../../theme/uiTheme";
import { IconButton } from "../../../components/ui/Button";
import { ProgressRing } from "../../../components/ui/ProgressRing";
import { Spinner } from "../../../components/ui/Spinner";
import { formatBytes } from "../../../lib/storageStats";
import {
  isTransferActive,
  transferPercent,
  type OutgoingShare,
  type OutgoingShareMap,
} from "../lib/useOutgoingShares";
import type { ShareDevice } from "../lib/shareSignaling";

interface ShareDeviceListProps {
  devices: ShareDevice[];
  selectedIds: readonly string[];
  /** How far each device has got, keyed by device, so none is listed twice. */
  transfers: OutgoingShareMap;
  isSearching: boolean;
  disabled: boolean;
  onToggle: (deviceId: string) => void;
  onStop: (device: ShareDevice) => void;
}

export const ShareDeviceList = ({
  devices,
  selectedIds,
  transfers,
  isSearching,
  disabled,
  onToggle,
  onStop,
}: ShareDeviceListProps) => {
  const { colors, fonts } = useUITheme();
  const selected = new Set(selectedIds);

  if (devices.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "26px 0",
          textAlign: "center",
        }}
      >
        {isSearching && <Spinner size={20} />}
        <span
          style={{
            fontFamily: fonts.ui,
            fontSize: 13,
            lineHeight: 1.6,
            color: colors.sub,
            maxWidth: 320,
          }}
        >
          {isSearching
            ? "Looking for devices on this WiFi"
            : "No other device is here yet. Open Quick Share on the other device and it appears in this list."}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {devices.map((device) => (
        <ShareDeviceRow
          key={device.id}
          device={device}
          transfer={transfers[device.id]}
          isSelected={selected.has(device.id)}
          disabled={disabled}
          onToggle={() => onToggle(device.id)}
          onStop={() => onStop(device)}
        />
      ))}
    </div>
  );
};

const STATUS_LABEL: Partial<Record<OutgoingShare["state"], string>> = {
  queued: "Waiting",
  connecting: "Connecting",
  asking: "Connecting",
  importing: "Finishing",
  done: "Sent",
};

interface ShareDeviceRowProps {
  device: ShareDevice;
  transfer: OutgoingShare | undefined;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onStop: () => void;
}

const ShareDeviceRow = ({
  device,
  transfer,
  isSelected,
  disabled,
  onToggle,
  onStop,
}: ShareDeviceRowProps) => {
  const { colors, fonts } = useUITheme();
  const isActive = transfer ? isTransferActive(transfer.state) : false;
  const isDone = transfer?.state === "done";
  const isPickable = !transfer && !disabled;
  const highlighted = isSelected && !transfer;

  const status =
    transfer?.state === "sending"
      ? `${formatBytes(transfer.sentBytes)} of ${formatBytes(transfer.totalBytes)}`
      : transfer
        ? (STATUS_LABEL[transfer.state] ?? "")
        : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "11px 12px",
        borderRadius: 12,
        background: highlighted ? fade(colors.accent, 0.12) : colors.bg,
        border: `1px solid ${highlighted ? colors.accent : colors.border}`,
        opacity: disabled && !transfer ? 0.6 : 1,
        transition: "opacity .16s ease",
      }}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={device.name}
        disabled={!isPickable}
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          flex: 1,
          minWidth: 0,
          padding: 0,
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: isPickable ? "pointer" : "default",
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: fade(colors.accent, 0.14),
            color: colors.accentSoft,
          }}
        >
          <MonitorSmartphone size={17} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            className="ws-ellipsis"
            style={{
              display: "block",
              fontFamily: fonts.ui,
              fontSize: 13.5,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            {device.name}
          </span>
          {status && (
            <span
              className="ws-ellipsis"
              style={{
                display: "block",
                marginTop: 2,
                fontFamily: fonts.ui,
                fontSize: 11.5,
                color: isDone ? colors.accentSoft : colors.dim,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {status}
            </span>
          )}
        </span>
        {!transfer && (
          <span
            aria-hidden
            style={{
              width: 20,
              height: 20,
              flexShrink: 0,
              borderRadius: 7,
              display: "grid",
              placeItems: "center",
              background: isSelected ? colors.accent : "transparent",
              border: `1px solid ${isSelected ? colors.accent : colors.borderStrong}`,
              color: colors.onAccent,
            }}
          >
            {isSelected && <Check size={13} strokeWidth={3} />}
          </span>
        )}
      </button>

      {isActive ? (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ProgressRing
            size={26}
            thickness={2.5}
            label={`Sending to ${device.name}`}
            indeterminate={transfer?.state !== "sending"}
            value={transfer ? transferPercent(transfer) : 0}
          />
          <IconButton
            icon={Square}
            size="sm"
            danger
            title={`Stop sending to ${device.name}`}
            onClick={onStop}
          />
        </span>
      ) : isDone ? (
        <CircleCheck
          size={19}
          color={colors.accent}
          style={{ flexShrink: 0 }}
        />
      ) : null}
    </div>
  );
};
