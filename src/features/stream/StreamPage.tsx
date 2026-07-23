import { useState } from "react";
import { ArrowRight, MonitorSmartphone, Radio, ShieldAlert } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { PageHeader } from "../../components/ui/PageHeader";
import { ReceiverLobby } from "./ReceiverPanel";
import { SenderLobby } from "./SenderPanel";

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
      </div>
    </div>
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
