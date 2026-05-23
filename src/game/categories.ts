export type FontCategory =
  | "serif"
  | "sans-serif"
  | "display"
  | "handwriting"
  | "monospace";

export const ALL_CATEGORIES: FontCategory[] = [
  "serif",
  "sans-serif",
  "display",
  "handwriting",
  "monospace",
];

const LABELS: Record<FontCategory, string> = {
  serif: "Serif",
  "sans-serif": "Sans Serif",
  display: "Display",
  handwriting: "Handwriting",
  monospace: "Monospace",
};

export function categoryLabel(category: FontCategory): string {
  return LABELS[category];
}

export function isFontCategory(value: string): value is FontCategory {
  return ALL_CATEGORIES.includes(value as FontCategory);
}
