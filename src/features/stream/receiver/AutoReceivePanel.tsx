import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyRound, MonitorSmartphone, RotateCcw } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { useStore } from "../../../store/useStore";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";
import { LobbyActions } from "../components/LobbyActions";
import { QuickConnectNote } from "../components/QuickConnectNote";
import { Panel, PanelTitle } from "../../../components/ui/Panel";
import { deriveNetworkRoom } from "../../../lib/networkRoom";
import { watchBroadcasters, type DeviceEntry } from "../lib/signaling";
import {
  canJoinCamera,
  connectStreamCamera,
  disconnectStreamCamera,
  findCamera,
  MAX_STREAM_CAMERAS,
  useStreamSession,
} from "../lib/streamSession";
import { DeviceRow } from "./DeviceRow";

interface AutoReceivePanelProps {
  onBack: () => void;
  onUseCode: () => void;
}

export const AutoReceivePanel = ({
  onBack,
  onUseCode,
}: AutoReceivePanelProps) => {
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const [isSearching, setIsSearching] = useState(true);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const roomRef = useRef<string | null>(null);
  const viewerId = useRef(crypto.randomUUID()).current;
  const wasActiveRef = useRef(session.active);

  useEffect(() => {
    if (wasActiveRef.current && !session.active) {
      setSearchCount((count) => count + 1);
    }
    wasActiveRef.current = session.active;
  }, [session.active]);

  useEffect(() => {
    let isCancelled = false;
    let stopWatching = () => {};
    setIsSearching(true);
    setDevices([]);

    void deriveNetworkRoom().then((room) => {
      if (isCancelled) return;
      if (!room) {
        pushToast("Couldn't detect your network. Use a code instead.", "error");
        onUseCode();
        return;
      }
      roomRef.current = room;
      setIsSearching(false);
      stopWatching = watchBroadcasters(room, (nextDevices) => {
        if (!isCancelled) setDevices(nextDevices);
      });
    });

    return () => {
      isCancelled = true;
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCount]);

  const isFull = session.active && !canJoinCamera(session);

  const connect = (device: DeviceEntry) => {
    const room = roomRef.current;
    if (!room || isFull) return;
    void connectStreamCamera({ room, device, viewerId });
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Panel style={{ padding: 20 }}>
        <PanelTitle
          icon={MonitorSmartphone}
          title="Devices on your WiFi"
          info={`On the other device, open Stream and choose Share this camera. Pick it here, up to ${MAX_STREAM_CAMERAS} in all.`}
        />
        {isSearching ? (
          <WaitingState>Searching for devices</WaitingState>
        ) : devices.length === 0 ? (
          <WaitingState>Waiting for a device to start sharing</WaitingState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                camera={findCamera(session, device.id)}
                session={session}
                isFull={isFull}
                onConnect={() => connect(device)}
                onDisconnect={() => disconnectStreamCamera(device.id)}
              />
            ))}
          </div>
        )}
      </Panel>

      <QuickConnectNote />

      <LobbyActions>
        <Button variant="ghost" size="sm" onClick={onUseCode}>
          <KeyRound size={14} />
          Pair with a code instead
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </LobbyActions>
    </div>
  );
};

const WaitingState = ({ children }: { children: ReactNode }) => {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "28px 0",
      }}
    >
      <Spinner size={20} />
      <span style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}>
        {children}
      </span>
    </div>
  );
};
