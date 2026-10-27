import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { validateDetails } from './schema';
import { clearAppStorage, makeDraft, restoreState, writeDraft, writeSignatureAssets } from './storage';
import { cloneDefaultDetails, type CertificateDetails, type SignatureAssets, type TemplateId } from './types';
import { glyphProblem } from '../../templates/registry';
import { revokeAllObjectUrls } from '../../lib/objectUrls';

interface CertificateContextValue {
  details: CertificateDetails;
  templateId: TemplateId | null;
  signatures: SignatureAssets;
  storageNotice: string;
  hasSavedDraft: boolean;
  validationIssues: ReturnType<typeof validateDetails>;
  updateDetails: <K extends keyof CertificateDetails>(key: K, value: CertificateDetails[K]) => void;
  setDetails: (details: CertificateDetails) => void;
  setTemplateId: (id: TemplateId | null) => void;
  setSignature: (index: number, dataUrl: string) => void;
  setKeepSignatureBackground: (index: number, keep: boolean) => void;
  resetDetails: () => void;
  clearEverything: () => void;
  dismissStorageNotice: () => void;
}

const CertificateContext = createContext<CertificateContextValue | null>(null);

export function CertificateProvider({ children }: { children: ReactNode }) {
  const restored = useMemo(() => restoreState(), []);
  const [details, setDetails] = useState<CertificateDetails>(() => restored.draft?.details ?? cloneDefaultDetails());
  const [templateId, setTemplateId] = useState<TemplateId | null>(() => restored.draft?.templateId ?? null);
  const [signatures, setSignatures] = useState<SignatureAssets>(() => restored.signatures);
  const [storageNotice, setStorageNotice] = useState(() => restored.storageAvailable ? '' : 'Browser storage is unavailable. Your certificate will stay in memory until you leave this page.');
  const warned = useRef(!restored.storageAvailable);

  const persist = useCallback(() => {
    const draftSaved = writeDraft(makeDraft(templateId, details));
    const signaturesSaved = writeSignatureAssets(signatures);
    if ((!draftSaved || !signaturesSaved) && !warned.current) {
      warned.current = true;
      setStorageNotice('Browser storage is full or disabled. Your certificate is still available in this tab.');
    }
  }, [details, signatures, templateId]);

  useEffect(() => {
    const timer = window.setTimeout(persist, 300);
    return () => window.clearTimeout(timer);
  }, [persist]);

  useEffect(() => {
    const onPageHide = () => persist();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [persist]);

  const validationIssues = useMemo(() => validateDetails(details, templateId, glyphProblem), [details, templateId]);

  const value = useMemo<CertificateContextValue>(() => ({
    details,
    templateId,
    signatures,
    storageNotice,
    hasSavedDraft: Boolean(templateId) && validationIssues.length === 0,
    validationIssues,
    updateDetails: (key, nextValue) => setDetails((current) => ({ ...current, [key]: nextValue })),
    setDetails,
    setTemplateId,
    setSignature: (index, dataUrl) => setSignatures((current) => ({ ...current, [index === 0 ? 'first' : 'second']: dataUrl })),
    setKeepSignatureBackground: (index, keep) => setSignatures((current) => ({ ...current, [index === 0 ? 'keepFirstBackground' : 'keepSecondBackground']: keep })),
    resetDetails: () => {
      setDetails(cloneDefaultDetails());
      setSignatures({ first: '', second: '', keepFirstBackground: false, keepSecondBackground: false });
    },
    clearEverything: () => {
      clearAppStorage();
      revokeAllObjectUrls();
      setDetails(cloneDefaultDetails());
      setTemplateId(null);
      setSignatures({ first: '', second: '', keepFirstBackground: false, keepSecondBackground: false });
      setStorageNotice('');
    },
    dismissStorageNotice: () => setStorageNotice(''),
  }), [details, templateId, signatures, storageNotice, validationIssues]);

  return <CertificateContext.Provider value={value}>{children}</CertificateContext.Provider>;
}

export function useCertificate(): CertificateContextValue {
  const value = useContext(CertificateContext);
  if (!value) throw new Error('useCertificate must be used inside CertificateProvider.');
  return value;
}
