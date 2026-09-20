import { useCallback, useState } from "react";
import type { BackupRecordRef } from "../../../lib/shareSelection";

export interface QuickShareTarget {
  /** Every record the one thing being shared is made of. */
  records: BackupRecordRef[];
  title: string;
}

export interface QuickShareTargetControls {
  target: QuickShareTarget | null;
  open: (records: BackupRecordRef[], title: string) => void;
  close: () => void;
}

/**
 * Holds whichever library item is being handed to another device, so any list
 * can offer quick share from its own menu.
 */
export const useQuickShareTarget = (): QuickShareTargetControls => {
  const [target, setTarget] = useState<QuickShareTarget | null>(null);

  return {
    target,
    open: useCallback(
      (records: BackupRecordRef[], title: string) =>
        setTarget({ records, title }),
      [],
    ),
    close: useCallback(() => setTarget(null), []),
  };
};
