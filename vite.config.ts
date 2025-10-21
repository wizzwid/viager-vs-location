import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "sitemap.xml",
        "icons/icon-192.png",
        "icons/icon-512.png",
      ],
      manifest: {
        name: "Calculette Immo – Simulation Viager, Location, SCPI",
        short_name: "Calculette Immo",
        start_url: "/viager-vs-location/#/simulateur",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#3559E0",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],

  base: "/viager-vs-location/",

  build: {
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    target: "es2018",
  },

  server: {
    port: 5173,
    open: true,
  },

  preview: {
    port: 4173,
  },

  define: {
    "process.env": {},
  },
});
