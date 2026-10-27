import { readFile } from 'node:fs/promises';
import { PDFDocument } from '@cantoo/pdf-lib';
import { PNG } from 'pngjs';

export interface RenderedPdfPage {
  width: number;
  height: number;
  pdfWidthPt: number;
  pdfHeightPt: number;
  sizeBytes: number;
  png: Buffer;
  text: string;
}

export async function inspectPdf(path: string): Promise<RenderedPdfPage> {
  const bytes = new Uint8Array(await readFile(path));
  const pdfLibDocument = await PDFDocument.load(bytes);
  const pages = pdfLibDocument.getPages();
  if (pages.length !== 1) throw new Error(`Expected one PDF page but found ${pages.length}.`);
  const size = pages[0].getSize();
  const source = Buffer.from(bytes).toString('latin1');
  if (!/\/FontFile[23]?\b/u.test(source)) throw new Error('The PDF does not contain embedded fonts.');
  if (!/\/BaseFont\s*\/[A-Z]{6}\+/u.test(source)) throw new Error('The PDF does not contain a subset font.');
  const pdfJs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const canvasModule = await import('@napi-rs/canvas');
  Object.assign(globalThis, {
    DOMMatrix: canvasModule.DOMMatrix,
    ImageData: canvasModule.ImageData,
    Path2D: canvasModule.Path2D,
  });
  const loadingTask = pdfJs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map((item) => 'str' in item ? item.str : '').join(' ');
  const viewport = page.getViewport({ scale: 150 / 72 });
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);
  const canvas = canvasModule.createCanvas(width, height);
  const context = canvas.getContext('2d');
  await page.render({ canvasContext: context as unknown as CanvasRenderingContext2D, viewport }).promise;
  const png = canvas.toBuffer('image/png');
  const pixels = PNG.sync.read(png).data;
  let nonWhite = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) nonWhite += 1;
  }
  if (nonWhite < width * height * 0.05) throw new Error('The PDF render appears blank.');
  return { width, height, pdfWidthPt: size.width, pdfHeightPt: size.height, sizeBytes: bytes.byteLength, png, text };
}

export function currentLocalDate(): string {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
}
