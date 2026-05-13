import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const REPO = "Recourse";

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? `/${REPO}/` : "/"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
