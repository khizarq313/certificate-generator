const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_STORED_BYTES = 250 * 1024;
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface SignatureResult {
  dataUrl: string;
  width: number;
  height: number;
}

export async function processSignature(file: File, keepBackground: boolean): Promise<SignatureResult> {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Choose a PNG, JPG, or WebP signature image. SVG files are not supported.');
  if (file.size > MAX_FILE_BYTES) throw new Error('Signature images must be 2 MB or smaller.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, 900 / bitmap.width);
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    let dataUrl = '';
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: !keepBackground });
      if (!context) throw new Error('The browser could not process this signature image.');
      context.drawImage(bitmap, 0, 0, width, height);
      if (!keepBackground && file.type === 'image/jpeg') removeLightBackground(context, width, height);
      dataUrl = canvas.toDataURL('image/png');
      const approximateBytes = Math.floor(dataUrl.length * 0.75);
      if (approximateBytes <= MAX_STORED_BYTES) return { dataUrl, width, height };
      width = Math.max(80, Math.round(width * 0.82));
      height = Math.max(40, Math.round(height * 0.82));
    }
    if (Math.floor(dataUrl.length * 0.75) > MAX_STORED_BYTES) throw new Error('This signature image could not be reduced below 250 KB. Use a simpler or smaller image.');
    return { dataUrl, width, height };
  } finally {
    bitmap.close();
  }
}

function removeLightBackground(context: CanvasRenderingContext2D, width: number, height: number): void {
  const image = context.getImageData(0, 0, width, height);
  removeLightBackgroundPixels(image.data);
  context.putImageData(image, 0, 0);
}

export function removeLightBackgroundPixels(pixels: Uint8ClampedArray): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    const alpha = Math.max(0, Math.min(255, Math.round((245 - luminance) * 2.1)));
    pixels[index] = 31;
    pixels[index + 1] = 35;
    pixels[index + 2] = 43;
    pixels[index + 3] = alpha < 18 ? 0 : alpha;
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.split(',')[1] ?? '';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
