export const TEMPLATE_IDS = [
  'navy-gold',
  'ivory-ornate',
  'gold-waves',
  'blue-geometric',
  'black-gold-ribbon',
  'gold-frame',
  'soft-script',
  'victorian-ornate',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type PresetCertificateType = 'Participation' | 'Achievement' | 'Appreciation' | 'Completion';
export type CertificateType = PresetCertificateType | 'Custom';

export interface Signatory {
  name: string;
  designation: string;
}

export interface CertificateDetails {
  certificateType: CertificateType;
  customType: string;
  recipientName: string;
  leaveNameBlank: boolean;
  description: string;
  eventName: string;
  eventDate: string;
  signatories: Signatory[];
  referenceId: string;
}

export interface CertificateDraft {
  version: 2;
  savedAt: string;
  templateId: TemplateId | null;
  details: CertificateDetails;
}

export interface SignatureAssets {
  first: string;
  second: string;
  keepFirstBackground: boolean;
  keepSecondBackground: boolean;
}

export const DEFAULT_DETAILS: CertificateDetails = {
  certificateType: 'Participation',
  customType: '',
  recipientName: '',
  leaveNameBlank: false,
  description: '',
  eventName: '',
  eventDate: '',
  signatories: [{ name: '', designation: '' }],
  referenceId: '',
};

export function certificateTypeLabel(details: CertificateDetails): string {
  return details.certificateType === 'Custom' ? details.customType.trim() : details.certificateType;
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && TEMPLATE_IDS.includes(value as TemplateId);
}

export function cloneDefaultDetails(): CertificateDetails {
  return { ...DEFAULT_DETAILS, signatories: [{ name: '', designation: '' }] };
}
