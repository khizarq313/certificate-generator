import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useCertificate } from '../CertificateContext';

export type StepNumber = 1 | 2 | 3;
const steps = [
  { number: 1 as const, label: 'Choose template', path: '/create/template' },
  { number: 2 as const, label: 'Enter details', path: '/create/details' },
  { number: 3 as const, label: 'Preview and download', path: '/create/export' },
];

export function StepShell({ step, children }: { step: StepNumber; children: React.ReactNode }) {
  const navigate = useNavigate();
  const { templateId, validationIssues } = useCertificate();

  const goTo = (number: StepNumber) => {
    if (number === 1) navigate(steps[0].path);
    else if (!templateId) navigate(steps[0].path, { replace: true });
    else if (number === 2) navigate(steps[1].path);
    else if (validationIssues.length === 0) navigate(steps[2].path);
    else navigate(steps[1].path, { replace: true });
  };

  return (
    <div className="stepPage">
      <nav className="stepper" aria-label="Certificate creation steps">
        {steps.map(({ number, label }) => (
          <button key={number} type="button" aria-current={step === number ? 'step' : undefined} className={step === number ? 'current' : number < step ? 'complete' : ''} onClick={() => goTo(number)}>
            <span>{number < step ? <Check size={15}/> : number}</span><b>{label}</b>
            {step === number && <motion.i layoutId="step-indicator" className="stepIndicator"/>}
          </button>
        ))}
      </nav>
      {children}
    </div>
  );
}
