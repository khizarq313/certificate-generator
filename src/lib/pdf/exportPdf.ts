import type { CertificateDetails, TemplateId } from '../../features/certificate/types';
import { certificateTypeLabel } from '../../features/certificate/types';
import type { CertificateLayout, DrawOperation } from '../layout/buildLayout';
import { PAGE } from '../layout/layoutGrid';
import { getFontRegistry, measureText } from '../fonts/registry';
import { dataUrlToBytes } from '../images/signature';
import type { Color } from '@cantoo/pdf-lib';

const artRasterCache = new Map<TemplateId, Promise<Uint8Array>>();
const ptPerMm = PAGE.ptPerMm;
const subsetTags = {
  'cormorant-400': 'CMGNAL',
  'dm-sans-400': 'DMSSAA',
  'dm-sans-600': 'DMSSAB',
  'great-vibes-400': 'GRVIBE',
  'playfair-600': 'PLFAIR',
  'roboto-slab-700': 'RBSLAB',
  'unifraktur-700': 'UNIFRA',
} as const;

export async function warmPdfDependencies(): Promise<void> {
  await Promise.all([import('@cantoo/pdf-lib'), import('@cantoo/fontkit')]);
}

export async function exportPdf(layout: CertificateLayout, details: CertificateDetails): Promise<Blob> {
  const [{ PDFDocument, rgb }, fontkitModule] = await Promise.all([import('@cantoo/pdf-lib'), import('@cantoo/fontkit')]);
  const fontkit = fontkitModule.default;
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle(`Certificate of ${certificateTypeLabel(details)}`);
  document.setAuthor('SIES College of Management Studies (SIESCOMS)');
  document.setCreator('CertifyX');

  const page = document.addPage([PAGE.pdfWidthPt, PAGE.pdfHeightPt]);
  const fonts = getFontRegistry();
  const embeddedFonts = new Map<string, Awaited<ReturnType<typeof document.embedFont>>>();
  const artOperation = layout.operations.find((operation): operation is Extract<DrawOperation, { type: 'image' }> => operation.type === 'image' && operation.key === 'art');
  const artBytes = await getArtPng(layout.templateId, artOperation?.href);
  const art = await document.embedPng(artBytes);

  for (const operation of layout.operations) {
    if (operation.key === 'art') {
      page.drawImage(art, { x: 0, y: 0, width: PAGE.pdfWidthPt, height: PAGE.pdfHeightPt });
      continue;
    }
    if (operation.type === 'rect') {
      page.drawRectangle({ x: operation.x * ptPerMm, y: PAGE.pdfHeightPt - (operation.y + operation.height) * ptPerMm, width: operation.width * ptPerMm, height: operation.height * ptPerMm, color: hexColor(operation.fill, rgb) });
    } else if (operation.type === 'line') {
      page.drawLine({
        start: { x: operation.x1 * ptPerMm, y: PAGE.pdfHeightPt - operation.y1 * ptPerMm },
        end: { x: operation.x2 * ptPerMm, y: PAGE.pdfHeightPt - operation.y2 * ptPerMm },
        thickness: Math.max(0.25, operation.width * ptPerMm),
        color: hexColor(operation.color, rgb),
      });
    } else if (operation.type === 'image') {
      const bytes = operation.href.startsWith('data:') ? dataUrlToBytes(operation.href) : await fetchAsset(operation.href);
      const image = await document.embedPng(bytes);
      const x = operation.x * ptPerMm;
      const y = PAGE.pdfHeightPt - (operation.y + operation.height) * ptPerMm;
      const boxWidth = operation.width * ptPerMm;
      const boxHeight = operation.height * ptPerMm;
      if (operation.preserveAspectRatio === 'meet') {
        const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        page.drawImage(image, { x: x + (boxWidth - width) / 2, y: y + (boxHeight - height) / 2, width, height });
      } else page.drawImage(image, { x, y, width: boxWidth, height: boxHeight });
    } else {
      const asset = fonts.get(operation.fontId);
      if (!asset) throw new Error(`Missing font bytes for ${operation.fontId}.`);
      let font = embeddedFonts.get(operation.fontId);
      if (!font) {
        font = await document.embedFont(asset.bytes, { subset: true, customName: `${subsetTags[operation.fontId]}+${asset.parsed.postscriptName}` });
        embeddedFonts.set(operation.fontId, font);
      }
      const textWidthPt = measureText(operation.fontId, operation.text, operation.sizePt, operation.trackingPt);
      const textX = operation.align === 'middle' ? operation.x * ptPerMm - textWidthPt / 2 : operation.align === 'end' ? operation.x * ptPerMm - textWidthPt : operation.x * ptPerMm;
      page.drawText(operation.text, {
        x: textX,
        y: PAGE.pdfHeightPt - operation.y * ptPerMm,
        size: operation.sizePt,
        font,
        color: hexColor(operation.color, rgb),
        characterSpacing: operation.trackingPt,
        lineHeight: operation.sizePt * 1.2,
      });
    }
  }

  const bytes = await document.save({ useObjectStreams: false });
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

async function getArtPng(templateId: TemplateId, artUrl?: string): Promise<Uint8Array> {
  const existing = artRasterCache.get(templateId);
  if (existing) return existing;
  if (!artUrl) throw new Error('The selected template artwork is missing.');
  const pending = (async () => {
    try {
      return await rasterizeArt(artUrl, 3508, 2480);
    } catch {
      return rasterizeArt(artUrl, 2480, 1754);
    }
  })();
  artRasterCache.set(templateId, pending);
  try {
    return await pending;
  } catch (error) {
    artRasterCache.delete(templateId);
    throw error;
  }
}

async function rasterizeArt(artUrl: string, width: number, height: number): Promise<Uint8Array> {
  const response = await fetch(artUrl);
  if (!response.ok) throw new Error(`Unable to load the template artwork (${response.status}).`);
  const svgBlob = await response.blob();
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('A high-resolution canvas is unavailable.');
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Template art could not be rasterized.')), 'image/png'));
    return addPngDensity(new Uint8Array(await blob.arrayBuffer()), 11811);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function addPngDensity(png: Uint8Array, pixelsPerMeter: number): Uint8Array {
  const signatureLength = 8;
  if (png.length < 33 || png[0] !== 137 || png[1] !== 80) throw new Error('Template artwork did not produce a valid PNG.');
  const insertAt = 8 + 4 + 4 + 13 + 4;
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9, false);
  chunk.set([112, 72, 89, 115], 4);
  view.setUint32(8, pixelsPerMeter, false);
  view.setUint32(12, pixelsPerMeter, false);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)), false);
  const output = new Uint8Array(png.length + chunk.length);
  output.set(png.subarray(0, insertAt), 0);
  output.set(chunk, insertAt);
  output.set(png.subarray(insertAt), insertAt + chunk.length);
  if (signatureLength > insertAt) throw new Error('Invalid PNG header.');
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function fetchAsset(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Certificate image could not be loaded (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function hexColor(hex: string, rgb: (red: number, green: number, blue: number) => Color): Color {
  const value = normalizeHexColor(hex).slice(1);
  return rgb(Number.parseInt(value.slice(0, 2), 16) / 255, Number.parseInt(value.slice(2, 4), 16) / 255, Number.parseInt(value.slice(4, 6), 16) / 255);
}

export function normalizeHexColor(hex: string): string {
  const value = hex.trim().replace(/^#/u, '');
  if (/^[0-9a-fA-F]{3}$/u.test(value)) return `#${Array.from(value, (digit) => `${digit}${digit}`).join('')}`;
  if (/^[0-9a-fA-F]{6}$/u.test(value)) return `#${value}`;
  throw new Error(`Unsupported colour value: ${hex}`);
}

export function makePdfFileName(details: CertificateDetails, date = new Date()): string {
  const safe = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^A-Za-z0-9_-]+/gu, '_').replace(/^_+|_+$/gu, '').slice(0, 48) || 'Blank';
  const today = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  return `Certificate_${safe(details.leaveNameBlank ? '' : details.recipientName)}_${safe(certificateTypeLabel(details))}_${today}.pdf`;
}

