import { certificateTypeLabel, type CertificateDetails, type TemplateId } from '../../features/certificate/types';
import { getTemplate } from '../../templates/registry';
import { getFontRegistry, measureText, type FontId } from '../fonts/registry';
import { LAYOUT_GRID, PAGE, rectsOverlap } from './layoutGrid';

export type DrawOperation =
  | { type: 'image'; key: string; href: string; x: number; y: number; width: number; height: number; preserveAspectRatio: 'none' | 'meet' }
  | { type: 'text'; key: string; text: string; x: number; y: number; align: 'start' | 'middle' | 'end'; fontId: FontId; family: string; sizePt: number; color: string; trackingPt: number }
  | { type: 'line'; key: string; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: 'rect'; key: string; x: number; y: number; width: number; height: number; fill: string };

export interface LayoutInput {
  details: CertificateDetails;
  templateId: TemplateId;
  signatureImages?: string[];
  logoUrl?: string;
  logoAspectRatio?: number;
  artUrlOverride?: string;
}

export interface CertificateLayout {
  width: number;
  height: number;
  templateId: TemplateId;
  safeRect: typeof LAYOUT_GRID.safeRect;
  logoExclusion: { x: number; y: number; width: number; height: number };
  operations: DrawOperation[];
  warnings: string[];
}

const TEXT_MAX_WIDTH = LAYOUT_GRID.safeRect.width;
const CENTER_X = PAGE.width / 2;
const PT_PER_MM = PAGE.ptPerMm;

