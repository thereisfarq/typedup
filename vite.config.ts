import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { localFontsPlugin } from "./vite-plugin-local-fonts";

function ghPagesSpaFallback(): Plugin {
  return {
    name: "gh-pages-spa-fallback",
    closeBundle() {
      if (!process.env.GITHUB_PAGES) return;
      const index = path.resolve("dist/index.html");
      const notFound = path.resolve("dist/404.html");
      fs.copyFileSync(index, notFound);
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/typedup/" : "/",
  plugins: [react(), localFontsPlugin(), ghPagesSpaFallback()],
  ssr: {
    external: ["fontkit"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
