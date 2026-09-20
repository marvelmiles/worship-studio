import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MonitorSmartphone,
  PackageCheck,
  RefreshCw,
  SendHorizontal,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel, PanelTitle } from "../../components/ui/Panel";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Spinner } from "../../components/ui/Spinner";
import { describeSelection, selectionBytes } from "../../lib/backupPayload";
import {
  pickedCount,
  pickedSelection,
  shareCatalog,
  type PickedShareItems,
} from "../../lib/shareCatalog";
import { isSelectionEmpty } from "../../lib/shareSelection";
import { formatBytes } from "../../lib/storageStats";
import { formatCountLabel } from "../../lib/formatNumber";
import { IncomingShareDialog } from "./components/IncomingShareDialog";
import { OutgoingShareList } from "./components/OutgoingShareList";
import { ShareDeviceList } from "./components/ShareDeviceList";
import { ShareItemPicker } from "./components/ShareItemPicker";
import { useBackupSource } from "./lib/useBackupSource";
import { useIncomingShare } from "./lib/useIncomingShare";
import { useOutgoingShares } from "./lib/useOutgoingShares";
import { useShareLobby, type LobbyStatus } from "./lib/useShareLobby";

const SHARE_SUBTITLE =
  "Send your library straight to another device on this WiFi.";

type Step = "devices" | "items";

export const QuickSharePage = () => {
  useDocumentTitle("Quick Share");
  const { colors, fonts } = useUITheme();
  const source = useBackupSource();

  const lobby = useShareLobby();
  const outgoing = useOutgoingShares(
    lobby.room,
    lobby.deviceId,
    lobby.deviceName,
  );
  const incoming = useIncomingShare(lobby.room, lobby.deviceId);

  const [step, setStep] = useState<Step>("devices");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedShareItems>({});

  const tabs = useMemo(() => shareCatalog(source), [source]);
  const selection = useMemo(() => pickedSelection(picked), [picked]);
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

  const toggleDevice = (deviceId: string) =>
    setSelectedDevices((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId],
    );

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
          paddingBottom: 24,
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
                {lobby.deviceName}
              </div>
              <LobbyStatusLine status={lobby.status} />
            </div>
            {(lobby.status === "offline" || lobby.status === "ready") && (
              <Button variant="ghost" size="sm" onClick={lobby.retry}>
                <RefreshCw size={14} />
                Refresh
              </Button>
            )}
          </div>
        </Panel>

        {lobby.status === "unavailable" ? (
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
                devices={lobby.devices}
                selectedIds={selectedDevices}
                isSearching={lobby.status === "starting"}
                disabled={outgoing.isBusy}
                onToggle={toggleDevice}
              />
            </Panel>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                disabled={targets.length === 0}
                onClick={() => setStep("items")}
                title={
                  targets.length === 0
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
          <>
            <Panel>
              <PanelTitle
                icon={PackageCheck}
                title="What to send"
                info="Pick from any tab; what you tick is kept as you move between them. Whatever arrives is merged into the other device's library, so nothing it already has is lost."
                trailing={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={outgoing.isBusy}
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
                  {targets.map((device) => device.name).join(", ") ||
                    "no device yet"}
                </span>
              </p>
              <ShareItemPicker
                tabs={tabs}
                picked={picked}
                disabled={outgoing.isBusy}
                onChange={setPicked}
              />
            </Panel>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 12.5,
                  color: colors.sub,
                }}
              >
                {isSelectionEmpty(selection)
                  ? "Nothing chosen yet."
                  : `${formatCountLabel(pickedCount(picked), "item")} chosen: ${summary}${
                      bytes > 0 ? `, about ${formatBytes(bytes)}` : ""
                    }.`}
              </span>
              <span style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {pickedCount(picked) > 0 && !outgoing.isBusy && (
                  <Button variant="ghost" onClick={() => setPicked({})}>
                    Clear all
                  </Button>
                )}
                <Button
                  variant="primary"
                  disabled={!canSend}
                  busy={outgoing.isBusy}
                  onClick={() => void outgoing.send(targets, selection)}
                  title={
                    canSend
                      ? "Send what you chose to the chosen devices"
                      : "Choose at least one device and one item"
                  }
                >
                  <SendHorizontal size={15} />
                  {targets.length > 1
                    ? `Send to ${targets.length} devices`
                    : "Send"}
                </Button>
              </span>
            </div>

            {outgoing.packing !== null && (
              <Panel>
                <ProgressBar
                  value={outgoing.packing}
                  label="Gathering what you chose"
                />
              </Panel>
            )}

            {outgoing.transfers.length > 0 && (
              <Panel>
                <PanelTitle
                  icon={SendHorizontal}
                  title="Sending"
                  trailing={
                    outgoing.isBusy ? undefined : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={outgoing.clear}
                      >
                        Clear
                      </Button>
                    )
                  }
                />
                <OutgoingShareList transfers={outgoing.transfers} />
              </Panel>
            )}
          </>
        )}
      </div>

      <IncomingShareDialog
        incoming={incoming.incoming}
        onAccept={incoming.accept}
        onDecline={incoming.decline}
        onDismiss={incoming.dismiss}
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
