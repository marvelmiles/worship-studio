import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyRound,
  MonitorSmartphone,
  RotateCcw,
  Smartphone,
  Unplug,
  Wifi,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  createReceiver,
  type PeerStatus,
  type ReceiverHandle,
} from "./lib/peer";
import { decodeSignal, encodeSignal } from "./lib/streamSignal";
import { signalingConfigured } from "./lib/firebase";
import { deriveNetworkRoom } from "./lib/room";
import { watchBroadcasters, type DeviceEntry } from "./lib/signaling";
import {
  adoptStreamCamera,
  canJoinCamera,
  connectStreamCamera,
  disconnectStreamCamera,
  findCamera,
  MAX_STREAM_CAMERAS,
  updateStreamCamera,
  useStreamSession,
} from "./lib/streamSession";
import { ShowCode, ReadCode } from "./CodeExchange";

/**
 * Laptop side — the receiving lobby. With a signalling backend configured it
 * defaults to a live list of phones broadcasting on the same WiFi — tap one to
 * go live and project it, no codes. The QR / paste pairing stays available as an
 * offline fallback.
 *
 * On stop or disconnect the active flow lands back in a fresh lobby: the one-tap
 * list re-searches the network (driven by the app-wide session ending), and the
 * QR flow remounts a fresh invite (via a bumped `key`). `onBack` leaves the lobby
 * for the choose screen.
 */
