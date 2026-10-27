import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CertificateSvg } from '../../../components/CertificateSvg';
import { Field } from '../../../components/Field';
import { Modal } from '../../../components/Modal';
import { SignatureUpload } from '../../../components/SignatureUpload';
import { getEventDateMax, EVENT_DATE_MIN, LIMITS } from '../limits';
import { useCertificate } from '../CertificateContext';
import { certificateTypeLabel } from '../types';
import { buildLayout } from '../../../lib/layout/buildLayout';
import { StepShell } from './StepShell';

type MobilePanel = 'edit' | 'preview';

export function DetailsPage() {
  const { details, templateId, signatures, validationIssues, updateDetails, setDetails, resetDetails } = useCertificate();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('edit');
  const [confirmReset, setConfirmReset] = useState(false);
  const dateMax = useMemo(() => getEventDateMax(), []);
  const firstSignature = signatures.first ? [signatures.first, signatures.second] : signatures.second ? ['', signatures.second] : [];
  const layout = templateId ? buildLayout({ details, templateId, signatureImages: firstSignature, logoUrl: '/assets/siescoms-logo.png', logoAspectRatio: 2.33 }) : null;
  const issue = (field: string) => {
    if (!submitted && !touched.has(field)) return undefined;
    return validationIssues.find((item) => item.field === field)?.message;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (validationIssues.length > 0) {
      const first = validationIssues[0];
      requestAnimationFrame(() => document.getElementById(fieldId(first.field))?.focus());
      return;
    }
    navigate('/create/export');
  };
  const reset = () => {
    resetDetails();
    setConfirmReset(false);
    setSubmitted(false);
    setTouched(new Set());
  };
  const markTouched = (field: string) => setTouched((current) => new Set(current).add(field));

  return (
    <StepShell step={2}>
      <header className="pageHeader"><div><span className="eyebrow">STEP 2 OF 3</span><h1 tabIndex={-1}>Enter certificate details</h1><p>Required information updates the preview as you type.</p></div><Link className="textLink" to="/create/template"><ArrowLeft size={15}/>Change template</Link></header>
      <div className="detailsWorkspace">
        <section className={`detailsEditor ${mobilePanel === 'preview' ? 'mobileHidden' : ''}`} aria-label="Certificate details form">
          <div className="mobileSegment" role="group" aria-label="Choose edit or preview">
            <button type="button" className={mobilePanel === 'edit' ? 'active' : ''} aria-pressed={mobilePanel === 'edit'} onClick={() => setMobilePanel('edit')}>Edit</button>
            <button type="button" className={mobilePanel === 'preview' ? 'active' : ''} aria-pressed={mobilePanel === 'preview'} onClick={() => setMobilePanel('preview')}>Preview</button>
          </div>
          {submitted && validationIssues.length > 0 && <div className="errorSummary" role="alert" aria-live="assertive" tabIndex={-1}>
            <b>Fix these details before continuing</b><ul>{validationIssues.map((item) => <li key={`${item.field}-${item.message}`}>{item.message}</li>)}</ul>
          </div>}
          <form onSubmit={submit} noValidate>
            <section className="formSection" aria-labelledby="certificate-details-heading">
              <div className="formSectionHeading"><div><h2 id="certificate-details-heading">Certificate information</h2><p>The certificate heading uses this type.</p></div><button type="button" className="textButton" onClick={() => setConfirmReset(true)}><RotateCcw size={14}/>Reset details</button></div>
              <div className="formGrid">
                <div className="field fieldFull">
                  <label className="fieldLabel" htmlFor="certificateType">Certificate type <span aria-hidden="true">*</span></label>
                  <select id="certificateType" value={details.certificateType} aria-describedby="certificateType-help" onChange={(event) => updateDetails('certificateType', event.currentTarget.value as typeof details.certificateType)} onBlur={() => markTouched('certificateType')}>
                    <option>Participation</option><option>Achievement</option><option>Appreciation</option><option>Completion</option><option>Custom</option>
                  </select>
                  <span id="certificateType-help" className="fieldHint">The heading always reads “CERTIFICATE OF {certificateTypeLabel(details).toUpperCase() || 'TYPE'}”.</span>
                </div>
                {details.certificateType === 'Custom' && <Field id="customType" label="Custom type" value={details.customType} maxLength={LIMITS.customType.max} minLength={LIMITS.customType.min} required error={issue('customType')} hint="3 to 24 characters." onChange={(value) => updateDetails('customType', value)} onBlur={() => markTouched('customType')}/>}
                <Field id="recipientName" label="Recipient name" value={details.recipientName} maxLength={LIMITS.recipientName.max} minLength={LIMITS.recipientName.min} required={!details.leaveNameBlank} disabled={details.leaveNameBlank} error={issue('recipientName')} hint={details.leaveNameBlank ? 'A long blank line will print for handwriting.' : `2 to ${LIMITS.recipientName.max} characters. Include at least one letter.`} autoComplete="name" onChange={(value) => updateDetails('recipientName', value)} onBlur={() => markTouched('recipientName')}/>
                <div className="manualNameOption"><input id="manualNameBlank" type="checkbox" checked={details.leaveNameBlank} aria-labelledby="manualNameBlankLabel" onChange={(event) => { updateDetails('leaveNameBlank', event.currentTarget.checked); if (event.currentTarget.checked) updateDetails('recipientName', ''); markTouched('recipientName'); }}/><label id="manualNameBlankLabel" htmlFor="manualNameBlank"><b>Leave the name blank</b><small>Print a wide underline so the recipient can write their name by hand.</small></label></div>
                <Field id="description" label="Description" value={details.description} maxLength={LIMITS.description.max} minLength={LIMITS.description.min} required multiline error={issue('description')} hint="10 to 200 characters. The certificate uses at most three lines." onChange={(value) => updateDetails('description', value)} onBlur={() => markTouched('description')}/>
                <Field id="eventName" label="Event or programme" value={details.eventName} maxLength={LIMITS.eventName.max} minLength={LIMITS.eventName.min} required error={issue('eventName')} hint="3 to 70 characters." onChange={(value) => updateDetails('eventName', value)} onBlur={() => markTouched('eventName')}/>
                <Field id="eventDate" label="Event date" value={details.eventDate} maxLength={10} required type="date" min={EVENT_DATE_MIN} max={dateMax} error={issue('eventDate')} hint={`Choose a date from 2000-01-01 through ${dateMax}.`} onChange={(value) => updateDetails('eventDate', value)} onBlur={() => markTouched('eventDate')}/>
                <Field id="referenceId" label="Reference ID (optional)" value={details.referenceId} maxLength={LIMITS.referenceId.max} error={issue('referenceId')} hint="Letters, numbers, /, _, or -. Up to 28 characters." pattern="[A-Za-z0-9/_-]*" onChange={(value) => updateDetails('referenceId', value)} onBlur={() => markTouched('referenceId')}/>
              </div>
            </section>
            <section className="formSection signersSection" aria-labelledby="signatories-heading">
              <div className="formSectionHeading"><div><h2 id="signatories-heading">Signatories</h2><p>Signature images are optional; names and designations are required.</p></div><label className="switchControl"><input type="checkbox" checked={details.signatories.length === 2} onChange={(event) => setDetails({ ...details, signatories: event.currentTarget.checked ? [...details.signatories, { name: '', designation: '' }] : details.signatories.slice(0, 1) })}/><span>Second signatory</span></label></div>
              {details.signatories.slice(0, 2).map((signatory, index) => <div className="signatoryCard" key={index}>
                <div className="signatoryTitle"><b>Signatory {index + 1}</b>{index === 1 && <button type="button" className="textButton" onClick={() => setDetails({ ...details, signatories: details.signatories.slice(0, 1) })}>Remove</button>}</div>
                <div className="formGrid signerGrid">
                  <Field id={fieldId(`signatories.${index}.name`)} label="Name" value={signatory.name} maxLength={LIMITS.signatoryName.max} minLength={LIMITS.signatoryName.min} required error={issue(`signatories.${index}.name`)} hint="2 to 32 characters." onChange={(value) => updateSignatory(setDetails, details, index, 'name', value)} onBlur={() => markTouched(`signatories.${index}.name`)}/>
                  <Field id={fieldId(`signatories.${index}.designation`)} label="Designation" value={signatory.designation} maxLength={LIMITS.designation.max} minLength={LIMITS.designation.min} required error={issue(`signatories.${index}.designation`)} hint="2 to 40 characters." onChange={(value) => updateSignatory(setDetails, details, index, 'designation', value)} onBlur={() => markTouched(`signatories.${index}.designation`)}/>
                </div>
                <SignatureUpload index={index} name={signatory.name || `signatory ${index + 1}`}/>
              </div>)}
            </section>
            <div className="stepActions formActions"><button type="button" className="secondary" onClick={() => navigate('/create/template')}><ArrowLeft size={16}/>Back</button><button type="submit" className="primary">Continue<ArrowRight size={17}/></button></div>
          </form>
        </section>
        <section className={`livePreview ${mobilePanel === 'preview' ? 'mobileVisible' : ''}`} aria-label="Live certificate preview">
          <div className="previewPanelHeading"><div><span className="eyebrow">LIVE PREVIEW</span><b>{templateId?.replaceAll('-', ' ')}</b></div><span>A4 landscape</span></div>
          <div className="previewCanvas">{layout && <CertificateSvg layout={layout}/>}</div>
          {details.leaveNameBlank && <p className="manualNameHint">A blank name line is reserved for handwriting.</p>}
          <div className="previewPanelFoot"><span>Fields stay on fixed baselines.</span><Link to="/create/template">Change template</Link></div>
        </section>
      </div>
      <Modal open={confirmReset} title="Reset certificate details?" onClose={() => setConfirmReset(false)}>
        <p className="modalCopy">This clears all entered details and removes uploaded signatures. Your selected template stays selected.</p>
        <div className="modalActions"><button type="button" className="secondary" data-autofocus onClick={() => setConfirmReset(false)}>Cancel</button><button type="button" className="primary" onClick={reset}>Reset details</button></div>
      </Modal>
    </StepShell>
  );
}

function fieldId(field: string) {
  return field.replaceAll('.', '-');
}

function updateSignatory(
  setDetails: (details: ReturnType<typeof useCertificate>['details']) => void,
  details: ReturnType<typeof useCertificate>['details'],
  index: number,
  field: 'name' | 'designation',
  value: string,
) {
  setDetails({ ...details, signatories: details.signatories.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) });
}
