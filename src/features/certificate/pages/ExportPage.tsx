import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Pencil, Printer, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CertificateSvg } from '../../../components/CertificateSvg';
import { Field } from '../../../components/Field';
import { Modal } from '../../../components/Modal';
import { useCertificate } from '../CertificateContext';
import { certificateTypeLabel } from '../types';
import { LIMITS } from '../limits';
import { buildLayout } from '../../../lib/layout/buildLayout';
import { createTrackedObjectUrl, revokeObjectUrl } from '../../../lib/objectUrls';
import { exportPdf, makePdfFileName, warmPdfDependencies } from '../../../lib/pdf/exportPdf';
import { StepShell } from './StepShell';

interface ToastMessage { text: string; error?: boolean; }

export function ExportPage() {
  const { details, setDetails, templateId, signatures, validationIssues, clearEverything } = useCertificate();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [postDownload, setPostDownload] = useState(false);
  const [nameOnly, setNameOnly] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [recipientTouched, setRecipientTouched] = useState(false);
  const running = useRef(false);
  const pdfCache = useRef<{ key: string; blob: Blob } | null>(null);
  const key = JSON.stringify([templateId, details, signatures.first, signatures.second, signatures.keepFirstBackground, signatures.keepSecondBackground]);
  const layout = useMemo(() => templateId ? buildLayout({ details, templateId, signatureImages: [signatures.first, signatures.second], logoUrl: '/assets/siescoms-logo.png', logoAspectRatio: 2.33 }) : null, [details, templateId, signatures]);
  const nameIssue = validationIssues.find((item) => item.field === 'recipientName')?.message;

  useEffect(() => {
    const win = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let timer = 0;
    let idle = 0;
    const prefetch = () => { void warmPdfDependencies().catch(() => undefined); };
    if (win.requestIdleCallback) idle = win.requestIdleCallback(prefetch, { timeout: 1200 });
    else timer = window.setTimeout(prefetch, 1);
    return () => {
      if (idle && win.cancelIdleCallback) win.cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const getBlob = async () => {
    if (!layout || validationIssues.length > 0) throw new Error('Complete the required details before exporting.');
    if (pdfCache.current?.key === key) return pdfCache.current.blob;
    const blob = await exportPdf(layout, details);
    if (blob.size < 2048) throw new Error('The generated certificate PDF is unexpectedly small and may be incomplete.');
    pdfCache.current = { key, blob };
    return blob;
  };

  const handleDownload = async () => {
    if (running.current || generating || printing) return;
    if (nameOnly) setRecipientTouched(true);
    running.current = true;
    setGenerating(true);
    setToast(null);
    try {
      const blob = await getBlob();
      const fileName = makePdfFileName(details);
      const objectUrl = createTrackedObjectUrl(blob);
      const isAppleMobile = /iPad|iPhone|iPod/u.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const anchor = document.createElement('a');
      if (!isAppleMobile && 'download' in anchor) {
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        const opened = window.open(objectUrl, '_blank');
        if (opened) opened.opener = null;
        if (!opened) window.location.assign(objectUrl);
      }
      window.setTimeout(() => revokeObjectUrl(objectUrl), 60_000);
      setPostDownload(true);
      setToast({ text: 'Certificate downloaded.' });
    } catch (error) {
      console.error('Certificate PDF generation failed.', error);
      setToast({ text: error instanceof Error ? error.message : 'The PDF could not be generated.', error: true });
    } finally {
      running.current = false;
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (running.current || generating || printing) return;
    running.current = true;
    setPrinting(true);
    setToast(null);
    try {
      const blob = await getBlob();
      await printPdfBlob(blob);
      setToast({ text: 'Print dialog opened.' });
    } catch (error) {
      console.error('Certificate PDF print failed.', error);
      setToast({ text: error instanceof Error ? error.message : 'The print view could not be opened.', error: true });
    } finally {
      running.current = false;
      setPrinting(false);
    }
  };

  const changeRecipient = (value: string) => setDetails({ ...details, recipientName: value, leaveNameBlank: false });
  const leaveNameBlank = (checked: boolean) => setDetails({ ...details, recipientName: checked ? '' : details.recipientName, leaveNameBlank: checked });
  const startNameOnly = () => { setNameOnly(true); setPostDownload(false); setToast(null); };
  const cancelNameOnly = () => { setNameOnly(false); setPostDownload(false); setToast(null); };
  const exit = () => {
    clearEverything();
    setExitOpen(false);
    setPostDownload(false);
    setNameOnly(false);
    setToast(null);
    pdfCache.current = null;
    navigate('/', { replace: true });
  };

  return (
    <StepShell step={3}>
      <header className="pageHeader"><div><span className="eyebrow">STEP 3 OF 3</span><h1 tabIndex={-1}>Preview and download</h1><p>Review the final layout, then download or print the same PDF.</p></div></header>
      {layout && <div className="exportWorkspace">
        <section className="exportPreview" aria-label="Certificate final preview">
          <div className="previewPanelHeading"><div><span className="eyebrow">FINAL PREVIEW</span><b>{templateId?.replaceAll('-', ' ')}</b></div><span>A4 landscape · vector text</span></div>
          <div className="exportCanvas"><CertificateSvg layout={layout}/></div>
          {layout.warnings.length > 0 && <ul className="layoutWarnings" aria-label="Layout warnings">{layout.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        </section>
        <section className="exportDetails" aria-label="Certificate summary and export actions">
          {nameOnly ? (
            <div className="nameOnlyCard">
              <span className="eyebrow">SAME CERTIFICATE · NEW RECIPIENT</span>
              <h2>Change the recipient name</h2>
              <p>Every other certificate detail is read-only for this repeat download.</p>
              <LockedSummary details={details} templateName={templateId?.replaceAll('-', ' ') ?? ''}/>
              <Field id="recipientName" label="Recipient name" value={details.recipientName} maxLength={LIMITS.recipientName.max} minLength={LIMITS.recipientName.min} required={!details.leaveNameBlank} disabled={details.leaveNameBlank} error={recipientTouched ? nameIssue : undefined} hint={details.leaveNameBlank ? 'A wide handwriting line will be printed.' : `2 to ${LIMITS.recipientName.max} characters. Include at least one letter.`} onChange={changeRecipient} onBlur={() => setRecipientTouched(true)}/>
              <div className="manualNameOption nameOnlyOption"><input id="manualNameBlank" type="checkbox" checked={details.leaveNameBlank} aria-labelledby="manualNameBlankLabel" onChange={(event) => leaveNameBlank(event.currentTarget.checked)}/><label id="manualNameBlankLabel" htmlFor="manualNameBlank"><b>Leave the name blank</b><small>Print a long underline for a handwritten name.</small></label></div>
              <div className="nameOnlyActions"><button type="button" className="quietButton" onClick={cancelNameOnly}><X size={15}/>Cancel</button><ExportButtons generating={generating} printing={printing} onDownload={handleDownload} onPrint={handlePrint}/></div>
            </div>
          ) : (
            <>
              <div className="summaryCard"><span className="eyebrow">CERTIFICATE SUMMARY</span><h2>{certificateTypeLabel(details)} certificate</h2>
                <SummaryRow label="Recipient" value={details.leaveNameBlank ? 'Blank name line for handwriting' : details.recipientName}/>
                <SummaryRow label="Event" value={details.eventName}/>
                <SummaryRow label="Date" value={formatEventDate(details.eventDate)}/>
                <SummaryRow label="Signatories" value={details.signatories.map((signer) => `${signer.name} · ${signer.designation}`).join(' / ')}/>
                {details.referenceId && <SummaryRow label="Reference ID" value={details.referenceId}/>}
                <SummaryRow label="Template" value={templateId?.replaceAll('-', ' ') ?? ''}/>
              </div>
              <ExportButtons generating={generating} printing={printing} onDownload={handleDownload} onPrint={handlePrint}/>
              <button type="button" className="secondary fullWidth" onClick={() => navigate('/create/details')}><Pencil size={15}/>Back to edit</button>
            </>
          )}
          <AnimatePresence>
            {postDownload && <motion.section className="downloadCard" aria-live="polite" aria-labelledby="downloaded-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="downloadCardIcon"><CheckCircle2 size={21}/></div><div><span className="eyebrow">DOWNLOAD COMPLETE</span><h2 id="downloaded-title">Certificate downloaded</h2><p>Generate the same certificate for someone else?</p></div>
              <div className="downloadCardActions"><button type="button" className="primary" onClick={startNameOnly}>Yes, change the name</button><button type="button" className="secondary" onClick={() => navigate('/create/details')}>Edit certificate</button><button type="button" className="quietButton" onClick={() => setExitOpen(true)}>Exit</button></div>
            </motion.section>}
          </AnimatePresence>
        </section>
      </div>}
      <div className="exportBack"><button type="button" className="quietButton" onClick={() => navigate('/create/details')}><ArrowLeft size={16}/>Back to edit</button></div>
      <AnimatePresence>{toast && <motion.div className={`toast ${toast.error ? 'toastError' : ''}`} role={toast.error ? 'alert' : 'status'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
        <span>{toast.text}</span>{toast.error && <button type="button" className="toastRetry" onClick={() => void handleDownload()}>Retry</button>}<button type="button" className="toastClose" aria-label="Dismiss message" onClick={() => setToast(null)}>×</button>
      </motion.div>}</AnimatePresence>
      <Modal open={exitOpen} title="Exit and clear everything saved in this browser?" onClose={() => setExitOpen(false)}>
        <p className="modalCopy">This removes the saved draft and signature images from this browser.</p>
        <div className="modalActions"><button type="button" className="secondary" data-autofocus onClick={() => setExitOpen(false)}>Cancel</button><button type="button" className="primary" onClick={exit}>Exit and clear</button></div>
      </Modal>
    </StepShell>
  );
}

function ExportButtons({ generating, printing, onDownload, onPrint }: { generating: boolean; printing: boolean; onDownload: () => void; onPrint: () => void }) {
  return <div className="exportButtons"><button type="button" className="primary" disabled={generating || printing} onClick={onDownload}><Download size={17}/>{generating ? 'Generating PDF…' : 'Download PDF'}</button><button type="button" className="secondary" disabled={generating || printing} onClick={onPrint}><Printer size={17}/>{printing ? 'Preparing print…' : 'Print'}</button></div>;
}

function LockedSummary({ details, templateName }: { details: ReturnType<typeof useCertificate>['details']; templateName: string }) {
  return <div className="lockedSummary" aria-label="Locked certificate details">
    <SummaryRow label="Certificate type" value={certificateTypeLabel(details)}/><SummaryRow label="Description" value={details.description}/><SummaryRow label="Event" value={details.eventName}/><SummaryRow label="Date" value={formatEventDate(details.eventDate)}/>
    {details.signatories.map((signer, index) => <SummaryRow key={index} label={`Signatory ${index + 1}`} value={`${signer.name} · ${signer.designation}`}/>)}
    {details.referenceId && <SummaryRow label="Reference ID" value={details.referenceId}/>}<SummaryRow label="Template" value={templateName}/>
  </div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summaryRow"><span>{label}</span><b>{value || '—'}</b></div>;
}

function formatEventDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

async function printPdfBlob(blob: Blob): Promise<void> {
  const objectUrl = createTrackedObjectUrl(blob);
  const frame = document.createElement('iframe');
  frame.className = 'printFrame';
  frame.title = 'Certificate print preview';
  frame.setAttribute('aria-hidden', 'true');
  return new Promise((resolve, reject) => {
    let loaded = false;
    let settled = false;
    const cleanup = () => {
      frame.remove();
      revokeObjectUrl(objectUrl);
    };
    const fallback = () => {
      if (loaded || settled) return;
      const opened = window.open(objectUrl, '_blank');
      if (!opened) {
        settled = true;
        cleanup();
        reject(new Error('The print dialog was blocked. Allow pop-ups or open the PDF in a new tab.'));
        return;
      }
      opened.opener = null;
      settled = true;
      window.setTimeout(cleanup, 60_000);
      resolve();
    };
    frame.onload = () => {
      loaded = true;
      window.setTimeout(() => {
        try {
          const printWindow = frame.contentWindow;
          if (!printWindow) throw new Error('Print preview is unavailable.');
          printWindow.onafterprint = cleanup;
          printWindow.focus();
          printWindow.print();
          settled = true;
          window.setTimeout(cleanup, 60_000);
          resolve();
        } catch {
          const opened = window.open(objectUrl, '_blank');
          if (!opened) {
            settled = true;
            cleanup();
            reject(new Error('The print dialog was blocked. Allow pop-ups or open the PDF in a new tab.'));
            return;
          }
          opened.opener = null;
          settled = true;
          window.setTimeout(cleanup, 60_000);
          resolve();
        }
      }, 300);
    };
    frame.onerror = fallback;
    frame.src = objectUrl;
    document.body.appendChild(frame);
    window.setTimeout(fallback, 5000);
  });
}
