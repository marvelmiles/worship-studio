import { usePairingMode } from "../lib/usePairingMode";
import { AutoBroadcastPanel } from "./AutoBroadcastPanel";
import { ManualSenderPanel } from "./ManualSenderPanel";

export const SenderLobby = ({ onBack }: { onBack: () => void }) => {
  const { mode, resetCount, reset, switchToCode, switchToOneTap } =
    usePairingMode();

  if (mode === "auto") {
    return (
      <AutoBroadcastPanel
        key={`auto-${resetCount}`}
        onBack={onBack}
        onReset={reset}
        onUseCode={switchToCode}
      />
    );
  }
  return (
    <ManualSenderPanel
      key={`manual-${resetCount}`}
      onBack={onBack}
      onReset={reset}
      onUseOneTap={switchToOneTap}
    />
  );
};
