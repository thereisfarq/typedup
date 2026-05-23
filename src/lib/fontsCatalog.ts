import type { FontCategory } from "@/game/categories";
import { assetUrl } from "@/lib/baseUrl";

export interface FontEntry {
  id: string;
  family: string;
  category: FontCategory;
  url: string;
}

const CACHE_KEY = "typedup-fonts-catalog";
const CACHE_TTL_MS = 60 * 60 * 1000;
const loadedIds = new Set<string>();

function readCache(): FontEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; fonts: FontEntry[] };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.fonts;
  } catch {
    return null;
  }
}

function writeCache(fonts: FontEntry[]): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), fonts }),
    );
  } catch {
    /* ignore quota errors */
  }
}

async function fetchCatalog(): Promise<FontEntry[]> {
  const res = await fetch(`${assetUrl("local-fonts-catalog.json")}?t=${Date.now()}`);
  if (!res.ok) throw new Error("Font catalog unavailable");
  const data = (await res.json()) as FontEntry[];
  if (!data.length) {
    throw new Error(
      "No fonts found. Add .ttf or .otf files to public/fonts/ and restart the dev server.",
    );
  }
  return data;
}

export async function getFontCatalog(): Promise<FontEntry[]> {
  try {
    const catalog = await fetchCatalog();
    writeCache(catalog);
    return catalog;
  } catch (err) {
    const cached = readCache();
    if (cached?.length) return cached;
    throw err;
  }
}

export function loadFontFace(entry: FontEntry): Promise<void> {
  if (loadedIds.has(entry.id)) return Promise.resolve();

  return (async () => {
    const res = await fetch(assetUrl(entry.url));
    if (!res.ok) throw new Error(`Failed to load ${entry.family}`);

    const buffer = await res.arrayBuffer();
    const face = new FontFace(entry.family, buffer, {
      style: "normal",
      weight: "400",
    });
    await face.load();
    document.fonts.add(face);
    loadedIds.add(entry.id);
  })();
}

export function preloadFontFace(entry: FontEntry): void {
  loadFontFace(entry).catch(() => undefined);
}
