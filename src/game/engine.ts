import type { FontEntry } from "@/lib/fontsCatalog";

export type GameLevel = "noob" | "advanced";

export interface Question {
  correctFont: FontEntry;
  fontOptions?: string[];
}

const HISTORY_SIZE = 10;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function sampleUnique<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]!);
  }
  return result;
}

function shuffle<T>(items: T[]): T[] {
  return sampleUnique(items, items.length);
}

function pickFont(catalog: FontEntry[], history: string[]): FontEntry {
  const available = catalog.filter((f) => !history.includes(f.family));
  const pool = available.length > 0 ? available : catalog;
  return pickRandom(pool);
}

function buildFontOptions(correct: FontEntry, catalog: FontEntry[]): string[] {
  const sameCategory = catalog.filter(
    (f) => f.category === correct.category && f.family !== correct.family,
  );
  const globalPool = catalog.filter((f) => f.family !== correct.family);

  const distractorPool =
    sameCategory.length >= 3 ? sameCategory : globalPool;

  const distractors = sampleUnique(distractorPool, 3).map((f) => f.family);
  return shuffle([correct.family, ...distractors]);
}

export function pickQuestion(
  level: GameLevel,
  catalog: FontEntry[],
  history: string[],
): Question {
  const correctFont = pickFont(catalog, history);

  if (level === "noob") {
    return {
      correctFont,
      fontOptions: buildFontOptions(correctFont, catalog),
    };
  }

  return { correctFont };
}

export function pushHistory(history: string[], family: string): string[] {
  const next = [...history, family];
  return next.slice(-HISTORY_SIZE);
}

export function checkFontAnswer(question: Question, selectedFamily: string): boolean {
  return question.correctFont.family === selectedFamily;
}
