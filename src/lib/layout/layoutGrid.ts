export const PAGE = { width: 297, height: 210, pdfWidthPt: 841.89, pdfHeightPt: 595.28, ptPerMm: 2.8346 } as const;

export const LAYOUT_GRID = {
  canvas: { width: PAGE.width, height: PAGE.height },
  safeRect: { x: 16, y: 10, width: 265, height: 180 },
  logo: { centerX: 148.5, y: 13, height: 14, exclusionPadding: 3 },
  institutionBaseline: 33,
  titleZone: { top: 38, bottom: 70 },
  titleBaseline: 52,
  typeBaseline: 64,
  presentedBaseline: 82,
  recipientBaseline: 99,
  recipientRuleY: 104,
  descriptionBaseline: 117,
  descriptionLineGap: 4.7,
  eventBaseline: 140,
  signatureBox: { top: 147, bottom: 164 },
  signerRuleY: 166,
  signerNameBaseline: 172.5,
  signerDesignationBaseline: 177.5,
  contentBottom: 184,
  referenceBaseline: 189,
  referenceFontPt: 7,
  // Template art may alter only the safe rectangle, and only when a frame requires it.
  templateExceptions: {} as Record<string, string>,
} as const;

export function rectsOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}
