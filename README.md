# TypedUp

A minimal black-and-white typography guessing game. Polish your type identification skills across three difficulty levels using **fonts installed on your Mac**.

## Levels

- **noob** — Pick the correct font name from four options.
- **advanced** — Search your local catalog and select the right font.

Click the specimen sentence to type any preview text you want (saved between sessions).

## Development

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

On first start, TypedUp scans your **`.ttf` / `.otf` / `.ttc`** files in:

- `~/Library/Fonts`
- `/Library/Fonts`

Results are cached in `.typedup/fonts-catalog.json` (family name, category, and one representative file per family). The dev server serves font files at `/api/local-fonts/:id`.

### Extra font folders

```bash
TYPEDUP_FONT_DIRS="/path/to/fonts:/other/fonts" npm run dev
```

Use `:` as the separator on macOS.

## Build & preview

```bash
npm run build
npm run preview
```

`preview` also serves local fonts via the same API. A static catalog is written to `public/local-fonts-catalog.json` at build time for reference; **font specimens still require the local-fonts API** (dev or preview).

## Stack

- Vite + React + TypeScript
- React Router
- Framer Motion
- [fontkit](https://github.com/foliojs/fontkit) for reading installed font metadata
