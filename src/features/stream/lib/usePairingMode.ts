import { useCallback, useState } from "react";
import { signalingConfigured } from "../../../lib/signalingDb";

export type PairingMode = "auto" | "manual";

export const usePairingMode = () => {
  const [mode, setMode] = useState<PairingMode>(
    signalingConfigured ? "auto" : "manual",
  );
  const [resetCount, setResetCount] = useState(0);
  const reset = useCallback(() => setResetCount((count) => count + 1), []);
  const switchToCode = useCallback(() => setMode("manual"), []);
  const switchToOneTap = signalingConfigured
    ? () => setMode("auto")
    : undefined;

  return { mode, resetCount, reset, switchToCode, switchToOneTap };
};
