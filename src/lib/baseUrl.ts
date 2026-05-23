/** Vite base URL, e.g. `/` locally or `/typedup/` on GitHub Pages */
export function appBaseUrl(): string {
  return import.meta.env.BASE_URL;
}

export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${appBaseUrl()}${clean}`;
}

export function apiUrl(path: string): string {
  return assetUrl(path.replace(/^\//, ""));
}
