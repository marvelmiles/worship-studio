import type { StateCreator } from "zustand";
import type { UiSlice } from "./slices/uiSlice";
import type { ManuscriptsSlice } from "./slices/manuscriptsSlice";
import type { ScripturesSlice } from "./slices/scripturesSlice";
import type { MediaSlice } from "./slices/mediaSlice";
import type { AssetsSlice } from "./slices/assetsSlice";
import type { UploadsSlice } from "./slices/uploadsSlice";
import type { ThemesSlice } from "./slices/themesSlice";
import type { PrefsSlice } from "./slices/prefsSlice";
import type { StorageSlice } from "./slices/storageSlice";
import type { PresentSlice } from "./slices/presentSlice";
import type { KeepOnResetSlice } from "./slices/keepOnResetSlice";
import type { DataSlice } from "./slices/dataSlice";

export type StoreState = UiSlice &
  ManuscriptsSlice &
  ScripturesSlice &
  MediaSlice &
  AssetsSlice &
  UploadsSlice &
  ThemesSlice &
  PrefsSlice &
  StorageSlice &
  PresentSlice &
  KeepOnResetSlice &
  DataSlice;

export type SliceCreator<T> = StateCreator<StoreState, [], [], T>;

export type Getter = () => StoreState;
