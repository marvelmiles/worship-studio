import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { fade } from "../../theme/uiTheme";
import { useUITheme } from "../../theme/ThemeProvider";
import { useStore } from "../../store/useStore";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Checkbox } from "./Field";

export const GO_LIVE_FULLSCREEN_TIP =
  "The live window fills the external display on its own. If it ever opens on this screen instead, allow this site to manage windows when your browser asks and press Go Live again. Inside the live window, F or the arrow at its top right corner toggles fullscreen, and Esc leaves it.";

export const GoLiveTipDialog = () => {
  const { colors, fonts } = useUITheme();
  const open = useStore((s) => s.goLiveTipOpen);
  const dismiss = useStore((s) => s.dismissGoLiveTip);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const close = () => {
    dismiss(dontShowAgain);
    setDontShowAgain(false);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={false}
      title="You're live"
      width={470}
      footer={
        <>
          <Checkbox
            checked={dontShowAgain}
            onChange={setDontShowAgain}
            label="Don't show again"
          />
          <span style={{ flex: 1 }} />
          <Button variant="primary" onClick={close}>
            Got it
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <span
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 11,
            display: "grid",
            placeItems: "center",
            background: fade(colors.accent, 0.14),
            color: colors.accentSoft,
          }}
        >
          <Maximize2 size={19} />
        </span>
        <p
          style={{
            margin: 0,
            fontFamily: fonts.ui,
            fontSize: 13.5,
            lineHeight: 1.7,
            color: colors.text,
          }}
        >
          {GO_LIVE_FULLSCREEN_TIP}
        </p>
      </div>
    </Modal>
  );
};
