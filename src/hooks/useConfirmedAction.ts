import { useCallback, useState } from "react";

export interface ConfirmedAction {
  prompting: boolean;
  request: () => void;
  confirm: () => void;
  cancel: () => void;
}

/** Puts a confirmation step in front of an action that cannot be undone lightly. */
export const useConfirmedAction = (run: () => void): ConfirmedAction => {
  const [prompting, setPrompting] = useState(false);

  const confirm = useCallback(() => {
    setPrompting(false);
    run();
  }, [run]);

  return {
    prompting,
    request: useCallback(() => setPrompting(true), []),
    confirm,
    cancel: useCallback(() => setPrompting(false), []),
  };
};
