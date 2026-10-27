import type { FontId } from '../lib/fonts/registry';
import type { TemplateId } from '../features/certificate/types';
import navyGoldArt from './art/navy-gold.svg?url';
import ivoryOrnateArt from './art/ivory-ornate.svg?url';
import goldWavesArt from './art/gold-waves.svg?url';
import blueGeometricArt from './art/blue-geometric.svg?url';
import blackGoldRibbonArt from './art/black-gold-ribbon.svg?url';
import goldFrameArt from './art/gold-frame.svg?url';
import softScriptArt from './art/soft-script.svg?url';
import victorianOrnateArt from './art/victorian-ornate.svg?url';

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  description: string;
  artUrl: string;
  titleFont: FontId;
  bodyFont: FontId;
  recipientFont: FontId;
  signerFont: FontId;
  background: string;
  ink: string;
  accent: string;
  institution: string;
  trackingPt: number;
  signerTrackingPt: number;
  artClearZones: readonly { x: number; y: number; width: number; height: number }[];
}

const topCenterLogoClearZone = { x: 120, y: 9, width: 57, height: 23 };

export const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 'navy-gold', name: 'Navy and Gold', description: 'Cream interior, gold scroll corners, and a swash serif title.',
    artUrl: navyGoldArt, titleFont: 'cormorant-400', bodyFont: 'cormorant-400', recipientFont: 'great-vibes-400', signerFont: 'dm-sans-400',
    background: '#fbf7ed', ink: '#192a45', accent: '#b88b3f', institution: '#26344f', trackingPt: 1.1, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'ivory-ornate', name: 'Ivory Ornate', description: 'Warm ivory with bronze corner ornaments and a fine divider.',
    artUrl: ivoryOrnateArt, titleFont: 'cormorant-400', bodyFont: 'dm-sans-400', recipientFont: 'great-vibes-400', signerFont: 'dm-sans-400',
    background: '#fcfaf5', ink: '#322c25', accent: '#a87835', institution: '#484138', trackingPt: 2.6, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'gold-waves', name: 'Gold Waves', description: 'Fine gold line-art ribbons with a charcoal serif title.',
    artUrl: goldWavesArt, titleFont: 'playfair-600', bodyFont: 'cormorant-400', recipientFont: 'great-vibes-400', signerFont: 'cormorant-400',
    background: '#fff', ink: '#2e2d2a', accent: '#c9a33d', institution: '#3c4556', trackingPt: 1, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'blue-geometric', name: 'Blue Geometric', description: 'Blue diagonal corners, fine inner rules, and a slab-serif title.',
    artUrl: blueGeometricArt, titleFont: 'roboto-slab-700', bodyFont: 'dm-sans-400', recipientFont: 'great-vibes-400', signerFont: 'roboto-slab-700',
    background: '#fff', ink: '#102b55', accent: '#467fcb', institution: '#26466f', trackingPt: 0.25, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'black-gold-ribbon', name: 'Black and Gold Ribbon', description: 'Black diagonal ribbons, gold edges, and a clear rosette.',
    artUrl: blackGoldRibbonArt, titleFont: 'playfair-600', bodyFont: 'cormorant-400', recipientFont: 'great-vibes-400', signerFont: 'cormorant-400',
    background: '#fff', ink: '#24211f', accent: '#c4a044', institution: '#37312b', trackingPt: 0.8, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'gold-frame', name: 'Gold Frame', description: 'A restrained triple-line frame and wide-tracked title.',
    artUrl: goldFrameArt, titleFont: 'cormorant-400', bodyFont: 'dm-sans-400', recipientFont: 'cormorant-400', signerFont: 'dm-sans-600',
    background: '#fff', ink: '#33302a', accent: '#b89143', institution: '#44413a', trackingPt: 3.2, signerTrackingPt: 0.6, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'soft-script', name: 'Soft Script', description: 'Warm off-white, fading waves, and a calligraphy title.',
    artUrl: softScriptArt, titleFont: 'great-vibes-400', bodyFont: 'dm-sans-400', recipientFont: 'great-vibes-400', signerFont: 'dm-sans-400',
    background: '#faf8f4', ink: '#393736', accent: '#77716b', institution: '#57534d', trackingPt: 2.1, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
  {
    id: 'victorian-ornate', name: 'Victorian Ornate', description: 'Fine Victorian gold filigree around a blackletter heading.',
    artUrl: victorianOrnateArt, titleFont: 'unifraktur-700', bodyFont: 'dm-sans-400', recipientFont: 'great-vibes-400', signerFont: 'dm-sans-400',
    background: '#fff', ink: '#191919', accent: '#b2873f', institution: '#4b463d', trackingPt: 0.2, signerTrackingPt: 0, artClearZones: [topCenterLogoClearZone],
  },
];

export function getTemplate(id: TemplateId | null): TemplateSpec | null {
  return id ? TEMPLATES.find((template) => template.id === id) ?? null : null;
}

export function glyphProblem(text: string, templateId: TemplateId, role: 'body' | 'display' | 'script' | 'signer'): string | null {
  // The font registry is loaded before any certificate route paints.
  // Import locally to keep template specs free of measurement implementation details.
  const template = TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  const fontId = role === 'body' ? template.bodyFont : role === 'display' ? template.titleFont : role === 'script' ? template.recipientFont : template.signerFont;
  return requireGlyphHelper(text, getCharacters(fontId));
}

import { getCharacterSet as getCharacters } from '../lib/fonts/registry';
import { firstUnsupportedCharacter as requireGlyphHelper } from '../features/certificate/sanitize';
