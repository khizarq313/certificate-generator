import { readDraftShape } from './schema';
import { type CertificateDraft, type CertificateDetails, type SignatureAssets } from './types';

export const DRAFT_KEY = 'certifyx:v2:draft';
export const SIGNATURE_ONE_KEY = 'certifyx:v2:sig:1';
export const SIGNATURE_TWO_KEY = 'certifyx:v2:sig:2';
const LEGACY_KEYS = new Set(['certifyx-draft', 'certifyx-history']);

export interface RestoredState {
  draft: CertificateDraft | null;
  signatures: SignatureAssets;
  storageAvailable: boolean;
}

export function restoreState(storage: Storage | null = getStorage()): RestoredState {
  const defaults: RestoredState = {
    draft: null,
    signatures: { first: '', second: '', keepFirstBackground: false, keepSecondBackground: false },
    storageAvailable: storage !== null,
  };
  if (!storage) return defaults;
  try {
    const draft = readDraftShape(JSON.parse(storage.getItem(DRAFT_KEY) ?? 'null'));
    const firstSignature = storage.getItem(SIGNATURE_ONE_KEY) ?? '';
    const secondSignature = storage.getItem(SIGNATURE_TWO_KEY) ?? '';
    return {
      draft,
      signatures: {
        first: firstSignature,
        second: secondSignature,
        keepFirstBackground: storage.getItem(`${SIGNATURE_ONE_KEY}:keep-background`) === 'true',
        keepSecondBackground: storage.getItem(`${SIGNATURE_TWO_KEY}:keep-background`) === 'true',
      },
      storageAvailable: true,
    };
  } catch {
    return defaults;
  }
}

export function writeDraft(draft: CertificateDraft, storage: Storage | null = getStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function writeSignatureAssets(signatures: SignatureAssets, storage: Storage | null = getStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SIGNATURE_ONE_KEY, signatures.first);
    storage.setItem(SIGNATURE_TWO_KEY, signatures.second);
    storage.setItem(`${SIGNATURE_ONE_KEY}:keep-background`, String(signatures.keepFirstBackground));
    storage.setItem(`${SIGNATURE_TWO_KEY}:keep-background`, String(signatures.keepSecondBackground));
    return true;
  } catch {
    return false;
  }
}

export function clearAppStorage(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && (key.startsWith('certifyx:') || LEGACY_KEYS.has(key))) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Private browsing and locked-down storage may reject removal; memory still resets.
  }
}

export function makeDraft(templateId: CertificateDraft['templateId'], details: CertificateDetails, now = new Date()): CertificateDraft {
  return { version: 2, savedAt: now.toISOString(), templateId, details };
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
