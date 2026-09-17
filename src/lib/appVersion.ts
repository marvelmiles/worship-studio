declare const __APP_VERSION__: string;

/** Mirrors the version in package.json, stamped in at build time. */
export const APP_VERSION: string = __APP_VERSION__;

export const APP_VERSION_LABEL = `v${APP_VERSION}`;
