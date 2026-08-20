import { useState } from "react";
import {
  ArrowRight,
  Layers,
  MonitorSmartphone,
  Radio,
  ShieldAlert,
  Video,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { ReceiverLobby } from "./ReceiverPanel";
import { SenderLobby } from "./SenderPanel";
import { CameraPanel } from "./CameraPanel";
import { StreamOverlayPanel } from "./StreamOverlayPanel";
import {
  selectStreamOverlay,
  useSelectedStreamOverlayId,
  useStreamOverlays,
} from "./lib/streamOverlayStore";
import { useStreamSession } from "./lib/streamSession";

type Role = "choose" | "receive" | "send";

/**
 * Internal camera streaming over the local WiFi, browser only. Either device
 * can play either role: one shows an incoming camera and can project it, the
 * other shares its own camera. They pair automatically on the same WiFi, or by
 * scanning a QR code, or by pasting a code shared through any app. Nothing
 * leaves the local network once connected.
 */
export function StreamPage() {
  useDocumentTitle("Stream · WorshipStudio");
  const { colors, fonts } = useUITheme();
  const [role, setRole] = useState<Role>("choose");

  // getUserMedia and WebRTC both require a secure context. localhost counts;
  // a plain http:// LAN address does not, so say so plainly instead of failing
  // deep inside the camera call.
  if (!window.isSecureContext) {
    return (
      <div className="ws-page">
        <PageHeader
          title="Stream"
          subtitle="Share a camera between devices over your WiFi."
        />
        <div
          style={{
            maxWidth: 560,
            margin: "40px auto 0",
            background: colors.raise,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <ShieldAlert
            size={30}
            color={colors.danger}
            style={{ marginBottom: 12 }}
          />
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 18,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Streaming needs a secure connection
          </div>
          <p
            style={{
              fontFamily: fonts.ui,
              fontSize: 13.5,
              color: colors.sub,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Cameras only open on an <strong>https://</strong> address (or
            localhost). Open this app over https on both devices and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page">
      <PageHeader
        title="Stream"
        subtitle="Share a camera between devices over your WiFi, then project it on a display."
      />

      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20 }}
      >
        {role === "choose" && (
          <div
            style={{
              maxWidth: 720,
              margin: "10px auto 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 16,
            }}
          >
            <RoleCard
              icon={MonitorSmartphone}
              title="Show a camera here"
              body="This device receives another device's camera and can project it on a display."
              cta="Receive a camera"
              onClick={() => setRole("receive")}
            />
            <RoleCard
              icon={Radio}
              title="Share this camera"
              body="This device sends its own camera to another device to be shown or projected."
              cta="Share this camera"
              onClick={() => setRole("send")}
            />
          </div>
        )}

        {role === "receive" && (
          <ReceiverLobby onBack={() => setRole("choose")} />
        )}
        {role === "send" && <SenderLobby onBack={() => setRole("choose")} />}

        <BroadcastCamerasSection />
        <BroadcastOverlaysSection />
      </div>
    </div>
  );
}

/**
 * The camera roster on the Stream page itself.
 *
 * Shown for the same reason the overlay controls below it are: once the
 * broadcast has been popped out to the floating window, this page is where the
 * operator is standing, and deciding which of the joined cameras fills the
 * screen should not mean maximising the stage back over their work first.
 */
function BroadcastCamerasSection() {
  const { colors, fonts } = useUITheme();
  const session = useStreamSession();

  if (!session.active || session.mode !== "pip") return null;

  return (
    <section
      style={{
        maxWidth: 560,
        margin: "22px auto 0",
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
        <Video size={18} color={colors.accentSoft} />
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 17,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          Live cameras
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
        One camera fills the screen. Any other joined camera can sit in a corner
        of it or wait off screen, ready to be cut to without a reconnection.
      </p>
      <CameraPanel />
    </section>
  );
}

/**
 * The overlay controls on the Stream page itself.
 *
 * Shown only once the camera has been popped out to the floating PiP, which is
 * the state in which the operator is using the rest of the app while the
 * broadcast runs. With the full-screen stage up it covers this page anyway, and
 * its own drawer is the copy in reach, so rendering a second one underneath
 * would only give the same controls two competing selections.
 */
function BroadcastOverlaysSection() {
  const { colors, fonts } = useUITheme();
  const session = useStreamSession();
  const overlays = useStreamOverlays();
  const selectedId = useSelectedStreamOverlayId();

  if (!session.active || session.mode !== "pip") return null;

  return (
    <section
      style={{
        maxWidth: 560,
        margin: "22px auto 0",
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
        <Layers size={18} color={colors.accentSoft} />
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 17,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          On the broadcast
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
        Elements you add are staged first, so nothing reaches the broadcast
        until you show it. Maximise the floating window to drag them into place,
        then put them on air when they are ready. Changes to something already
        on air wait for Apply now, unless you switch that element to auto sync.
      </p>
      <StreamOverlayPanel
        overlays={overlays}
        selectedId={selectedId}
        onSelect={selectStreamOverlay}
      />
    </section>
  );
}

function RoleCard({
  icon: Icon,
  title,
  body,
  cta,
  onClick,
}: {
  icon: typeof Radio;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  const { colors, fonts } = useUITheme();
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        cursor: "pointer",
        background: colors.raise,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          color: colors.accentSoft,
        }}
      >
        <Icon size={22} />
      </span>
      <span
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: fonts.ui,
          fontSize: 13,
          color: colors.sub,
          lineHeight: 1.55,
          flex: 1,
        }}
      >
        {body}
      </span>
      <span
        style={{
          fontFamily: fonts.ui,
          fontSize: 13.5,
          fontWeight: 700,
          color: colors.accentSoft,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {cta}
        <ArrowRight size={15} />
      </span>
    </button>
  );
}
