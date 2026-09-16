import { usePairingMode } from "../lib/usePairingMode";
import { AutoReceivePanel } from "./AutoReceivePanel";
import { ManualReceiverPanel } from "./ManualReceiverPanel";

export const ReceiverLobby = ({ onBack }: { onBack: () => void }) => {
  const { mode, resetCount, reset, switchToCode, switchToOneTap } =
    usePairingMode();

  if (mode === "auto") {
    return <AutoReceivePanel onBack={onBack} onUseCode={switchToCode} />;
  }
  return (
    <ManualReceiverPanel
      key={`manual-${resetCount}`}
      onBack={onBack}
      onReset={reset}
      onUseOneTap={switchToOneTap}
    />
  );
};
