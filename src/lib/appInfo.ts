export {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_TAGLINE,
  APP_TITLE,
  APP_URL,
} from "../../app.config";
import { APP_NAME, APP_TITLE } from "../../app.config";

declare const __APP_VERSION__: string;

/** Mirrors the version in package.json, stamped in at build time. */
export const APP_VERSION: string = __APP_VERSION__;

export const APP_VERSION_LABEL = `v${APP_VERSION}`;

/** How a page names itself in the browser tab. */
export const documentTitle = (page?: string): string =>
  page ? `${page} · ${APP_NAME}` : APP_TITLE;
