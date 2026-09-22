/**
 * The app's identity, shared by the browser bundle, the HTML shell and the PWA
 * manifest. It is kept free of build-time globals so the Vite config can import
 * it as well as the app itself.
 */
export const APP_NAME = "WorshipStudio";

export const APP_TAGLINE = "Worship Presentation Studio";

export const APP_TITLE = `${APP_NAME} · ${APP_TAGLINE}`;

/* Kept near 155 characters, the length a search result shows before it cuts. */
export const APP_DESCRIPTION = `Turn lyrics, hymns, sermons and Bible passages into live slides and project them to a second screen. Free, offline, and entirely in your browser.`;

export const APP_SHORT_DESCRIPTION =
  "Present lyrics, sermons, scripture, images and videos live from your browser.";

export const APP_URL = "https://worshipstudio.netlify.app/";