export function buildLayout(input: LayoutInput): CertificateLayout {
  if (!getFontRegistry().size) throw new Error('Font metrics must be loaded before building a certificate.');
  const template = getTemplate(input.templateId);
  if (!template) throw new Error(`Unknown certificate template: ${input.templateId}`);
  const details = input.details;
  const operations: DrawOperation[] = [];
  const warnings: string[] = [];
  const logoAspect = input.logoAspectRatio ?? 1.5;
  const logoHeight = LAYOUT_GRID.logo.height;
  const logoWidth = logoHeight * logoAspect;
  const logoX = CENTER_X - logoWidth / 2;
  const logoExclusion = {
    x: logoX - LAYOUT_GRID.logo.exclusionPadding,
    y: LAYOUT_GRID.logo.y - LAYOUT_GRID.logo.exclusionPadding,
    width: logoWidth + LAYOUT_GRID.logo.exclusionPadding * 2,
    height: logoHeight + LAYOUT_GRID.logo.exclusionPadding * 2,
  };

  operations.push({ type: 'rect', key: 'page-background', x: 0, y: 0, width: PAGE.width, height: PAGE.height, fill: template.background });
  operations.push({
    type: 'image', key: 'art', href: input.artUrlOverride ?? template.artUrl,
    x: 0, y: 0, width: PAGE.width, height: PAGE.height, preserveAspectRatio: 'none',
  });
  if (input.logoUrl) operations.push({
    type: 'image', key: 'logo', href: input.logoUrl,
    x: logoX, y: LAYOUT_GRID.logo.y, width: logoWidth, height: logoHeight, preserveAspectRatio: 'meet',
  });

  addText(operations, 'institution', 'SIES COLLEGE OF MANAGEMENT STUDIES · NERUL, NAVI MUMBAI', CENTER_X, LAYOUT_GRID.institutionBaseline, 'middle', template.bodyFont, 6.2, template.institution, 0.45);

  const typeLabel = certificateTypeLabel(details).toUpperCase();
  const titleSize = input.templateId === 'soft-script' ? 43 : 34;
  if (input.templateId === 'victorian-ornate') {
    const blackletterTitle = `Certificate of ${certificateTypeLabel(details)}`;
    const fittedBlackletter = fitSingleLine(blackletterTitle, template.titleFont, 28, 18, TEXT_MAX_WIDTH, 0.1);
    if (fittedBlackletter.overflow) warnings.push('The blackletter heading overflowed at its minimum size.');
    addText(operations, 'title', blackletterTitle, CENTER_X, 56, 'middle', template.titleFont, fittedBlackletter.sizePt, template.ink, 0.1);
  } else if (input.templateId === 'soft-script') {
    addText(operations, 'title', 'Certificate', 122, 55, 'end', template.titleFont, titleSize, template.ink, 0);
  } else {
    addText(operations, 'title', 'CERTIFICATE', CENTER_X, LAYOUT_GRID.titleBaseline, 'middle', template.titleFont, titleSize, template.ink, template.trackingPt);
  }
  const typeWidth = input.templateId === 'soft-script' ? 105 : 220;
  if (input.templateId !== 'victorian-ornate') {
    const fittedType = fitSingleLine(`OF ${typeLabel}`, template.bodyFont, 18, 14, typeWidth, 0.65);
    if (fittedType.overflow) warnings.push(`Type heading overflowed its safe width in ${template.name}.`);
    addText(operations, 'type', `OF ${typeLabel}`, input.templateId === 'soft-script' ? 132 : CENTER_X, input.templateId === 'soft-script' ? 55 : LAYOUT_GRID.typeBaseline, input.templateId === 'soft-script' ? 'start' : 'middle', template.bodyFont, fittedType.sizePt, template.accent, 0.65);
  }

  addText(operations, 'presented', 'PROUDLY PRESENTED TO', CENTER_X, LAYOUT_GRID.presentedBaseline, 'middle', template.bodyFont, 9, template.ink, 1.15);
  const recipient = details.leaveNameBlank ? '' : details.recipientName.trim();
  const recipientFit = fitSingleLine(recipient, template.recipientFont, 44, 24, TEXT_MAX_WIDTH, 0);
  if (recipientFit.overflow && recipient) {
    warnings.push('Recipient name required a hard break at the minimum 24 pt size.');
    addHardBreak(operations, 'recipient', recipient, template.recipientFont, 24, template.ink, 90.5, 99, 249);
  } else if (recipient) {
    addText(operations, 'recipient', recipient, CENTER_X, LAYOUT_GRID.recipientBaseline, 'middle', template.recipientFont, recipientFit.sizePt, template.ink, 0);
  }
  const recipientRuleWidth = details.leaveNameBlank ? 180 : 214;
  const recipientRuleColor = template.accent;
  operations.push({
    type: 'line', key: 'recipient-rule', x1: CENTER_X - recipientRuleWidth / 2,
    y1: LAYOUT_GRID.recipientRuleY, x2: CENTER_X + recipientRuleWidth / 2,
    y2: LAYOUT_GRID.recipientRuleY, color: recipientRuleColor, width: details.leaveNameBlank ? 0.45 : 0.3,
  });
  if (input.templateId === 'gold-waves') {
    operations.push({ type: 'line', key: 'name-rule-dot-left', x1: CENTER_X - recipientRuleWidth / 2, y1: 104, x2: CENTER_X - recipientRuleWidth / 2 + 0.01, y2: 104, color: template.accent, width: 1.2 });
    operations.push({ type: 'line', key: 'name-rule-dot-right', x1: CENTER_X + recipientRuleWidth / 2, y1: 104, x2: CENTER_X + recipientRuleWidth / 2 + 0.01, y2: 104, color: template.accent, width: 1.2 });
  }

  const descriptionLines = balancedWrap(details.description.trim(), template.bodyFont, 12, TEXT_MAX_WIDTH, 3);
  descriptionLines.lines.forEach((line, index) => addText(
    operations, `description-${index + 1}`, line, CENTER_X,
    LAYOUT_GRID.descriptionBaseline + index * LAYOUT_GRID.descriptionLineGap,
    'middle', template.bodyFont, 12, template.ink, 0,
  ));
  if (descriptionLines.warnings.length) warnings.push(...descriptionLines.warnings);

  const eventDate = details.eventDate ? formatDate(details.eventDate) : '';
  const eventLine = [details.eventName.trim(), eventDate].filter(Boolean).join('  ·  ');
  const eventFit = fitSingleLine(eventLine, template.bodyFont, 12, 9, TEXT_MAX_WIDTH, 0.1);
  if (eventFit.overflow) warnings.push('Event and date line overflowed at the 9 pt minimum.');
  addText(operations, 'event-date', eventLine, CENTER_X, LAYOUT_GRID.eventBaseline, 'middle', template.bodyFont, eventFit.sizePt, template.ink, 0.1);

  const signerCenters = details.signatories.length > 1 ? [88, 209] : [CENTER_X];
  details.signatories.slice(0, 2).forEach((signatory, index) => {
    const center = signerCenters[index];
    const ruleWidth = details.signatories.length > 1 ? 68 : 110;
    const signatureImage = input.signatureImages?.[index];
    if (signatureImage) operations.push({
      type: 'image', key: `signature-${index + 1}`, href: signatureImage,
      x: center - (details.signatories.length > 1 ? 30 : 42), y: LAYOUT_GRID.signatureBox.top,
      width: details.signatories.length > 1 ? 60 : 84, height: LAYOUT_GRID.signatureBox.bottom - LAYOUT_GRID.signatureBox.top,
      preserveAspectRatio: 'meet',
    });
    operations.push({ type: 'line', key: `signer-rule-${index + 1}`, x1: center - ruleWidth / 2, y1: LAYOUT_GRID.signerRuleY, x2: center + ruleWidth / 2, y2: LAYOUT_GRID.signerRuleY, color: template.accent, width: 0.35 });
    const signerName = fitSingleLine(signatory.name.trim(), template.signerFont, 10, 8, ruleWidth - 2, template.signerTrackingPt);
    const signerRole = fitSingleLine(signatory.designation.trim(), template.signerFont, 9, 7, ruleWidth - 2, template.signerTrackingPt);
    if (signerName.overflow || signerRole.overflow) warnings.push(`Signatory ${index + 1} required a hard break at its minimum size.`);
    addText(operations, `signer-name-${index + 1}`, signatory.name.trim(), center, LAYOUT_GRID.signerNameBaseline, 'middle', template.signerFont, signerName.sizePt, template.ink, template.signerTrackingPt);
    addText(operations, `signer-role-${index + 1}`, signatory.designation.trim(), center, LAYOUT_GRID.signerDesignationBaseline, 'middle', template.signerFont, signerRole.sizePt, template.ink, template.signerTrackingPt);
  });

  if (details.referenceId.trim()) {
    addText(operations, 'reference', `REFERENCE · ${details.referenceId.trim()}`, CENTER_X, LAYOUT_GRID.referenceBaseline, 'middle', 'dm-sans-400', LAYOUT_GRID.referenceFontPt, template.institution, 0.15);
  }

  const result: CertificateLayout = {
    width: PAGE.width, height: PAGE.height, templateId: template.id,
    safeRect: LAYOUT_GRID.safeRect, logoExclusion, operations, warnings,
  };
  const logoZoneCovered = template.artClearZones.some((zone) => zone.x <= logoExclusion.x
    && zone.y <= logoExclusion.y
    && zone.x + zone.width >= logoExclusion.x + logoExclusion.width
    && zone.y + zone.height >= logoExclusion.y + logoExclusion.height);
  if (!logoZoneCovered) throw new Error(`Layout assertion failed: ${template.name} art has no clear zone for the logo.`);
  assertLayout(result);
  return result;
}

