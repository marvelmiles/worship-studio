import { useMemo, useState } from "react";
import { SendHorizontal, Share2 } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { describeSelection, selectionBytes } from "../../lib/backupPayload";
import {
  isSelectionEmpty,
  selectionFrom,
  type BackupRecordRef,
} from "../../lib/shareSelection";
import { formatBytes } from "../../lib/storageStats";
import { OutgoingShareList } from "./components/OutgoingShareList";
import { ShareDeviceList } from "./components/ShareDeviceList";
import { useBackupSource } from "./lib/useBackupSource";
import { useOutgoingShares } from "./lib/useOutgoingShares";
import { useShareLobby } from "./lib/useShareLobby";

interface QuickShareModalProps {
  /** What is being handed over, named by the records behind it. */
  records: BackupRecordRef[];
  title: string;
  onClose: () => void;
}

/**
 * Sends one thing from wherever it is listed. It joins the same network lobby
 * the Quick Share page uses, so the devices offered here are the ones already
 * waiting there.
 */
export const QuickShareModal = ({
  records,
  title,
  onClose,
}: QuickShareModalProps) => {
  const { colors, fonts } = useUITheme();
  const source = useBackupSource();
  const lobby = useShareLobby({ announce: false });
  const outgoing = useOutgoingShares(
    lobby.room,
    lobby.deviceId,
    lobby.deviceName,
  );
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const selection = useMemo(() => selectionFrom(records), [records]);
  const summary = useMemo(
    () => describeSelection(source, selection),
    [selection, source],
  );
  const bytes = useMemo(
    () => selectionBytes(source, selection),
    [selection, source],
  );

  const targets = lobby.devices.filter((device) =>
    selectedDevices.includes(device.id),
  );
  const canSend =
    lobby.status === "ready" &&
    !outgoing.isBusy &&
    targets.length > 0 &&
    !isSelectionEmpty(selection);

  const note = {
    margin: "0 0 12px",
    fontFamily: fonts.ui,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: colors.sub,
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!outgoing.isBusy}
      title="Quick Share"
      width={460}
      footer={
        <>
          <Button onClick={onClose} disabled={outgoing.isBusy}>
            {outgoing.transfers.length > 0 ? "Done" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            disabled={!canSend}
            busy={outgoing.isBusy}
            onClick={() => void outgoing.send(targets, selection)}
          >
            <SendHorizontal size={15} />
            {targets.length > 1 ? `Send to ${targets.length}` : "Send"}
          </Button>
        </>
      }
    >
      <p style={note}>
        Sending <strong style={{ color: colors.text }}>{title}</strong>:{" "}
        {summary}
        {bytes > 0 ? ` (about ${formatBytes(bytes)})` : ""}. Anything it needs,
        such as its background or sound, travels with it.
      </p>

      {lobby.status === "unavailable" ? (
        <p style={{ ...note, marginBottom: 0, color: colors.warning }}>
          Quick share is not set up in this build. Use Export and Import in
          Settings to move data between devices.
        </p>
      ) : (
        <>
          <p style={{ ...note, marginBottom: 8 }}>
            <Share2 size={13} style={{ verticalAlign: "-2px" }} /> The other
            device needs the Quick Share page open.
          </p>
          <ShareDeviceList
            devices={lobby.devices}
            selectedIds={selectedDevices}
            isSearching={lobby.status === "starting"}
            disabled={outgoing.isBusy}
            onToggle={(deviceId) =>
              setSelectedDevices((current) =>
                current.includes(deviceId)
                  ? current.filter((id) => id !== deviceId)
                  : [...current, deviceId],
              )
            }
          />
        </>
      )}

      {outgoing.packing !== null && (
        <ProgressBar value={outgoing.packing} label="Gathering" />
      )}

      {outgoing.transfers.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <OutgoingShareList transfers={outgoing.transfers} />
        </div>
      )}
    </Modal>
  );
};
