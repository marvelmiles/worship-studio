/**
 * The app's identity, shared by the browser bundle, the HTML shell and the PWA
 * manifest. It is kept free of build-time globals so the Vite config can import
 * it as well as the app itself.
 */
export const APP_NAME = "WorshipStudio";

export const APP_TAGLINE = "Worship Presentation Studio";

export const APP_TITLE = `${APP_NAME} · ${APP_TAGLINE}`;

export const APP_DESCRIPTION = `${APP_NAME} is a full worship presentation studio: song lyrics, hymns, sermons, Bible verses, images and videos, projected live with themes, presenter notes and keyboard control. Works offline in your browser.`;

export const APP_SHORT_DESCRIPTION =
  "Present lyrics, sermons, scripture, images and videos live from your browser.";

export const APP_URL = "https://worshipstudio.netlify.app/";