export function assertLayout(layout: CertificateLayout): void {
  const safe = layout.safeRect;
  const textBounds: Array<{ key: string; rect: { x: number; y: number; width: number; height: number } }> = [];
  for (const operation of layout.operations) {
    if (operation.type === 'text') {
      const widthMm = measureText(operation.fontId, operation.text, operation.sizePt, operation.trackingPt) / PT_PER_MM;
      const x = operation.align === 'middle' ? operation.x - widthMm / 2 : operation.align === 'end' ? operation.x - widthMm : operation.x;
      const textHeight = operation.sizePt / PT_PER_MM;
      const bounds = { x, y: operation.y - textHeight * 0.82, width: widthMm, height: textHeight };
      textBounds.push({ key: operation.key, rect: bounds });
      const rightException = operation.key === 'reference';
      if (bounds.x < safe.x - 0.5 || bounds.x + bounds.width > safe.x + safe.width + 0.5 || bounds.y < safe.y || bounds.y + bounds.height > PAGE.height) {
        throw new Error(`Layout assertion failed: ${operation.key} lies outside the safe area (x=${bounds.x.toFixed(2)}, width=${widthMm.toFixed(2)}, baseline=${operation.y.toFixed(2)}).`);
      }
      if (operation.key !== 'reference' && operation.y > LAYOUT_GRID.contentBottom) throw new Error(`Layout assertion failed: ${operation.key} is below the content grid.`);
      if (rectsOverlap(bounds, layout.logoExclusion)) throw new Error(`Layout assertion failed: ${operation.key} overlaps the logo exclusion zone.`);
      if (rightException && operation.y !== LAYOUT_GRID.referenceBaseline) throw new Error('Reference line must use the footer baseline.');
    }
    if (operation.type === 'line' && rectsOverlap({ x: Math.min(operation.x1, operation.x2), y: Math.min(operation.y1, operation.y2) - operation.width, width: Math.abs(operation.x2 - operation.x1) || operation.width, height: Math.abs(operation.y2 - operation.y1) + operation.width * 2 }, layout.logoExclusion)) {
      throw new Error(`Layout assertion failed: ${operation.key} overlaps the logo exclusion zone.`);
    }
  }
  for (let first = 0; first < textBounds.length; first += 1) {
    for (let second = first + 1; second < textBounds.length; second += 1) {
      const a = textBounds[first];
      const b = textBounds[second];
      if (rectsOverlap(a.rect, b.rect)) throw new Error(`Layout assertion failed: ${a.key} overlaps ${b.key}.`);
    }
  }
}

