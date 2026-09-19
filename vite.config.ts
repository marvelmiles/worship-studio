import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_DESCRIPTION,
  APP_TITLE,
  APP_URL,
} from "./app.config";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

const HTML_IDENTITY: Record<string, string> = {
  APP_TITLE,
  APP_NAME,
  APP_DESCRIPTION,
  APP_SHORT_DESCRIPTION,
  APP_URL,
};

/**
 * Fills the {{APP_*}} placeholders in index.html from the app's identity, so the
 * shell, the manifest and the app itself all read the name from one place. It
 * runs before the other plugins see the HTML.
 */
const appHtmlIdentity = (): Plugin => ({
  name: "app-html-identity",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(
        /\{\{(APP_[A-Z_]+)\}\}/g,
        (match, key: string) => HTML_IDENTITY[key] ?? match,
      ),
  },
});

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  // The bundled hymn corpus is large, and JSON.parse beats parsing it as a
  // JavaScript object literal on startup.
  json: {
    stringify: true,
  },
  plugins: [
    react(),
    appHtmlIdentity(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "favicon.svg",
        "icon.svg",
        "robots.txt",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: APP_TITLE,
        short_name: APP_NAME,
        description:
          "Present songs, Bible passages, images and videos live, installable and offline-ready.",
        theme_color: "#101013",
        background_color: "#101013",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["productivity", "utilities"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
        suppressWarnings: true,
      },
    }),
  ],
});
