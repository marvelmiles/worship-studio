import { useMemo } from "react";
import { RefreshCw, SendHorizontal, Share2, Square } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { Modal } from "../../components/ui/Modal";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { describeSelection, selectionBytes } from "../../lib/backupPayload";
import { selectionFrom, type BackupRecordRef } from "../../lib/shareSelection";
import { formatBytes } from "../../lib/storageStats";
import { ShareDeviceList } from "./components/ShareDeviceList";
import { useBackupSource } from "./lib/useBackupSource";
import { canSendSelection, useQuickShare } from "./lib/useQuickShare";
import { useStopSharePrompt } from "./lib/useStopSharePrompt";

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
  const quickShare = useQuickShare({ announce: false, onSent: onClose });
  const stopPrompt = useStopSharePrompt({
    isBusy: quickShare.isBusy,
    stopDevice: quickShare.stopDevice,
    stopAll: quickShare.stopAll,
    refresh: quickShare.refresh,
  });

  const selection = useMemo(() => selectionFrom(records), [records]);
  const summary = useMemo(
    () => describeSelection(source, selection),
    [selection, source],
  );
  const bytes = useMemo(
    () => selectionBytes(source, selection),
    [selection, source],
  );

  const canSend = canSendSelection(quickShare, selection);
  const isUnavailable = quickShare.status === "unavailable";

  const note = {
    margin: "0 0 12px",
    fontFamily: fonts.ui,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: colors.sub,
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        dismissible={!quickShare.isBusy}
        title="Quick Share"
        width={460}
        headerActions={
          isUnavailable ? undefined : (
            <IconButton
              icon={RefreshCw}
              title="Look again for devices"
              onClick={stopPrompt.askForRefresh}
            />
          )
        }
        footer={
          quickShare.isBusy ? (
            <Button variant="danger" onClick={stopPrompt.askForEverything}>
              <Square size={14} />
              Stop
            </Button>
          ) : (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!canSend}
                onClick={() => void quickShare.send(selection)}
              >
                <SendHorizontal size={15} />
                {quickShare.selectedDeviceIds.length > 1
                  ? `Send to ${quickShare.selectedDeviceIds.length}`
                  : "Send"}
              </Button>
            </>
          )
        }
      >
        <p style={note}>
          Sending <strong style={{ color: colors.text }}>{title}</strong>:{" "}
          {summary}
          {bytes > 0 ? ` (about ${formatBytes(bytes)})` : ""}. Anything it
          needs, such as its background or sound, travels with it.
        </p>

        {isUnavailable ? (
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
              devices={quickShare.devices}
              selectedIds={quickShare.selectedDeviceIds}
              transfers={quickShare.transfers}
              isSearching={quickShare.isSearching}
              disabled={quickShare.isBusy}
              onToggle={quickShare.toggleDevice}
              onStop={stopPrompt.askForDevice}
            />
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={stopPrompt.prompt !== null}
        title={stopPrompt.prompt?.title ?? ""}
        message={stopPrompt.prompt?.message ?? ""}
        confirmLabel={stopPrompt.prompt?.confirmLabel ?? "Stop"}
        onConfirm={stopPrompt.confirm}
        onCancel={stopPrompt.cancel}
      />
    </>
  );
};
