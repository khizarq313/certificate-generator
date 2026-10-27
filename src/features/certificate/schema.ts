import { DEFAULT_DETAILS, TEMPLATE_IDS, type CertificateDetails, type CertificateDraft, type TemplateId } from './types';
import { LIMITS } from './limits';
import { cleanForValidation } from './sanitize';

export interface ValidationIssue {
  field: string;
  message: string;
}

export type GlyphChecker = (text: string, templateId: TemplateId, role: 'body' | 'display' | 'script' | 'signer') => string | null;

export function normalizeDetails(value: unknown): CertificateDetails {
  if (!value || typeof value !== 'object') return { ...DEFAULT_DETAILS, signatories: [{ name: '', designation: '' }] };
  const candidate = value as Partial<CertificateDetails>;
  const signatories = Array.isArray(candidate.signatories)
    ? candidate.signatories.slice(0, 2).map((signatory) => ({
        name: typeof signatory?.name === 'string' ? cleanForValidation(signatory.name, LIMITS.signatoryName.max) : '',
        designation: typeof signatory?.designation === 'string' ? cleanForValidation(signatory.designation, LIMITS.designation.max) : '',
      }))
    : [];
  return {
    certificateType: ['Participation', 'Achievement', 'Appreciation', 'Completion', 'Custom'].includes(String(candidate.certificateType))
      ? candidate.certificateType as CertificateDetails['certificateType']
      : DEFAULT_DETAILS.certificateType,
    customType: typeof candidate.customType === 'string' ? cleanForValidation(candidate.customType, LIMITS.customType.max) : '',
    recipientName: typeof candidate.recipientName === 'string' ? cleanForValidation(candidate.recipientName, LIMITS.recipientName.max) : '',
    leaveNameBlank: candidate.leaveNameBlank === true,
    description: typeof candidate.description === 'string' ? cleanForValidation(candidate.description, LIMITS.description.max) : '',
    eventName: typeof candidate.eventName === 'string' ? cleanForValidation(candidate.eventName, LIMITS.eventName.max) : '',
    eventDate: typeof candidate.eventDate === 'string' ? candidate.eventDate : '',
    signatories: signatories.length > 0 ? signatories : [{ name: '', designation: '' }],
    referenceId: typeof candidate.referenceId === 'string'
      ? cleanForValidation(candidate.referenceId.replace(/[^A-Za-z0-9/_-]/gu, ''), LIMITS.referenceId.max)
      : '',
  };
}

export function readDraftShape(value: unknown): CertificateDraft | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<CertificateDraft>;
  if (candidate.version !== 2 || typeof candidate.savedAt !== 'string') return null;
  const templateId = candidate.templateId;
  if (templateId !== null && !TEMPLATE_IDS.includes(templateId as TemplateId)) return null;
  return {
    version: 2,
    savedAt: candidate.savedAt,
    templateId: templateId as TemplateId | null,
    details: normalizeDetails(candidate.details),
  };
}

export function validateDetails(
  input: CertificateDetails,
  templateId: TemplateId | null,
  glyphChecker: GlyphChecker,
  today = new Date(),
): ValidationIssue[] {
  const details = normalizeDetails(input);
  const issues: ValidationIssue[] = [];
  const checkLength = (field: string, value: string, min: number, max: number, label: string) => {
    if (value.length < min) issues.push({ field, message: `${label} must be at least ${min} characters.` });
    else if (value.length > max) issues.push({ field, message: `${label} must be ${max} characters or fewer.` });
  };
  const checkName = (field: string, value: string, min: number, max: number, label: string, role: 'script' | 'signer') => {
    checkLength(field, value, min, max, label);
    if (value.length >= min && !/\p{L}/u.test(value)) issues.push({ field, message: `${label} must include at least one letter.` });
    if (templateId && value) {
      const character = glyphChecker(value, templateId, role);
      if (character) issues.push({ field, message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
    }
  };

  if (details.certificateType === 'Custom') {
    checkLength('customType', details.customType, LIMITS.customType.min, LIMITS.customType.max, 'Custom certificate type');
    if (templateId && details.customType) {
      const character = glyphChecker(details.customType.toUpperCase(), templateId, 'display');
      if (character) issues.push({ field: 'customType', message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
    }
  }
  if (!details.leaveNameBlank) checkName('recipientName', details.recipientName, LIMITS.recipientName.min, LIMITS.recipientName.max, 'Recipient name', 'script');
  checkLength('description', details.description, LIMITS.description.min, LIMITS.description.max, 'Description');
  if (templateId && details.description) {
    const character = glyphChecker(details.description, templateId, 'body');
    if (character) issues.push({ field: 'description', message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
  }
  checkLength('eventName', details.eventName, LIMITS.eventName.min, LIMITS.eventName.max, 'Event name');
  if (templateId && details.eventName) {
    const character = glyphChecker(details.eventName, templateId, 'body');
    if (character) issues.push({ field: 'eventName', message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
  }

  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(details.eventDate);
  const eventDate = dateParts
    ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
    : new Date(Number.NaN);
  const validCalendarDate = Boolean(dateParts)
    && eventDate.getFullYear() === Number(dateParts?.[1])
    && eventDate.getMonth() + 1 === Number(dateParts?.[2])
    && eventDate.getDate() === Number(dateParts?.[3]);
  const minDate = new Date('2000-01-01T00:00:00');
  const maxDate = new Date(`${getDateMax(today)}T00:00:00`);
  if (!details.eventDate || !validCalendarDate || Number.isNaN(eventDate.valueOf()) || details.eventDate < '2000-01-01' || eventDate > maxDate || eventDate < minDate) {
    issues.push({ field: 'eventDate', message: `Choose a valid date from 2000-01-01 through ${getDateMax(today)}.` });
  }
  checkName('signatories.0.name', details.signatories[0]?.name ?? '', LIMITS.signatoryName.min, LIMITS.signatoryName.max, 'First signatory name', 'signer');
  checkLength('signatories.0.designation', details.signatories[0]?.designation ?? '', LIMITS.designation.min, LIMITS.designation.max, 'First signatory designation');
  if (templateId && details.signatories[0]?.designation) {
    const character = glyphChecker(details.signatories[0].designation, templateId, 'signer');
    if (character) issues.push({ field: 'signatories.0.designation', message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
  }
  details.signatories.slice(1).forEach((signatory) => {
    checkName('signatories.1.name', signatory.name, LIMITS.signatoryName.min, LIMITS.signatoryName.max, 'Second signatory name', 'signer');
    checkLength('signatories.1.designation', signatory.designation, LIMITS.designation.min, LIMITS.designation.max, 'Second signatory designation');
    if (templateId && signatory.designation) {
      const character = glyphChecker(signatory.designation, templateId, 'signer');
      if (character) issues.push({ field: 'signatories.1.designation', message: `The selected template font cannot print “${character}”. Remove it or choose a supported character.` });
    }
  });
  if (details.referenceId && !/^[A-Za-z0-9/_-]{1,28}$/u.test(details.referenceId)) {
    issues.push({ field: 'referenceId', message: 'Reference ID can use up to 28 letters, numbers, slash, underscore, or hyphen.' });
  }
  return issues;
}

function getDateMax(today: Date): string {
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  max.setDate(max.getDate() + 366);
  return [max.getFullYear(), String(max.getMonth() + 1).padStart(2, '0'), String(max.getDate()).padStart(2, '0')].join('-');
}

