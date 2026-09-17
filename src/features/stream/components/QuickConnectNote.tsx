import { useState } from "react";
import { useUITheme } from "../../../theme/ThemeProvider";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";

export const QuickConnectNote = () => {
  const { colors, fonts } = useUITheme();
  const [open, setOpen] = useState(false);

  const paragraph = {
    fontFamily: fonts.ui,
    fontSize: 13.5,
    lineHeight: 1.7,
    color: colors.sub,
    margin: "0 0 12px",
  };

  return (
    <>
      <p
        style={{
          margin: "14px 0 0",
          textAlign: "center",
          fontFamily: fonts.ui,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: colors.dim,
        }}
      >
        A brief internet connection is needed to link both devices.{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
            color: colors.accentSoft,
            textDecoration: "underline",
          }}
        >
          Learn more
        </button>
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Why quick connect needs the internet"
        width={480}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <p style={{ ...paragraph, marginTop: 0 }}>
          Quick connect lets the two devices find each other on their own, and
          that introduction is made through a short online lookup. Both devices
          need to reach the internet for those few seconds.
        </p>
        <p style={paragraph}>
          Once they are paired the video no longer goes online. It travels
          straight between the two devices over your WiFi, so the picture keeps
          running even if the internet drops out afterwards.
        </p>
        <p style={{ ...paragraph, marginBottom: 0, color: colors.text }}>
          No internet? Choose <strong>Pair with a code instead</strong>. That
          route is fully offline: point one device at the other&apos;s QR code,
          or copy the code text and paste it into the box on the other device.
        </p>
      </Modal>
    </>
  );
};
