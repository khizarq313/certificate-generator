import { useState } from 'react';
import { ArrowRight, FilePlus2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/Modal';
import { useCertificate } from '../CertificateContext';

export function HomePage() {
  const navigate = useNavigate();
  const { hasSavedDraft, clearEverything } = useCertificate();
  const [confirmFresh, setConfirmFresh] = useState(false);

  const create = () => {
    if (hasSavedDraft) setConfirmFresh(true);
    else {
      clearEverything();
      navigate('/create/template');
    }
  };
  const startFresh = () => {
    clearEverything();
    setConfirmFresh(false);
    navigate('/create/template');
  };

  return (
    <section className="homePage">
      <div className="homeCopy">
        <span className="eyebrow">SIES COLLEGE OF MANAGEMENT STUDIES</span>
        <h1 tabIndex={-1}>Create a certificate</h1>
        <p>Choose a design, add the details, and download a print-ready certificate.</p>
        <div className="homeActions">
          <button type="button" className="primary" onClick={create}><FilePlus2 size={18}/>Create certificate<ArrowRight size={17}/></button>
          {hasSavedDraft && <div className="draftActions">
            <button type="button" className="secondary" onClick={() => navigate('/create/export')}><RotateCcw size={16}/>Resume draft</button>
            <button type="button" className="quietButton" onClick={() => setConfirmFresh(true)}>Start fresh</button>
          </div>}
        </div>
      </div>
      <div className="homePreview" aria-hidden="true"><div className="decorFrame"><div className="decorLogo"><img src="/assets/siescoms-logo.png" alt=""/></div><div className="decorTitle">CERTIFICATE</div><div className="decorType">OF PARTICIPATION</div><div className="decorName"/><div className="decorRule"/><div className="decorLines"><i/><i/><i/></div></div></div>
      <div className="homeFoot"><span>Eight certificate designs</span><span>Print-ready PDFs</span><span>Saved in your browser</span></div>
      <Modal open={confirmFresh} title="Start a fresh certificate?" onClose={() => setConfirmFresh(false)}>
        <p className="modalCopy">This clears the saved draft from this browser so you can start over.</p>
        <div className="modalActions"><button type="button" className="secondary" data-autofocus onClick={() => setConfirmFresh(false)}>Cancel</button><button type="button" className="primary" onClick={startFresh}>Clear draft and start fresh</button></div>
      </Modal>
    </section>
  );
}
