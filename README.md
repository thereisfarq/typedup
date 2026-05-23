# TypedUp

A minimal black-and-white typography guessing game.

## Levels

- **noob** — Pick the correct font name from four options.
- **advanced** — Search the catalog and select the right font.

Click the specimen sentence to type any preview text you want (saved between sessions).

## Add your fonts

1. Copy **`.ttf`**, **`.otf`**, or **`.ttc`** files into:

   **`public/fonts/`**

   (subfolders are fine)

2. Restart `npm run dev` — or push to GitHub to rebuild the live site.

3. Commit the font files with your repo if you want them on GitHub Pages.

The app picks one file per font family (preferring regular/normal weights).

## Development

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy (GitHub Pages)

Push to `main` — the workflow builds and publishes to:

`https://YOUR_USERNAME.github.io/typedup/`

Fonts in `public/fonts/` are included in the build automatically.

## Stack

- Vite + React + TypeScript
- React Router
- Framer Motion
- [fontkit](https://github.com/foliojs/fontkit) for font metadata
