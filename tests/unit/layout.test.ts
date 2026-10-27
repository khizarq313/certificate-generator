import { beforeAll, describe, expect, it } from 'vitest';
import { buildLayout } from '../../src/lib/layout/buildLayout';
import { LAYOUT_GRID } from '../../src/lib/layout/layoutGrid';
import { TEMPLATES } from '../../src/templates/registry';
import { cloneDefaultDetails, type CertificateDetails } from '../../src/features/certificate/types';
import { LIMITS } from '../../src/features/certificate/limits';
import { initializeTestFonts } from './font-fixtures';

beforeAll(() => initializeTestFonts());

function typicalDetails(): CertificateDetails {
  return {
    ...cloneDefaultDetails(),
    recipientName: 'Jo Li',
    description: 'For contributing with care to the student leadership programme.',
    eventName: 'SIESCOMS Leadership Forum',
    eventDate: '2026-10-27',
    signatories: [{ name: 'Asha Shah', designation: 'Dean, Academics' }],
  };
}

function maxDetails(): CertificateDetails {
  return {
    ...typicalDetails(),
    certificateType: 'Custom',
    customType: 'W'.repeat(LIMITS.customType.max),
    recipientName: 'W'.repeat(LIMITS.recipientName.max),
    description: 'W'.repeat(LIMITS.description.max),
    eventName: 'W'.repeat(LIMITS.eventName.max),
    referenceId: `W${'a'.repeat(LIMITS.referenceId.max - 1)}`,
    signatories: [
      { name: 'W'.repeat(LIMITS.signatoryName.max), designation: 'W'.repeat(LIMITS.designation.max) },
      { name: 'W'.repeat(LIMITS.signatoryName.max), designation: 'W'.repeat(LIMITS.designation.max) },
    ],
  };
}

describe('shared measured layout grid', () => {
  it('builds typical and maximum-length layouts for all eight approved templates', () => {
    expect(TEMPLATES).toHaveLength(8);
    for (const template of TEMPLATES) {
      const typical = buildLayout({ details: typicalDetails(), templateId: template.id, logoUrl: '/assets/siescoms-logo.png', logoAspectRatio: 2.33 });
      const maximum = buildLayout({ details: maxDetails(), templateId: template.id, logoUrl: '/assets/siescoms-logo.png', logoAspectRatio: 2.33 });
      expect(typical.width).toBe(297);
      expect(typical.height).toBe(210);
      expect(typical.operations.some((operation) => operation.key === 'art')).toBe(true);
      expect(maximum.operations.filter((operation) => operation.key.startsWith('description-')).length).toBeLessThanOrEqual(3);
      expect(maximum.operations.some((operation) => operation.key === 'reference')).toBe(true);
      for (const operation of maximum.operations) {
        if (operation.type === 'text' && operation.key !== 'reference') expect(operation.y).toBeLessThanOrEqual(LAYOUT_GRID.contentBottom);
      }
    }
  });

  it('anchors single and dual signer blocks at the same grid positions', () => {
    const single = buildLayout({ details: typicalDetails(), templateId: 'blue-geometric' });
    const dual = buildLayout({ details: { ...typicalDetails(), signatories: [...typicalDetails().signatories, { name: 'Dev Patel', designation: 'Director' }] }, templateId: 'blue-geometric' });
    expect(single.operations.find((operation) => operation.key === 'signer-rule-1')?.type).toBe('line');
    expect(dual.operations.filter((operation) => operation.type === 'line' && operation.key.startsWith('signer-rule-'))).toHaveLength(2);
    expect(dual.operations.find((operation) => operation.key === 'signer-name-2')?.type).toBe('text');
  });

  it('reserves the long manual-writing line at the fixed name baseline', () => {
    const details = { ...typicalDetails(), recipientName: '', leaveNameBlank: true };
    const layout = buildLayout({ details, templateId: 'gold-frame' });
    const line = layout.operations.find((operation) => operation.key === 'recipient-rule');
    expect(line?.type).toBe('line');
    if (line?.type === 'line') expect(line.x2 - line.x1).toBe(180);
    expect(layout.operations.some((operation) => operation.type === 'text' && operation.key === 'recipient')).toBe(false);
  });

});