function addText(operations: DrawOperation[], key: string, text: string, x: number, y: number, align: 'start' | 'middle' | 'end', fontId: FontId, sizePt: number, color: string, trackingPt: number): void {
  if (!text) return;
  const fontAsset = getFontRegistry().get(fontId);
  if (!fontAsset) throw new Error(`Missing font definition for ${fontId}.`);
  operations.push({ type: 'text', key, text, x, y, align, fontId, family: fontAsset.family, sizePt, color, trackingPt });
}

function fitSingleLine(text: string, font: FontId, maximumPt: number, minimumPt: number, widthMm: number, trackingPt: number): { sizePt: number; overflow: boolean } {
  if (!text) return { sizePt: maximumPt, overflow: false };
  for (let size = maximumPt; size >= minimumPt; size -= 1) {
    if (measureText(font, text, size, trackingPt) / PT_PER_MM <= widthMm) return { sizePt: size, overflow: false };
  }
  return { sizePt: minimumPt, overflow: true };
}

function balancedWrap(text: string, font: FontId, sizePt: number, maxWidthMm: number, maxLines: number): { lines: string[]; warnings: string[] } {
  const measured = wrapMeasured(text, font, sizePt, maxWidthMm);
  if (measured.lines.length <= maxLines) return measured;
  const warnings = [...measured.warnings, `Description needed ${measured.lines.length} lines; capped to the three-line text zone.`];
  return { lines: measured.lines.slice(0, maxLines), warnings };
}

