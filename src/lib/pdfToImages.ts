// Render PDF pages to PNG data URLs in the browser using pdfjs-dist.
// Used by the itinerary scanner so multimodal AI can read PDF tickets
// (Lovable AI Gateway / Gemini accepts images, not PDFs, via image_url).

import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
// @ts-ignore – ?url is a Vite suffix
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

export async function pdfToImageDataUrls(file: File, opts?: { maxPages?: number; scale?: number }): Promise<string[]> {
  const maxPages = opts?.maxPages ?? 2;
  const scale = opts?.scale ?? 2;
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const out: string[] = [];
  const pages = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push(canvas.toDataURL("image/png"));
  }
  return out;
}
