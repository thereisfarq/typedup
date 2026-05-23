import type { FontCategory } from "@/game/categories";

export interface FontEntry {
  id: string;
  family: string;
  category: FontCategory;
}

const CACHE_KEY = "typedup-local-fonts-catalog";
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

async function fetchLocalCatalog(): Promise<FontEntry[]> {
  const res = await fetch("/api/local-fonts");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as FontEntry[];
}

async function loadStaticCatalog(): Promise<FontEntry[]> {
  const res = await fetch("/local-fonts-catalog.json");
  if (!res.ok) throw new Error("Static catalog unavailable");
  return (await res.json()) as FontEntry[];
}

export async function getFontCatalog(): Promise<FontEntry[]> {
  const cached = readCache();
  if (cached?.length) return cached;

  try {
    const catalog = await fetchLocalCatalog();
    if (!catalog.length) throw new Error("No local fonts found");
    writeCache(catalog);
    return catalog;
  } catch {
    const staticCatalog = await loadStaticCatalog();
    if (!staticCatalog.length) throw new Error("No fonts in catalog");
    writeCache(staticCatalog);
    return staticCatalog;
  }
}

export function loadFontFace(entry: FontEntry): Promise<void> {
  if (loadedIds.has(entry.id)) return Promise.resolve();

  return (async () => {
    const res = await fetch(`/api/local-fonts/${entry.id}`);
    if (!res.ok) throw new Error(`Failed to load ${entry.family}`);

    const buffer = await res.arrayBuffer();
    const face = new FontFace(
      entry.family,
      buffer,
      { style: "normal", weight: "400" },
    );
    await face.load();
    document.fonts.add(face);
    loadedIds.add(entry.id);
  })();
}

export function preloadFontFace(entry: FontEntry): void {
  loadFontFace(entry).catch(() => undefined);
}
