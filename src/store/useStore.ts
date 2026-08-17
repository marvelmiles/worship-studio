import { create } from "zustand";
import type { StoreState } from "./storeTypes";
import { createUiSlice } from "./slices/uiSlice";
import { createManuscriptsSlice } from "./slices/manuscriptsSlice";
import { createScripturesSlice } from "./slices/scripturesSlice";
import { createMediaSlice } from "./slices/mediaSlice";
import { createAssetsSlice } from "./slices/assetsSlice";
import { createUploadsSlice } from "./slices/uploadsSlice";
import { createThemesSlice } from "./slices/themesSlice";
import { createPrefsSlice } from "./slices/prefsSlice";
import { createStorageSlice } from "./slices/storageSlice";
import { createPresentSlice } from "./slices/presentSlice";
import { createKeepOnResetSlice } from "./slices/keepOnResetSlice";
import { createPinsSlice } from "./slices/pinsSlice";
import { createDataSlice } from "./slices/dataSlice";

export type { StoreState } from "./storeTypes";
export type { OverlayName } from "./slices/uiSlice";
export type { PendingUpload, UploadKind } from "./slices/uploadsSlice";
export type {
  SavePassageOptions,
  ScriptureSelection,
} from "./slices/scripturesSlice";
export type { PresentationMode } from "./slices/presentSlice";
export { QUICK_PASSAGE_ID, SCRIPTURE_THEME_ID } from "./slices/scripturesSlice";

export const useStore = create<StoreState>()((...args) => ({
  ...createUiSlice(...args),
  ...createManuscriptsSlice(...args),
  ...createScripturesSlice(...args),
  ...createMediaSlice(...args),
  ...createAssetsSlice(...args),
  ...createUploadsSlice(...args),
  ...createThemesSlice(...args),
  ...createPrefsSlice(...args),
  ...createStorageSlice(...args),
  ...createPresentSlice(...args),
  ...createKeepOnResetSlice(...args),
  ...createPinsSlice(...args),
  ...createDataSlice(...args),
}));
