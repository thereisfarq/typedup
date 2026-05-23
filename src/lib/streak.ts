import type { GameLevel } from "@/game/engine";

const BEST_KEY = "typedup-best-streak";

function readBest(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeBest(data: Record<string, number>): void {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getBestStreak(level: GameLevel): number {
  return readBest()[String(level)] ?? 0;
}

export function updateBestStreak(level: GameLevel, streak: number): number {
  const all = readBest();
  const key = String(level);
  const current = all[key] ?? 0;
  if (streak > current) {
    all[key] = streak;
    writeBest(all);
    return streak;
  }
  return current;
}
