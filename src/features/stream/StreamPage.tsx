import { useState } from "react";
import {
  ArrowRight,
  MonitorSmartphone,
  Radio,
  ShieldAlert,
  Video,
} from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { ReceiverLobby } from "./receiver/ReceiverLobby";
import { SenderLobby } from "./sender/SenderLobby";
import { CameraPanel } from "./CameraPanel";
import { useStreamSession } from "./lib/streamSession";
import { InfoTip } from "../../components/ui/InfoTip";

type Role = "choose" | "receive" | "send";

const STREAM_SUBTITLE = "Share and project cameras over WiFi.";

export const StreamPage = () => {
  useDocumentTitle("Stream · WorshipStudio");
  const { colors, fonts } = useUITheme();
  const [role, setRole] = useState<Role>("choose");

  if (!window.isSecureContext) {
    return (
      <div className="ws-page">
        <PageHeader title="Stream" subtitle={STREAM_SUBTITLE} />
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
      <PageHeader title="Stream" subtitle={STREAM_SUBTITLE} />

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
              body="Receive and project a camera"
              cta="Receive a camera"
              onClick={() => setRole("receive")}
            />
            <RoleCard
              icon={Radio}
              title="Share this camera"
              body="Send this camera to another device"
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
      </div>
    </div>
  );
};

const BroadcastCamerasSection = () => {
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
        <InfoTip title="Live cameras" variant="modal">
          <p style={{ marginTop: 0 }}>
            One camera fills the screen. Any other joined camera can sit in a
            corner of it or wait off screen, ready to be cut to without a
            reconnection.
          </p>
          <p style={{ marginBottom: 0 }}>
            Preview opens a floating window of a camera for you alone, so you
            can see what it is pointing at before it reaches the broadcast.
          </p>
        </InfoTip>
      </div>
      <div style={{ height: 10 }} />
      <CameraPanel />
    </section>
  );
};

const RoleCard = ({
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
}) => {
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
};
