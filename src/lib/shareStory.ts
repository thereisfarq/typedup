/**
 * Generates a 1080x1920 Instagram Story card (TypedUp logo, a "Play Now"
 * button, and the MADE BY AHFOS credit) on a canvas, and shares it via the
 * Web Share API (which surfaces Instagram as a share target on iOS/Android),
 * falling back to a direct image download + copied link on desktop or
 * unsupported browsers.
 */

const CARD_W = 1080;
const CARD_H = 1920;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLetterSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacing: number,
): void {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + spacing * (chars.length - 1);

  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = centerX - totalWidth / 2;
  chars.forEach((char, i) => {
    ctx.fillText(char, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

/** Draws the shareable story card onto the given canvas. */
export async function drawStoryCard(
  canvas: HTMLCanvasElement,
  logoSrc: string,
): Promise<void> {
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is unavailable");

  // Background — matches the site's white/black brand.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const logoImg = await loadImage(logoSrc);

  // --- Logo: "Typed" wordmark + the red/black "up" mark ---
  const logoCenterY = CARD_H * 0.4;
  const typedFontPx = 132;
  ctx.font = `700 ${typedFontPx}px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const markHeight = typedFontPx;
  const markWidth = markHeight * (logoImg.width / logoImg.height);
  const typedWidth = ctx.measureText("Typed").width;
  const totalLogoWidth = typedWidth + markWidth;
  const logoStartX = (CARD_W - totalLogoWidth) / 2;

  const metrics = ctx.measureText("Typed");
  const capHeight =
    metrics.actualBoundingBoxAscent ?? typedFontPx * 0.72;
  const textBaselineY = logoCenterY + capHeight / 2;
  ctx.fillText("Typed", logoStartX, textBaselineY);
  ctx.drawImage(
    logoImg,
    logoStartX + typedWidth,
    logoCenterY - markHeight / 2,
    markWidth,
    markHeight,
  );

  // --- "Play Now" button ---
  const btnW = 620;
  const btnH = 148;
  const btnX = (CARD_W - btnW) / 2;
  const btnY = logoCenterY + 260;

  ctx.fillStyle = "#c41e24";
  roundRectPath(ctx, btnX, btnY, btnW, btnH, btnH / 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 58px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Play Now  ↗", btnX + btnW / 2, btnY + btnH / 2 + 4);

  // --- MADE BY AHFOS footer, small + grey like the home screen ---
  ctx.font = `500 32px "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = "#888888";
  ctx.textBaseline = "alphabetic";
  drawLetterSpacedText(ctx, "MADE BY AHFOS", CARD_W / 2, CARD_H - 120, 9);
}

export interface StoryShareResult {
  method: "share" | "download";
  message: string;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the story image"));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Shares the rendered card. On iOS/Android this opens the native share
 * sheet (Web Share API) where Instagram — including "Add to Story" — shows
 * up as a target if installed. On desktop, or if the user's browser lacks
 * file sharing support, it downloads the PNG and copies the game link
 * instead, since browsers can't hand a file straight to Instagram Stories.
 */
export async function shareStoryImage(
  canvas: HTMLCanvasElement,
  gameUrl: string,
): Promise<StoryShareResult> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], "typedup-story.png", { type: "image/png" });
  const canShareFiles =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title: "TypedUp",
        text: `Play TypedUp: ${gameUrl}`,
      });
      return {
        method: "share",
        message: "Shared — pick Instagram, then Story.",
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { method: "share", message: "Share cancelled." };
      }
      // Fall through to the download fallback below.
    }
  }

  downloadBlob(blob, "typedup-story.png");

  try {
    await navigator.clipboard.writeText(gameUrl);
    return {
      method: "download",
      message:
        "Image saved and link copied — open Instagram, start a Story, add the photo, then paste the link.",
    };
  } catch {
    return {
      method: "download",
      message: `Image saved — open Instagram, start a Story, add the photo, and link to ${gameUrl}`,
    };
  }
}

/** The public URL of the game, e.g. https://ahfos.github.io/typedup/ */
export function gameShareUrl(): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return base.endsWith("/") ? base : `${base}/`;
}
