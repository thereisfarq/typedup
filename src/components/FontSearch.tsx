import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { FontEntry } from "@/lib/fontsCatalog";
import { playHoverSound } from "@/lib/sounds";
import "./FontSearch.css";

interface FontSearchProps {
  catalog: FontEntry[];
  disabled: boolean;
  onSelect: (family: string) => void;
}

const MAX_VISIBLE = 8;
const DEBOUNCE_MS = 100;

export function FontSearch({ catalog, disabled, onSelect }: FontSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((f) => f.family.toLowerCase().includes(q))
      .slice(0, MAX_VISIBLE);
  }, [catalog, debouncedQuery]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      setDebouncedQuery("");
      return;
    }
    if (e.key === "Enter" && results[0]) {
      e.preventDefault();
      onSelect(results[0].family);
    }
  };

  return (
    <div className="font-search">
      <input
        type="text"
        className="font-search__input"
        placeholder="Type font name…"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onMouseEnter={playHoverSound}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {debouncedQuery.trim() && (
        <ul className="font-search__list" role="listbox">
          {results.length === 0 ? (
            <li className="font-search__empty">No matches</li>
          ) : (
            results.map((font) => (
              <li key={font.family}>
                <button
                  type="button"
                  className="font-search__item"
                  disabled={disabled}
                  onMouseEnter={playHoverSound}
                  onClick={() => onSelect(font.family)}
                >
                  {font.family}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
