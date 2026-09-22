import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MonitorSmartphone,
  PackageCheck,
  QrCode,
  RefreshCw,
  ScanLine,
  Share2,
  Unlink,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Button, IconButton } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel, PanelTitle } from "../../components/ui/Panel";
import { Spinner } from "../../components/ui/Spinner";
import {
  pickedSelection,
  shareCatalog,
  type PickedShareItems,
} from "../../lib/shareCatalog";
import { IncomingShareDialog } from "./components/IncomingShareDialog";
import { PairDeviceDialog } from "./components/PairDeviceDialog";
import { ReceiveCodeDialog } from "./components/ReceiveCodeDialog";
import { ShareDeviceList } from "./components/ShareDeviceList";
import { ShareItemPicker } from "./components/ShareItemPicker";
import { ShareSendFab } from "./components/ShareSendFab";
import { useBackupSource } from "./lib/useBackupSource";
import { useIncomingShare } from "./lib/useIncomingShare";
import { canSendSelection, useQuickShare } from "./lib/useQuickShare";
import { useStopSharePrompt } from "./lib/useStopSharePrompt";
import { deviceListHint, type LobbyStatus } from "./lib/useShareLobby";
import type { PairedSender } from "./lib/useIncomingShare";

const SHARE_SUBTITLE =
  "Send your library straight to another device on this WiFi, with or without internet.";

type Step = "devices" | "items";

export const QuickSharePage = () => {
  useDocumentTitle("Quick Share");
  const { colors, fonts } = useUITheme();
  const source = useBackupSource();

  const [step, setStep] = useState<Step>("devices");
  const [picked, setPicked] = useState<PickedShareItems>({});
  const [isPairing, setIsPairing] = useState(false);
  const [isReceivingCode, setIsReceivingCode] = useState(false);

  const startOver = () => {
    setPicked({});
    setStep("devices");
  };
  const quickShare = useQuickShare({ onSent: startOver, onReset: startOver });
  const incoming = useIncomingShare(quickShare.room, quickShare.deviceId);
  const stopPrompt = useStopSharePrompt({
    isBusy: quickShare.isBusy,
    stopDevice: quickShare.stopDevice,
    stopAll: quickShare.stopAll,
    refresh: quickShare.refresh,
  });

  const tabs = useMemo(() => shareCatalog(source), [source]);
  const selection = useMemo(() => pickedSelection(picked), [picked]);
  const canSend = canSendSelection(quickShare, selection);

  const targetNames = quickShare.devices
    .filter((device) => quickShare.selectedDeviceIds.includes(device.id))
    .map((device) => device.name)
    .join(", ");

  return (
    <div className="ws-page">
      <PageHeader title="Quick Share" subtitle={SHARE_SUBTITLE} />

      <div
        style={{
          maxWidth: step === "items" ? 860 : 620,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          paddingBottom: 96,
        }}
      >
        <Panel>
          <PanelTitle
            icon={Share2}
            title="This device"
            info="While this page is open, other devices running Quick Share on the same WiFi can see this one and send it data. With no internet, choose Receive with a code and read the sending device's code instead. Close the page and it disappears from their list."
          />
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <DeviceBadge />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="ws-ellipsis"
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {quickShare.deviceName}
              </div>
              <LobbyStatusLine status={quickShare.status} />
            </div>
          </div>
          <div
            className="ws-row"
            style={{ gap: 6, marginTop: 12, flexWrap: "wrap" }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReceivingCode(true)}
            >
              <ScanLine size={14} />
              Receive with a code
            </Button>
            {quickShare.status !== "unavailable" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={stopPrompt.askForRefresh}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
            )}
          </div>
          <PairedSenderList
            senders={incoming.pairedSenders}
            onDisconnect={incoming.disconnectSender}
          />
        </Panel>

        {step === "devices" ? (
          <>
            <Panel>
              <PanelTitle
                icon={MonitorSmartphone}
                title="Devices here now"
                info="Open Quick Share on the other device. With internet, devices on the same WiFi show up here on their own. Without it, pair with a code: the two devices only need the same WiFi or hotspot, and nothing leaves it."
                trailing={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={quickShare.isBusy}
                    onClick={() => setIsPairing(true)}
                  >
                    <QrCode size={14} />
                    Pair with a code
                  </Button>
                }
              />
              <ShareDeviceList
                devices={quickShare.devices}
                selectedIds={quickShare.selectedDeviceIds}
                transfers={quickShare.transfers}
                isSearching={quickShare.isSearching}
                emptyHint={deviceListHint(quickShare.status)}
                disabled={quickShare.isBusy}
                onToggle={quickShare.toggleDevice}
                onStop={stopPrompt.askForDevice}
                onForget={(device) => quickShare.forgetDevice(device.id)}
              />
            </Panel>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                disabled={quickShare.selectedDeviceIds.length === 0}
                onClick={() => setStep("items")}
                title={
                  quickShare.selectedDeviceIds.length === 0
                    ? "Choose at least one device first"
                    : "Choose what to send them"
                }
              >
                Choose what to send
                <ArrowRight size={15} />
              </Button>
            </div>
          </>
        ) : (
          <Panel>
            <PanelTitle
              icon={PackageCheck}
              title="What to send"
              info="Pick from any module; what you tick is kept as you move between them. Whatever arrives is merged into the other device's library, so nothing it already has is lost."
              trailing={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("devices")}
                >
                  <ArrowLeft size={14} />
                  Devices
                </Button>
              }
            />
            <p
              style={{
                margin: "0 0 12px",
                fontFamily: fonts.ui,
                fontSize: 12.5,
                color: colors.dim,
              }}
            >
              Sending to{" "}
              <span style={{ color: colors.text }}>
                {targetNames || "no device yet"}
              </span>
            </p>
            <ShareItemPicker
              tabs={tabs}
              picked={picked}
              disabled={quickShare.isBusy}
              onChange={setPicked}
            />
          </Panel>
        )}
      </div>

      {step === "items" && (
        <ShareSendFab
          canSend={canSend}
          isBusy={quickShare.isBusy}
          progress={quickShare.progress}
          onSend={() => void quickShare.send(selection)}
          onStop={stopPrompt.askForEverything}
        />
      )}

      <ConfirmDialog
        open={stopPrompt.prompt !== null}
        title={stopPrompt.prompt?.title ?? ""}
        message={stopPrompt.prompt?.message ?? ""}
        confirmLabel={stopPrompt.prompt?.confirmLabel ?? "Stop"}
        onConfirm={stopPrompt.confirm}
        onCancel={stopPrompt.cancel}
      />

      <PairDeviceDialog
        open={isPairing}
        deviceName={quickShare.deviceName}
        onClose={() => setIsPairing(false)}
        onPaired={(device) => quickShare.selectDevice(device.id)}
      />

      <ReceiveCodeDialog
        open={isReceivingCode}
        deviceName={quickShare.deviceName}
        onClose={() => setIsReceivingCode(false)}
        onConnected={incoming.adoptPairedLink}
      />

      <IncomingShareDialog
        incoming={incoming.incoming}
        onAccept={incoming.accept}
        onDecline={incoming.decline}
        onStop={incoming.stop}
      />
    </div>
  );
};

