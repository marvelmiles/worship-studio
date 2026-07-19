import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // We register the service worker explicitly in src/pwa.ts.
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
        name: "WorshipStudio · Worship Presentation Studio",
        short_name: "WorshipStudio",
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
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // Everything (fonts included) is bundled locally and precached, so the
        // app is fully usable offline with no external requests.
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        // The bundled KJV/ASV scripture chunks are ~4.2 MB each and must be
        // precached so the whole Bible works offline from the first install.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "index.html",
      },
      // Enable the service worker in dev too, so install + offline can be
      // verified without a production build.
      devOptions: { enabled: true, type: "module", navigateFallback: "index.html", suppressWarnings: true },
    }),
  ],
});
