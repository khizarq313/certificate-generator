import { describe, expect, it } from 'vitest';
import { firstUnsupportedCharacter, sanitizeText } from '../../src/features/certificate/sanitize';
import { validateDetails } from '../../src/features/certificate/schema';
import { DEFAULT_DETAILS } from '../../src/features/certificate/types';
import { LIMITS } from '../../src/features/certificate/limits';

describe('text sanitizing and validation', () => {
  it('strips control and zero-width characters, collapses spacing, and truncates by code point', () => {
    expect(sanitizeText('  Zoë\u200b\n  Shah\u0001 ', 45, true)).toEqual({ value: 'Zoë Shah', truncated: false });
    expect(sanitizeText('W'.repeat(LIMITS.recipientName.max + 3), LIMITS.recipientName.max, true)).toEqual({ value: 'W'.repeat(LIMITS.recipientName.max), truncated: true });
  });

  it('reports an unsupported glyph by its actual character', () => {
    const latin = new Set(Array.from('ABCé ').map((character) => character.codePointAt(0) ?? 0));
    expect(firstUnsupportedCharacter('ABCé', latin)).toBeNull();
    expect(firstUnsupportedCharacter('A🙂', latin)).toBe('🙂');
  });

  it('enforces minimums, name letters, date limits, and glyph coverage', () => {
    const base = {
      ...DEFAULT_DETAILS,
      recipientName: '12',
      description: 'Too short',
      eventName: 'Go',
      eventDate: '1999-12-31',
      signatories: [{ name: '---', designation: 'A' }],
    };
    const issues = validateDetails(base, 'navy-gold', (text) => text.includes('🙂') ? '🙂' : null, new Date('2026-10-27T00:00:00'));
    expect(issues.map((issue) => issue.field)).toContain('recipientName');
    expect(issues.map((issue) => issue.field)).toContain('description');
    expect(issues.map((issue) => issue.field)).toContain('eventName');
    expect(issues.map((issue) => issue.field)).toContain('eventDate');
    expect(issues.map((issue) => issue.field)).toContain('signatories.0.name');
    expect(issues.map((issue) => issue.field)).toContain('signatories.0.designation');
  });

  it('allows the explicit blank-name option while keeping other fields required', () => {
    const details = {
      ...DEFAULT_DETAILS,
      leaveNameBlank: true,
      description: 'For participating in the student leadership programme.',
      eventName: 'SIESCOMS Student Forum',
      eventDate: '2026-10-27',
      signatories: [{ name: 'Asha Shah', designation: 'Dean' }],
    };
    expect(validateDetails(details, 'gold-frame', () => null, new Date('2026-10-27T00:00:00'))).toEqual([]);
  });

  it('accepts the configured maximum lengths for fields that do not affect the date range', () => {
    const details = {
      ...DEFAULT_DETAILS,
      certificateType: 'Custom' as const,
      customType: 'W'.repeat(LIMITS.customType.max),
      recipientName: 'W'.repeat(LIMITS.recipientName.max),
      description: 'W'.repeat(LIMITS.description.max),
      eventName: 'W'.repeat(LIMITS.eventName.max),
      eventDate: '2026-10-27',
      signatories: [{ name: 'W'.repeat(LIMITS.signatoryName.max), designation: 'W'.repeat(LIMITS.designation.max) }],
      referenceId: 'W'.repeat(LIMITS.referenceId.max),
    };
    const issues = validateDetails(details, 'navy-gold', () => null, new Date('2026-10-27T00:00:00'));
    expect(issues).toEqual([]);
  });
});
