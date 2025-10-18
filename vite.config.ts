import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/viager-vs-location/", // 👈 très important pour GitHub Pages
});
