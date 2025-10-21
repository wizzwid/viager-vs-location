import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => {
  let VitePWA: any;
  try {
    // import optionnel
    ({ VitePWA } = await import("vite-plugin-pwa"));
  } catch {
    VitePWA = null;
  }

  return {
    plugins: [
      react(),
      VitePWA
        ? VitePWA({
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
                { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
              ]
            }
          })
        : undefined
    ].filter(Boolean),
    base: "/viager-vs-location/",
    build: { sourcemap: false, minify: "esbuild", cssMinify: true, target: "es2018" },
  };
});
