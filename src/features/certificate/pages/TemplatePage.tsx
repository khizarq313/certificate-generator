import { useRef, type KeyboardEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { CertificateSvg } from '../../../components/CertificateSvg';
import { buildLayout } from '../../../lib/layout/buildLayout';
import { TEMPLATES } from '../../../templates/registry';
import { cloneDefaultDetails } from '../types';
import { useCertificate } from '../CertificateContext';
import { StepShell } from './StepShell';

const sampleDetails = {
  ...cloneDefaultDetails(),
  recipientName: 'Jo Li',
  description: 'For taking part in the leadership and professional development programme.',
  eventName: 'SIESCOMS Leadership Forum',
  eventDate: '2026-08-18',
  signatories: [{ name: 'Anita Shah', designation: 'Dean, Academics' }],
};

export function TemplatePage() {
  const { templateId, setTemplateId } = useCertificate();
  const navigate = useNavigate();
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const currentIndex = TEMPLATES.findIndex((template) => template.id === templateId);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + TEMPLATES.length) % TEMPLATES.length;
    cards.current[next]?.focus();
    setTemplateId(TEMPLATES[next].id);
  };

  return (
    <StepShell step={1}>
      <header className="pageHeader"><div><span className="eyebrow">STEP 1 OF 3</span><h1 tabIndex={-1}>Choose a template</h1><p>Select one of the eight approved SIESCOMS certificate designs.</p></div><span className="localBadge">Choice saved automatically</span></header>
      <div className="templateGrid" role="radiogroup" aria-label="Certificate templates">
        {TEMPLATES.map((template, index) => {
          const selected = template.id === templateId;
          const layout = buildLayout({ details: sampleDetails, templateId: template.id, logoUrl: '/assets/siescoms-logo.png', logoAspectRatio: 2.33 });
          return (
            <button
              ref={(element) => { cards.current[index] = element; }}
              key={template.id}
              type="button"
              className={`templateCard ${selected ? 'selected' : ''}`}
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (currentIndex < 0 && index === 0) ? 0 : -1}
              onClick={() => setTemplateId(template.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <div className="templateArtboard"><CertificateSvg layout={layout}/></div>
              <span className="templateText"><b>{template.name}</b><small>{template.description}</small></span>
              <AnimatePresence>{selected && <motion.span className="selectionRing" layoutId="template-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"><Check size={14}/></motion.span>}</AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="stepActions"><button type="button" className="quietButton" onClick={() => navigate('/')}>Back to home</button><button type="button" className="primary" disabled={!templateId} onClick={() => navigate('/create/details')}>Continue<ArrowRight size={17}/></button></div>
    </StepShell>
  );
}
