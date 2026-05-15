import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/**
 * pdfjs-dist needs a worker script. Vite resolves the ?url import at
 * build time to a hashed worker file in dist/, so this works both in
 * dev (HMR) and in the production Pages bundle.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface RenderedPdfPage {
  /** PNG data URL of the rendered page, suitable for vision-LLM submission */
  dataUrl: string;
  /** Width in CSS pixels after scaling */
  width: number;
  /** Height in CSS pixels after scaling */
  height: number;
  /** Page number that was rendered (1-indexed) */
  pageNumber: number;
  /** Total pages in the source PDF */
  pageCount: number;
}

export interface RenderOptions {
  /** Target longest-side dimension in pixels. Vision models cap around
   *  ~1568 effective; we render slightly under to avoid downscaling. */
  maxDimension?: number;
  /** Which page to render (1-indexed). Defaults to 1. */
  pageNumber?: number;
}

/**
 * Render a single PDF page to a PNG data URL. The first page only by
 * default — multi-page handling is a follow-up. We size the canvas so
 * the longest side fits the model's effective resolution; oversampling
 * past that wastes tokens without improving extraction.
 */
export async function renderPdfPageToImage(
  file: File,
  { maxDimension = 1400, pageNumber = 1 }: RenderOptions = {}
): Promise<RenderedPdfPage> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const targetPage = Math.min(Math.max(pageNumber, 1), pdf.numPages);
  const page = await pdf.getPage(targetPage);

  // Compute a scale so the longer side is roughly maxDimension.
  const baseViewport = page.getViewport({ scale: 1 });
  const naturalMax = Math.max(baseViewport.width, baseViewport.height);
  const scale = maxDimension / naturalMax;
  const viewport = page.getViewport({ scale });

  // Use OffscreenCanvas where available; fall back to a detached canvas.
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");

  // White background so transparent PDFs don't render with the canvas alpha.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  const dataUrl = canvas.toDataURL("image/png");
  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
    pageNumber: targetPage,
    pageCount: pdf.numPages,
  };
}

/**
 * Convenience wrapper: render an Image element (typically loaded from an
 * uploaded image file) directly to a PNG data URL, sized down to fit the
 * vision model's effective resolution. Used when the user drops a JPEG/PNG
 * instead of a PDF.
 */
export async function renderImageToDataUrl(
  file: File,
  { maxDimension = 1400 }: { maxDimension?: number } = {}
): Promise<RenderedPdfPage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not decode image"));
      i.src = url;
    });
    const naturalMax = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = naturalMax > maxDimension ? maxDimension / naturalMax : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d canvas context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: w,
      height: h,
      pageNumber: 1,
      pageCount: 1,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