function wrapMeasured(text: string, font: FontId, sizePt: number, maxWidthMm: number): { lines: string[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!text) return { lines: [], warnings };
  const words = text.split(/\s+/u).filter(Boolean);
  const brokenWords: string[] = [];
  for (const word of words) {
    if (measureText(font, word, sizePt) / PT_PER_MM <= maxWidthMm) {
      brokenWords.push(word);
      continue;
    }
    warnings.push(`An unbroken word was split to fit: ${word.slice(0, 12)}…`);
    let segment = '';
    for (const character of Array.from(word)) {
      const candidate = segment + character;
      if (segment && measureText(font, candidate, sizePt) / PT_PER_MM > maxWidthMm) {
        brokenWords.push(segment);
        segment = character;
      } else segment = candidate;
    }
    if (segment) brokenWords.push(segment);
  }

  const lineCountAt = (width: number) => greedyWrap(brokenWords, font, sizePt, width).length;
  const targetCount = lineCountAt(maxWidthMm);
  let low = Math.max(28, maxWidthMm * 0.35);
  let high = maxWidthMm;
  if (targetCount > 1) {
    for (let pass = 0; pass < 16; pass += 1) {
      const middle = (low + high) / 2;
      if (lineCountAt(middle) <= targetCount) high = middle;
      else low = middle;
    }
  }
  const lines = balancedWrapAtWidth(brokenWords, font, sizePt, high + 0.05, targetCount);
  return { lines, warnings };
}

function greedyWrap(words: string[], font: FontId, sizePt: number, widthMm: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureText(font, candidate, sizePt) / PT_PER_MM > widthMm) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function balancedWrapAtWidth(words: string[], font: FontId, sizePt: number, widthMm: number, lineCount: number): string[] {
  const widthOf = (start: number, end: number) => measureText(font, words.slice(start, end).join(' '), sizePt) / PT_PER_MM;
  const targetWidth = words.reduce((sum, _word, index) => sum + measureText(font, `${_word}${index === 0 ? '' : ' '}`, sizePt) / PT_PER_MM, 0) / lineCount;
  const memo = new Map<string, { cost: number; lines: string[] } | null>();
  const solve = (start: number, remaining: number): { cost: number; lines: string[] } | null => {
    const key = `${start}:${remaining}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    if (remaining === 1) {
      const width = widthOf(start, words.length);
      const value = width <= widthMm ? { cost: Math.pow(targetWidth - width, 2) + (words.length - start === 1 && words.length > 1 ? widthMm ** 2 : 0), lines: [words.slice(start).join(' ')] } : null;
      memo.set(key, value);
      return value;
    }
    let best: { cost: number; lines: string[] } | null = null;
    for (let end = start + 1; end <= words.length - remaining + 1; end += 1) {
      const width = widthOf(start, end);
      if (width > widthMm) break;
      const next = solve(end, remaining - 1);
      if (!next) continue;
      const orphanPenalty = end - start === 1 && words.length > remaining ? widthMm ** 2 : 0;
      const cost = next.cost + Math.pow(targetWidth - width, 2) + orphanPenalty;
      if (!best || cost < best.cost) best = { cost, lines: [words.slice(start, end).join(' '), ...next.lines] };
    }
    memo.set(key, best);
    return best;
  };
  return solve(0, Math.min(lineCount, words.length))?.lines ?? greedyWrap(words, font, sizePt, widthMm);
}

function addHardBreak(operations: DrawOperation[], key: string, text: string, font: FontId, size: number, color: string, firstY: number, secondY: number, maxWidthMm: number): void {
  const chars = Array.from(text);
  const lines: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = start;
    while (end < chars.length) {
      const candidate = chars.slice(start, end + 1).join('');
      if (end > start && measureText(font, candidate, size) / PT_PER_MM > maxWidthMm) break;
      end += 1;
    }
    lines.push(chars.slice(start, end).join(''));
    start = end;
  }
  const spacing = (secondY - firstY) / Math.max(1, lines.length - 1);
  lines.forEach((line, index) => addText(operations, `${key}-hard-break-${index + 1}`, line, CENTER_X, firstY + spacing * index, 'middle', font, size, color, 0));
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

