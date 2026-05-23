import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import type { FontCategory } from "./src/game/categories";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit") as {
  openSync(filePath: string): FontkitFont | FontkitCollection;
};

interface FontkitFont {
  familyName?: string;
  subfamilyName?: string;
  post?: { isFixedPitch?: boolean };
  "OS/2"?: { sFamilyClass?: number };
}

interface FontkitCollection {
  fonts?: FontkitFont[];
}

export interface LocalFontCatalogEntry {
  id: string;
  family: string;
  category: FontCategory;
  url: string;
}

interface ScannedFile {
  id: string;
  family: string;
  category: FontCategory;
  url: string;
  score: number;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const FONTS_DIR = path.join(PUBLIC_DIR, "fonts");
const CACHE_DIR = path.join(process.cwd(), ".typedup");
const CATALOG_DEV = path.join(CACHE_DIR, "fonts-catalog.json");
const CATALOG_PUBLIC = path.join(PUBLIC_DIR, "local-fonts-catalog.json");

function pickFontFromOpen(
  opened: FontkitFont | FontkitCollection,
): FontkitFont | null {
  if ("fonts" in opened && Array.isArray(opened.fonts) && opened.fonts.length > 0) {
    return opened.fonts[0] ?? null;
  }
  return opened as FontkitFont;
}

function inferCategory(font: FontkitFont): FontCategory {
  if (font.post?.isFixedPitch) return "monospace";

  const familyClass = font["OS/2"]?.sFamilyClass;
  if (familyClass != null) {
    const cls = (familyClass >> 8) & 0xff;
    if (cls >= 1 && cls <= 7) return "serif";
    if (cls === 8) return "sans-serif";
    if (cls === 9 || cls === 12) return "display";
    if (cls === 10) return "handwriting";
  }

  const name = `${font.familyName ?? ""} ${font.subfamilyName ?? ""}`.toLowerCase();
  if (/mono|typewriter|code|console|courier/.test(name)) return "monospace";
  if (/script|hand|brush|cursive|callig|signature|marker/.test(name)) return "handwriting";
  if (/serif|garamond|baskerville|caslon|didot|bodoni|times|georgia/.test(name)) {
    return "serif";
  }
  if (/sans|grotesk|helvetica|arial|futura|gothic|neo|humanist/.test(name)) {
    return "sans-serif";
  }

  return "sans-serif";
}

function pickScore(font: FontkitFont): number {
  const sub = (font.subfamilyName ?? "").toLowerCase();
  let score = 0;
  if (/^(regular|normal|roman|book|medium)$/.test(sub.trim())) score += 20;
  if (/regular|normal|roman|book/.test(sub)) score += 10;
  if (/bold|black|heavy|ultra|semi|demi/.test(sub)) score -= 4;
  if (/light|thin|hairline|extra/.test(sub)) score -= 3;
  if (/italic|oblique|slanted/.test(sub)) score -= 6;
  if (/condensed|compressed|extended|expanded|narrow|wide/.test(sub)) score -= 2;
  return score;
}

function isFontFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".ttf") || lower.endsWith(".otf") || lower.endsWith(".ttc");
}

function walkFonts(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFonts(full, out);
      continue;
    }
    if (entry.isFile() && isFontFile(entry.name)) {
      out.push(full);
    }
  }
}

function toPublicUrl(filePath: string): string {
  const rel = path.relative(PUBLIC_DIR, filePath);
  return rel.split(path.sep).join("/");
}

function makeId(publicUrl: string): string {
  return crypto.createHash("sha256").update(publicUrl).digest("hex").slice(0, 16);
}

export function scanProjectFonts(): LocalFontCatalogEntry[] {
  fs.mkdirSync(FONTS_DIR, { recursive: true });

  const paths: string[] = [];
  walkFonts(FONTS_DIR, paths);

  const byFamily = new Map<string, ScannedFile>();

  for (const filePath of paths) {
    try {
      const opened = fontkit.openSync(filePath);
      const font = pickFontFromOpen(opened);
      if (!font) continue;

      const family = font.familyName?.trim();
      if (!family) continue;

      const url = toPublicUrl(filePath);
      const entry: ScannedFile = {
        id: makeId(url),
        family,
        category: inferCategory(font),
        url,
        score: pickScore(font),
      };

      const existing = byFamily.get(family.toLowerCase());
      if (!existing || entry.score > existing.score) {
        byFamily.set(family.toLowerCase(), entry);
      }
    } catch {
      /* skip unreadable fonts */
    }
  }

  return [...byFamily.values()]
    .sort((a, b) => a.family.localeCompare(b.family))
    .map(({ id, family, category, url }) => ({ id, family, category, url }));
}

function writeCatalogFile(filePath: string, catalog: LocalFontCatalogEntry[]): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(catalog), "utf8");
}

function isFontPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const fontsRoot = path.resolve(FONTS_DIR);
  if (resolved === fontsRoot || !resolved.startsWith(fontsRoot + path.sep)) {
    return false;
  }
  return isFontFile(path.basename(resolved));
}

export function localFontsPlugin(): Plugin {
  let catalog: LocalFontCatalogEntry[] = [];
  let loggedStartup = false;

  function refreshCatalog(target: "dev" | "public"): LocalFontCatalogEntry[] {
    catalog = scanProjectFonts();
    if (target === "dev") {
      writeCatalogFile(CATALOG_DEV, catalog);
    } else {
      writeCatalogFile(CATALOG_PUBLIC, catalog);
    }
    return catalog;
  }

  function logStartupOnce(): void {
    if (loggedStartup) return;
    loggedStartup = true;
    console.log(
      `[typedup] ${catalog.length} font famil${catalog.length === 1 ? "y" : "ies"} in public/fonts/`,
    );
  }

  function attachCatalogMiddleware(
    server: Pick<ViteDevServer | PreviewServer, "middlewares">,
    catalogPath: string,
  ): void {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0] ?? "";
      if (!url.endsWith("/local-fonts-catalog.json")) {
        next();
        return;
      }
      try {
        const json = fs.readFileSync(catalogPath, "utf8");
        res.setHeader("Content-Type", "application/json");
        res.end(json);
      } catch {
        res.statusCode = 404;
        res.end("Catalog not found");
      }
    });
  }

  function watchFonts(
    server: Pick<ViteDevServer | PreviewServer, "watcher" | "ws">,
  ): void {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
    server.watcher.add(FONTS_DIR);

    let debounce: ReturnType<typeof setTimeout> | undefined;

    const scheduleRescan = (filePath: string) => {
      if (!isFontPath(filePath)) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        refreshCatalog("dev");
        server.ws.send({ type: "full-reload" });
      }, 600);
    };

    server.watcher.on("add", scheduleRescan);
    server.watcher.on("unlink", scheduleRescan);
  }

  return {
    name: "typedup-local-fonts",
    configureServer(server) {
      refreshCatalog("dev");
      logStartupOnce();
      attachCatalogMiddleware(server, CATALOG_DEV);
      watchFonts(server);
    },
    configurePreviewServer(server) {
      refreshCatalog("public");
      logStartupOnce();
      attachCatalogMiddleware(server, CATALOG_PUBLIC);
    },
    buildStart() {
      refreshCatalog("public");
      logStartupOnce();
    },
  };
}
