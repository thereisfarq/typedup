import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { localFontsPlugin } from "./vite-plugin-local-fonts";

export default defineConfig({
  plugins: [react(), localFontsPlugin()],
  ssr: {
    external: ["fontkit"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
