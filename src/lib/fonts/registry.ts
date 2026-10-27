import cormorant400 from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';
import dmSans400 from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2?url';
import dmSans600 from '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2?url';
import greatVibes400 from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2?url';
import playfair600 from '@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2?url';
import robotoSlab700 from '@fontsource/roboto-slab/files/roboto-slab-latin-700-normal.woff2?url';
import unifraktur700 from '@fontsource/unifrakturcook/files/unifrakturcook-latin-700-normal.woff2?url';

export const FONT_IDS = [
  'cormorant-400', 'dm-sans-400', 'dm-sans-600',
  'great-vibes-400', 'playfair-600', 'roboto-slab-700', 'unifraktur-700',
] as const;

export type FontId = (typeof FONT_IDS)[number];

interface ShapedPosition { xAdvance: number; }
interface ShapedRun { glyphs: Array<{ id: number }>; positions: ShapedPosition[]; }
interface ParsedFont {
  familyName: string;
  postscriptName: string;
  unitsPerEm: number;
  characterSet: number[];
  layout(text: string): ShapedRun;
}

export interface FontAsset {
  id: FontId;
  family: string;
  weight: number;
  url: string;
  bytes: Uint8Array;
  parsed: ParsedFont;
  characterSet: ReadonlySet<number>;
}

const definitions: Record<FontId, { family: string; weight: number; url: string }> = {
  'cormorant-400': { family: 'Cormorant Garamond', weight: 400, url: cormorant400 },
  'dm-sans-400': { family: 'DM Sans', weight: 400, url: dmSans400 },
  'dm-sans-600': { family: 'DM Sans', weight: 600, url: dmSans600 },
  'great-vibes-400': { family: 'Great Vibes', weight: 400, url: greatVibes400 },
  'playfair-600': { family: 'Playfair Display', weight: 600, url: playfair600 },
  'roboto-slab-700': { family: 'Roboto Slab', weight: 700, url: robotoSlab700 },
  'unifraktur-700': { family: 'UnifrakturCook', weight: 700, url: unifraktur700 },
};

let registryPromise: Promise<Map<FontId, FontAsset>> | null = null;
let registry: Map<FontId, FontAsset> | null = null;

export function loadFontRegistry(): Promise<Map<FontId, FontAsset>> {
  if (!registryPromise) {
    registryPromise = (async () => {
      const { default: fontkit } = await import('@cantoo/fontkit');
      const entries = await Promise.all(FONT_IDS.map(async (id) => {
        const definition = definitions[id];
        if (typeof document !== 'undefined') await document.fonts.load(`${definition.weight} 16px "${definition.family}"`);
        const response = await fetch(definition.url);
        if (!response.ok) throw new Error(`Unable to load ${definition.family} font (${response.status}).`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const parsed = fontkit.create(bytes) as unknown as ParsedFont;
        return [id, {
          id,
          ...definition,
          bytes,
          parsed,
          characterSet: new Set(parsed.characterSet),
        }] as const;
      }));
      registry = new Map(entries);
      return registry;
    })();
  }
  return registryPromise;
}

export function getFontRegistry(): Map<FontId, FontAsset> {
  if (!registry) throw new Error('Font metrics are not ready yet.');
  return registry;
}

export function measureText(fontId: FontId, text: string, sizePt: number, trackingPt = 0): number {
  const font = getFontRegistry().get(fontId)?.parsed;
  if (!font) throw new Error(`Missing metrics for font ${fontId}.`);
  if (!text) return 0;
  const run = font.layout(text);
  const advances = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
  return (advances / font.unitsPerEm) * sizePt + Math.max(0, run.glyphs.length - 1) * trackingPt;
}

export function getCharacterSet(fontId: FontId): ReadonlySet<number> {
  const asset = getFontRegistry().get(fontId);
  if (!asset) throw new Error(`Missing glyph data for font ${fontId}.`);
  return asset.characterSet;
}

export function setFontRegistryForTests(assets: Map<FontId, FontAsset>): void {
  registry = assets;
  registryPromise = Promise.resolve(assets);
}