const DeviceBadge = () => {
  const { colors } = useUITheme();
  return (
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
      <MonitorSmartphone size={19} />
    </span>
  );
};

const LobbyStatusLine = ({ status }: { status: LobbyStatus }) => {
  const { colors, fonts } = useUITheme();
  const style = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.dim,
  };

  if (status === "starting") {
    return (
      <span style={style}>
        <Spinner size={12} />
        Joining this network
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span style={{ ...style, color: colors.accentSoft }}>
        <Wifi size={13} />
        Visible to other devices here
      </span>
    );
  }
  return (
    <span style={style}>
      <WifiOff size={13} />
      {status === "offline"
        ? "No internet. Pair with a code to share over this WiFi."
        : "Pair with a code to share over this WiFi."}
    </span>
  );
};

interface PairedSenderListProps {
  senders: PairedSender[];
  onDisconnect: (senderId: string) => void;
}

const PairedSenderList = ({ senders, onDisconnect }: PairedSenderListProps) => {
  const { colors, fonts } = useUITheme();
  if (senders.length === 0) return null;
  return (
    <ul
      aria-label="Devices paired with a code"
      style={{
        listStyle: "none",
        margin: "12px 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {senders.map((sender) => (
        <li
          key={sender.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 6px 6px 11px",
            borderRadius: 10,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            fontFamily: fonts.ui,
            fontSize: 12.5,
            color: colors.sub,
          }}
        >
          <span className="ws-ellipsis" style={{ flex: 1, minWidth: 0 }}>
            Can receive from{" "}
            <span style={{ color: colors.text, fontWeight: 600 }}>
              {sender.name}
            </span>
          </span>
          <IconButton
            icon={Unlink}
            size="sm"
            title={`Disconnect ${sender.name}`}
            onClick={() => onDisconnect(sender.id)}
          />
        </li>
      ))}
    </ul>
  );
};
