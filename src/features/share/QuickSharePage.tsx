import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MonitorSmartphone,
  PackageCheck,
  RefreshCw,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { InfoTip } from "../../components/ui/InfoTip";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel, PanelTitle } from "../../components/ui/Panel";
import { Spinner } from "../../components/ui/Spinner";
import {
  pickedSelection,
  shareCatalog,
  type PickedShareItems,
} from "../../lib/shareCatalog";
import { IncomingShareDialog } from "./components/IncomingShareDialog";
import { ShareDeviceList } from "./components/ShareDeviceList";
import { ShareItemPicker } from "./components/ShareItemPicker";
import { ShareSendFab } from "./components/ShareSendFab";
import { useBackupSource } from "./lib/useBackupSource";
import { useIncomingShare } from "./lib/useIncomingShare";
import { canSendSelection, useQuickShare } from "./lib/useQuickShare";
import { useStopSharePrompt } from "./lib/useStopSharePrompt";
import type { LobbyStatus } from "./lib/useShareLobby";

const SHARE_SUBTITLE =
  "Send your library straight to another device on this WiFi.";

type Step = "devices" | "items";

export const QuickSharePage = () => {
  useDocumentTitle("Quick Share");
  const { colors, fonts } = useUITheme();
  const source = useBackupSource();

  const [step, setStep] = useState<Step>("devices");
  const [picked, setPicked] = useState<PickedShareItems>({});

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
            info="While this page is open, other devices running Quick Share on the same WiFi can see this one and send it data. Close the page and it disappears from their list."
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
        </Panel>

        {quickShare.status === "unavailable" ? (
          <UnavailableNote />
        ) : step === "devices" ? (
          <>
            <Panel>
              <PanelTitle
                icon={MonitorSmartphone}
                title="Devices here now"
                info="Open Quick Share on the other device. It only needs to be on the same WiFi."
              />
              <ShareDeviceList
                devices={quickShare.devices}
                selectedIds={quickShare.selectedDeviceIds}
                transfers={quickShare.transfers}
                isSearching={quickShare.isSearching}
                disabled={quickShare.isBusy}
                onToggle={quickShare.toggleDevice}
                onStop={stopPrompt.askForDevice}
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

      {step === "items" && quickShare.status !== "unavailable" && (
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
    <span style={{ ...style, color: colors.warning }}>
      <WifiOff size={13} />
      {status === "offline"
        ? "Could not read this network. Check the connection and refresh."
        : "Quick share is not set up in this build."}
    </span>
  );
};

const UnavailableNote = () => {
  const { colors, fonts } = useUITheme();
  return (
    <Panel>
      <PanelTitle icon={WifiOff} title="Quick share is unavailable" />
      <p
        style={{
          margin: 0,
          fontFamily: fonts.ui,
          fontSize: 13.5,
          lineHeight: 1.65,
          color: colors.sub,
        }}
      >
        Devices find each other through a short online lookup, and this build
        has no lookup settings. You can still move a library with Export and
        Import in Settings.
      </p>
      <p
        style={{
          margin: "10px 0 0",
          fontFamily: fonts.ui,
          fontSize: 12.5,
          lineHeight: 1.6,
          color: colors.dim,
        }}
      >
        <InfoTip title="Why an online lookup">
          The two devices only use the internet to introduce themselves. The
          data itself travels straight between them over your WiFi.
        </InfoTip>{" "}
        The data never travels through that lookup.
      </p>
    </Panel>
  );
};
