import { Smartphone, Unplug, Wifi } from "lucide-react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button } from "../../../components/ui/Button";
import { StreamStatusBadge, connectionBadgeStatus } from "../StreamStatusBadge";
import type { DeviceEntry } from "../lib/signaling";
import {
  MAX_STREAM_CAMERAS,
  type StreamCamera,
  type StreamSessionState,
} from "../lib/streamSession";

interface DeviceRowProps {
  device: DeviceEntry;
  camera: StreamCamera | null;
  session: StreamSessionState;
  isFull: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const cameraRole = (session: StreamSessionState, deviceId: string): string => {
  if (session.primaryId === deviceId) return "Main screen";
  if (session.secondaryIds.includes(deviceId)) return "In a corner";
  return "Ready to cut to";
};

export const DeviceRow = ({
  device,
  camera,
  session,
  isFull,
  onConnect,
  onDisconnect,
}: DeviceRowProps) => {
  const { colors, fonts } = useUITheme();
  const isConnected = camera?.status === "live";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${isConnected ? colors.accent : colors.border}`,
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: colors.raise,
          color: colors.accentSoft,
          flexShrink: 0,
        }}
      >
        <Smartphone size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          className="ws-ellipsis"
          style={{
            display: "block",
            fontFamily: fonts.ui,
            fontSize: 14,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {device.name}
        </span>
        {camera && (
          <span
            style={{
              fontFamily: fonts.ui,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: colors.dim,
            }}
          >
            {cameraRole(session, device.id)}
          </span>
        )}
      </span>
      {camera ? (
        <>
          <StreamStatusBadge
            status={connectionBadgeStatus(camera.status, false)}
            size="sm"
          />
          <Button
            variant="danger"
            size="sm"
            title="Disconnect this camera"
            onClick={onDisconnect}
          >
            <Unplug size={14} />
            Drop
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={onConnect}
          disabled={isFull}
          title={
            isFull
              ? `Already holding ${MAX_STREAM_CAMERAS} cameras. Drop one first.`
              : "Connect this camera"
          }
        >
          <Wifi size={14} />
          Connect
        </Button>
      )}
    </div>
  );
};
