import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import type { FontCategory } from "./src/game/categories";

const require = createRequire(import.meta.url);
const fontkit = require("fontkit") as {
  openSync(path: string): FontkitFont | FontkitCollection;
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
}

interface ScannedFile {
  id: string;
  family: string;
  category: FontCategory;
  filePath: string;
  score: number;
}

const CACHE_DIR = path.join(process.cwd(), ".typedup");
const CACHE_FILE = path.join(CACHE_DIR, "fonts-catalog.json");

const DEFAULT_FONT_DIRS = [
  path.join(os.homedir(), "Library/Fonts"),
  "/Library/Fonts",
];

function fontDirs(): string[] {
  const extra = process.env.TYPEDUP_FONT_DIRS;
  if (extra) {
    return extra.split(path.delimiter).filter(Boolean);
  }
  return DEFAULT_FONT_DIRS;
}

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
  return (
    lower.endsWith(".ttf") ||
    lower.endsWith(".otf") ||
    lower.endsWith(".ttc")
  );
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

function makeId(filePath: string): string {
  return crypto.createHash("sha256").update(filePath).digest("hex").slice(0, 16);
}

function isPathAllowed(filePath: string, allowedRoots: string[]): boolean {
  const resolved = path.resolve(filePath);
  return allowedRoots.some((root) => {
    const base = path.resolve(root);
    return resolved === base || resolved.startsWith(base + path.sep);
  });
}

function scanFonts(): { catalog: LocalFontCatalogEntry[]; files: Map<string, string> } {
  const roots = fontDirs();
  const paths: string[] = [];
  for (const root of roots) walkFonts(root, paths);

  const byFamily = new Map<string, ScannedFile>();

  for (const filePath of paths) {
    try {
      const opened = fontkit.openSync(filePath);
      const font = pickFontFromOpen(opened);
      if (!font) continue;

      const family = font.familyName?.trim();
      if (!family) continue;

      const entry: ScannedFile = {
        id: makeId(filePath),
        family,
        category: inferCategory(font),
        filePath,
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

  const catalog = [...byFamily.values()]
    .sort((a, b) => a.family.localeCompare(b.family))
    .map(({ id, family, category }) => ({ id, family, category }));

  const files = new Map(
    [...byFamily.values()].map((e) => [e.id, e.filePath]),
  );

  return { catalog, files };
}

function dirsFingerprint(roots: string[]): string {
  const parts: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    try {
      const stat = fs.statSync(root);
      parts.push(`${root}:${stat.mtimeMs}`);
    } catch {
      parts.push(`${root}:missing`);
    }
  }
  return parts.join("|");
}

function readCache(fingerprint: string): LocalFontCatalogEntry[] | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as {
      fingerprint: string;
      catalog: LocalFontCatalogEntry[];
      files: Record<string, string>;
    };
    if (raw.fingerprint !== fingerprint) return null;
    return raw.catalog;
  } catch {
    return null;
  }
}

function writeCache(
  fingerprint: string,
  catalog: LocalFontCatalogEntry[],
  files: Map<string, string>,
): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({
      fingerprint,
      catalog,
      files: Object.fromEntries(files),
    }),
    "utf8",
  );
}

function loadCachedFiles(): Map<string, string> {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as {
      files: Record<string, string>;
    };
    return new Map(Object.entries(raw.files));
  } catch {
    return new Map();
  }
}

function contentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".otf")) return "font/otf";
  if (lower.endsWith(".ttc")) return "font/collection";
  return "font/ttf";
}

function attachFontRoutes(
  server: Pick<ViteDevServer | PreviewServer, "middlewares">,
  getCatalog: () => LocalFontCatalogEntry[],
  getFiles: () => Map<string, string>,
): void {
  const roots = fontDirs();

  server.middlewares.use((req, res, next) => {
    const url = req.url?.split("?")[0] ?? "";

    if (url === "/api/local-fonts") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(getCatalog()));
      return;
    }

    const fileMatch = url.match(/^\/api\/local-fonts\/([a-f0-9]+)$/);
    if (fileMatch) {
      const id = fileMatch[1]!;
      const filePath = getFiles().get(id);
      if (!filePath || !isPathAllowed(filePath, roots)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      try {
        const data = fs.readFileSync(filePath);
        res.setHeader("Content-Type", contentType(filePath));
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.end(data);
      } catch {
        res.statusCode = 500;
        res.end("Failed to read font");
      }
      return;
    }

    next();
  });
}

export function localFontsPlugin(): Plugin {
  let catalog: LocalFontCatalogEntry[] = [];
  let files = new Map<string, string>();

  function ensureScanned(): void {
    const roots = fontDirs();
    const fingerprint = dirsFingerprint(roots);
    const cached = readCache(fingerprint);
    if (cached?.length) {
      catalog = cached;
      files = loadCachedFiles();
      return;
    }

    const scanned = scanFonts();
    catalog = scanned.catalog;
    files = scanned.files;
    writeCache(fingerprint, catalog, files);
  }

  return {
    name: "typedup-local-fonts",
    configureServer(server) {
      ensureScanned();
      console.log(`[typedup] ${catalog.length} local font families loaded`);
      attachFontRoutes(server, () => catalog, () => files);
    },
    configurePreviewServer(server) {
      ensureScanned();
      attachFontRoutes(server, () => catalog, () => files);
    },
    buildStart() {
      ensureScanned();
      const out = path.join(process.cwd(), "public", "local-fonts-catalog.json");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(catalog), "utf8");
    },
  };
}