export function ReceiverLobby({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"auto" | "manual">(
    signalingConfigured ? "auto" : "manual",
  );
  const [resetNonce, setResetNonce] = useState(0);
  const reset = useCallback(() => setResetNonce((n) => n + 1), []);

  if (mode === "auto") {
    return (
      <AutoReceivePanel onBack={onBack} onUseCode={() => setMode("manual")} />
    );
  }
  return (
    <ManualReceiverPanel
      key={`manual-${resetNonce}`}
      onBack={onBack}
      onReset={reset}
      onUseOneTap={signalingConfigured ? () => setMode("auto") : undefined}
    />
  );
}

/* ------------------------------- One-tap receive -------------------------- */

function AutoReceivePanel({
  onBack,
  onUseCode,
}: {
  onBack: () => void;
  onUseCode: () => void;
}) {
  const { colors, fonts } = useUITheme();
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const [finding, setFinding] = useState(true);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [researchNonce, setResearchNonce] = useState(0);
  const roomRef = useRef<string | null>(null);
  const viewerId = useRef(crypto.randomUUID()).current;

  // When a connected device drops or is stopped, the session ends. Search the
  // network again from scratch so the list is fresh before the operator picks
  // another device, rather than leaving a stale entry behind.
  const wasActive = useRef(session.active);
  useEffect(() => {
    if (wasActive.current && !session.active) setResearchNonce((n) => n + 1);
    wasActive.current = session.active;
  }, [session.active]);

  useEffect(() => {
    let cancelled = false;
    let unwatch = () => {};
    setFinding(true);
    setDevices([]);

    deriveNetworkRoom().then((room) => {
      if (cancelled) return;
      if (!room) {
        pushToast("Couldn't detect your network. Use a code instead.", "error");
        onUseCode();
        return;
      }
      roomRef.current = room;
      setFinding(false);
      unwatch = watchBroadcasters(room, (list) => {
        if (!cancelled) setDevices(list);
      });
    });

    // Only the device watch is torn down here — the live connection lives in the
    // app-wide session, so leaving this panel never drops an active projection.
    return () => {
      cancelled = true;
      unwatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchNonce]);

  const full = session.active && !canJoinCamera(session);

  const connect = (device: DeviceEntry) => {
    const room = roomRef.current;
    if (!room || full) return;
    void connectStreamCamera({ room, device, viewerId });
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div
        style={{
          background: colors.raise,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 6,
          }}
        >
          <MonitorSmartphone size={18} color={colors.accentSoft} />
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            Devices on your WiFi
          </span>
        </div>
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 13,
            color: colors.sub,
            margin: "0 0 16px",
            lineHeight: 1.5,
          }}
        >
          On the other device, open Stream and choose Share this camera. It
          appears here. Pick one to show it, and up to {MAX_STREAM_CAMERAS} in
          all: the first fills the screen, the rest wait to be cut to or placed
          in a corner of it.
        </p>

        {finding ? (
          <Centered>
            <Spinner size={20} />
            <span
              style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}
            >
              Searching for devices…
            </span>
          </Centered>
        ) : devices.length === 0 ? (
          <Centered>
            <Spinner size={20} />
            <span
              style={{ fontFamily: fonts.ui, fontSize: 13, color: colors.sub }}
            >
              Waiting for a device to start sharing…
            </span>
          </Centered>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {devices.map((d) => {
              const camera = findCamera(session, d.id);
              const isConnecting = camera?.status === "connecting";
              const isConnected = camera?.status === "live";
              const role = !camera
                ? ""
                : session.primaryId === d.id
                  ? "Main screen"
                  : session.secondaryIds.includes(d.id)
                    ? "In a corner"
                    : "Ready to cut to";
              return (
                <div
                  key={d.id}
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
                      {d.name}
                    </span>
                    {role && (
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
                        {role}
                      </span>
                    )}
                  </span>
                  {camera ? (
                    <>
                      <Button variant="ghost" size="sm" disabled>
                        {isConnecting ? (
                          <Spinner size={14} />
                        ) : (
                          <Wifi size={14} />
                        )}
                        {isConnecting ? "Connecting…" : "Connected"}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        title="Disconnect this camera"
                        onClick={() => disconnectStreamCamera(d.id)}
                      >
                        <Unplug size={14} />
                        Drop
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => connect(d)}
                      disabled={full}
                      title={
                        full
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
            })}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          justifyContent: "center",
        }}
      >
        <Button variant="ghost" size="sm" onClick={onUseCode}>
          <KeyRound size={14} />
          Pair with a code instead
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}

/* ------------------------------- QR / code pairing ------------------------ */

/**
 * Laptop side, offline pairing. Publishes an invite QR for the phone, takes the
 * phone's reply, then projects the incoming camera. Works with no internet.
 */
function ManualReceiverPanel({
  onBack,
  onReset,
  onUseOneTap,
}: {
  onBack: () => void;
  onReset: () => void;
  onUseOneTap?: () => void;
}) {
  const pushToast = useStore((s) => s.pushToast);
  const session = useStreamSession();
  const [invite, setInvite] = useState("");
  const [status, setStatus] = useState<PeerStatus>("idle");
  const handleRef = useRef<ReceiverHandle | null>(null);
  const statusRef = useRef<PeerStatus>("idle");
  const wasLiveRef = useRef(false);
  // The identity this connection will carry in the shared session. Minted up
  // front, because the callbacks that report the camera's state are wired
  // before there is a session camera to report it to.
  const cameraId = useRef(`paired-${crypto.randomUUID()}`).current;
  const adoptedRef = useRef(false);
  const paired = Boolean(findCamera(session, cameraId));

  useEffect(() => {
    let mounted = true;

    // Every report reaches the session only once the camera has been handed
    // over: until then there is no session camera to patch.
    const report = (patch: Parameters<typeof updateStreamCamera>[1]) => {
      if (mounted && adoptedRef.current) updateStreamCamera(cameraId, patch);
    };

    createReceiver({
      // The picture arriving is what makes this a camera worth showing, so it
      // is the moment the session takes it over: from here the stage, the
      // floating window, the roster and the previews all see it, and this panel
      // stops being the only place it exists.
      onStream: (stream) => {
        if (!mounted) return;
        if (adoptedRef.current) {
          updateStreamCamera(cameraId, { stream });
          return;
        }
        const connection = handleRef.current;
        if (!connection) return;
        const handedOver = adoptStreamCamera({
          deviceId: cameraId,
          deviceName: PAIRED_CAMERA_NAME,
          handle: connection,
          stream,
          status: statusRef.current,
        });
        if (handedOver) adoptedRef.current = true;
        else
          pushToast(
            `Already holding ${MAX_STREAM_CAMERAS} cameras. Drop one first.`,
            "error",
          );
      },
      onStatus: (next) => {
        if (!mounted) return;
        statusRef.current = next;
        setStatus(next);
        report({ status: next });
      },
      onAudioShared: (audioShared) => report({ audioShared }),
      onDeviceName: (deviceName) => report({ deviceName }),
    })
      .then((receiver) => {
        if (!mounted) {
          receiver.close();
          return;
        }
        handleRef.current = receiver;
        setInvite(encodeSignal("offer", receiver.invite));
      })
      .catch(() =>
        pushToast("Couldn't start the receiver on this device.", "error"),
      );

    return () => {
      mounted = false;
      // An adopted connection belongs to the session now, which closes it with
      // the camera. Closing it here as well would drop a live feed the moment
      // the operator navigated away from this page.
      if (!adoptedRef.current) handleRef.current?.close();
    };
  }, [cameraId, pushToast]);

  // Toast once when a live connection drops, so the operator knows why the feed
  // froze even before they read the on-surface message.
  useEffect(() => {
    if (status === "live") wasLiveRef.current = true;
    if (status === "failed" && wasLiveRef.current) {
      wasLiveRef.current = false;
      pushToast("The camera stopped sharing.", "error");
    }
  }, [status, pushToast]);

  // The camera was dropped from the session (Stop, or disconnected from the
  // roster). This invite has been answered and cannot be reused, so the panel
  // starts over with a fresh one rather than showing a spent code.
  useEffect(() => {
    if (adoptedRef.current && !paired) onReset();
  }, [paired, onReset]);

  const applyReply = (text: string) => {
    const parsed = decodeSignal(text);
    if (!parsed || parsed.kind !== "answer") {
      pushToast(
        "That doesn't look like a reply code from the other device.",
        "error",
      );
      return;
    }
    void handleRef.current
      ?.accept(parsed.sdp)
      .catch(() => pushToast("Couldn't complete the connection.", "error"));
  };

  // Handed over: the stage (or the floating window) is showing this camera from
  // the app root. What is left here is the roster, so another device can be
  // paired into the same broadcast without leaving the page.
  if (paired) {
    return (
      <PairedPanel
        canPairAnother={canJoinCamera(session)}
        onPairAnother={onReset}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        <Step n={1} title="Show this to the other device">
          {invite ? (
            <ShowCode
              value={invite}
              caption="On the other device: open this app, go to Stream, choose Share this camera, then scan this code or paste it."
            />
          ) : (
            <div style={{ padding: 30, display: "grid", placeItems: "center" }}>
              <Spinner size={22} />
            </div>
          )}
        </Step>

        <Step n={2} title="Then read its reply">
          <ReadCode
            scanFacing="user"
            scanLabel="Hold the other device's reply code up to this camera."
            onCode={applyReply}
          />
          <StatusLine status={status} />
        </Step>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        {onUseOneTap && (
          <Button variant="ghost" size="sm" onClick={onUseOneTap}>
            <MonitorSmartphone size={14} />
            Quick connect
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>
    </div>
  );
}

/**
 * What a code-paired camera is called until it says otherwise. The one-tap flow
 * reads a name off the device list it picked from; this one has no list, so the
 * sender announces itself over the control channel once connected and this is
 * only what fills the gap in between.
 */
const PAIRED_CAMERA_NAME = "Paired camera";

/**
 * What is left on the page once the paired camera has been handed to the shared
 * session: the way back to pairing another device, and nothing else. The camera
 * itself is on the stage or in the floating window, both rendered at the app
 * root, and its roster lives with them rather than being repeated here.
 */
function PairedPanel({
  canPairAnother,
  onPairAnother,
  onBack,
}: {
  canPairAnother: boolean;
  onPairAnother: () => void;
  onBack: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div
        style={{
          background: colors.raise,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 6,
          }}
        >
          <Wifi size={18} color={colors.accentSoft} />
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            Paired
          </span>
        </div>
        <p
          style={{
            fontFamily: fonts.ui,
            fontSize: 13,
            color: colors.sub,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          The camera is on the stage. Pop the stage out to keep working in the
          app while it runs, and pair up to {MAX_STREAM_CAMERAS} devices in all.
        </p>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          justifyContent: "center",
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={!canPairAnother}
          onClick={onPairAnother}
          title={
            canPairAnother
              ? "Show a new code for another device"
              : `Already holding ${MAX_STREAM_CAMERAS} cameras. Drop one first.`
          }
        >
          <KeyRound size={14} />
          Pair another camera
        </Button>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <RotateCcw size={14} />
          Back
        </Button>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <div
      style={{
        background: colors.raise,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: colors.accent,
            color: "#fff",
            fontFamily: fonts.ui,
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          {n}
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function StatusLine({ status }: { status: PeerStatus }) {
  const { colors, fonts } = useUITheme();
  if (status === "idle" || status === "gathering" || status === "waiting")
    return null;
  const label =
    status === "connecting"
      ? "Connecting to the other device…"
      : status === "failed"
        ? "Connection failed. Try the code again."
        : "";
  if (!label) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
        fontFamily: fonts.ui,
        fontSize: 13,
        color: status === "failed" ? colors.danger : colors.sub,
      }}
    >
      {status === "connecting" && <Spinner size={14} />}
      {label}
    </div>
  );
}
