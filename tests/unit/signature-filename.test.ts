import { describe, expect, it } from 'vitest';
import { makePdfFileName, normalizeHexColor } from '../../src/lib/pdf/exportPdf';
import { processSignature, removeLightBackgroundPixels } from '../../src/lib/images/signature';
import { cloneDefaultDetails } from '../../src/features/certificate/types';

describe('PDF filename and signature validation', () => {
  it('normalizes three- and six-digit hex colours for the PDF renderer', () => {
    expect(normalizeHexColor('#fff')).toBe('#ffffff');
    expect(normalizeHexColor(' #abc ')).toBe('#aabbcc');
    expect(normalizeHexColor('#123456')).toBe('#123456');
    expect(() => normalizeHexColor('fff0')).toThrow('Unsupported colour value');
  });

  it('sanitizes a Unicode recipient name and uses the required filename pattern', () => {
    const details = { ...cloneDefaultDetails(), recipientName: 'Zoë O’Neil', eventDate: '2026-10-27' };
    expect(makePdfFileName(details, new Date('2026-10-27T00:00:00'))).toBe('Certificate_Zoe_O_Neil_Participation_2026-10-27.pdf');
  });

  it('uses a safe blank recipient token for handwritten-name certificates', () => {
    const details = { ...cloneDefaultDetails(), leaveNameBlank: true };
    expect(makePdfFileName(details, new Date('2026-10-27T00:00:00'))).toContain('Certificate_Blank_Participation_');
  });

  it('rejects SVG and oversized signature files before decoding', async () => {
    const svg = new File(['<svg/>'], 'signature.svg', { type: 'image/svg+xml' });
    await expect(processSignature(svg, false)).rejects.toThrow('SVG files are not supported');
    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    await expect(processSignature(oversized, false)).rejects.toThrow('2 MB or smaller');
  });

  it('extracts dark ink from a JPG-style light background and keeps alpha anti-aliasing', () => {
    const pixels = new Uint8ClampedArray([
      250, 250, 250, 255,
      100, 110, 120, 255,
      230, 230, 230, 255,
    ]);
    removeLightBackgroundPixels(pixels);
    expect(pixels[3]).toBe(0);
    expect(pixels[7]).toBe(255);
    expect(Array.from(pixels.slice(4, 7))).toEqual([31, 35, 43]);
    expect(pixels[11]).toBeGreaterThan(0);
    expect(pixels[11]).toBeLessThan(255);
  });
});
