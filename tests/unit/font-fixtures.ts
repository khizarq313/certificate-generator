import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fontkit from '@cantoo/fontkit';
import { setFontRegistryForTests, type FontAsset, type FontId } from '../../src/lib/fonts/registry';

const files: Record<FontId, { family: string; weight: number; path: string }> = {
  'cormorant-400': { family: 'Cormorant Garamond', weight: 400, path: 'cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2' },
  'dm-sans-400': { family: 'DM Sans', weight: 400, path: 'dm-sans/files/dm-sans-latin-400-normal.woff2' },
  'dm-sans-600': { family: 'DM Sans', weight: 600, path: 'dm-sans/files/dm-sans-latin-600-normal.woff2' },
  'great-vibes-400': { family: 'Great Vibes', weight: 400, path: 'great-vibes/files/great-vibes-latin-400-normal.woff2' },
  'playfair-600': { family: 'Playfair Display', weight: 600, path: 'playfair-display/files/playfair-display-latin-600-normal.woff2' },
  'roboto-slab-700': { family: 'Roboto Slab', weight: 700, path: 'roboto-slab/files/roboto-slab-latin-700-normal.woff2' },
  'unifraktur-700': { family: 'UnifrakturCook', weight: 700, path: 'unifrakturcook/files/unifrakturcook-latin-700-normal.woff2' },
};

export function initializeTestFonts() {
  const assets = new Map<FontId, FontAsset>();
  for (const [id, definition] of Object.entries(files) as Array<[FontId, (typeof files)[FontId]]>) {
    const bytes = new Uint8Array(readFileSync(resolve('node_modules/@fontsource', definition.path)));
    const parsed = fontkit.create(bytes);
    assets.set(id, {
      id,
      family: definition.family,
      weight: definition.weight,
      url: '',
      bytes,
      parsed,
      characterSet: new Set(parsed.characterSet),
    } as FontAsset);
  }
  setFontRegistryForTests(assets);
}
