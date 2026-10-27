import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CertificateProvider, useCertificate } from '../features/certificate/CertificateContext';
import { loadFontRegistry } from '../lib/fonts/registry';
import { RequireTemplate, RequireValidDetails } from './guards';
import { HomePage } from '../features/certificate/pages/HomePage';
import { TemplatePage } from '../features/certificate/pages/TemplatePage';
import { DetailsPage } from '../features/certificate/pages/DetailsPage';
import { ExportPage } from '../features/certificate/pages/ExportPage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    loadFontRegistry().then(() => { if (active) setReady(true); }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Certificate fonts could not be loaded.');
    });
    return () => { active = false; };
  }, []);

  if (loadError) return <main className="fontError"><h1>Certificate fonts could not be loaded</h1><p>{loadError}</p><button className="secondary" onClick={() => window.location.reload()}>Try again</button></main>;
  if (!ready) return <div className="loadingScreen" role="status" aria-live="polite"><div className="loadingMark"/><span>Preparing the certificate studio…</span></div>;

  return <CertificateProvider><BrowserRouter><MotionConfig reducedMotion="user"><AppShell/></MotionConfig></BrowserRouter></CertificateProvider>;
}

function AppShell() {
  const location = useLocation();
  const { storageNotice, dismissStorageNotice } = useCertificate();
  useEffect(() => {
    document.title = location.pathname === '/' ? 'CertifyX — Certificate Studio' : `${location.pathname.includes('export') ? 'Preview and download' : location.pathname.includes('details') ? 'Enter details' : 'Choose a template'} · CertifyX`;
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main h1[tabindex="-1"]')?.focus());
  }, [location.pathname]);

  return (
    <div className="appShell">
      <a className="skipLink" href="#main">Skip to content</a>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="CertifyX home">
          <img src="/assets/siescoms-logo.png" alt=""/>
          <span><b>CertifyX</b><small>Certificate Studio</small></span>
        </Link>
        <span className="privacyLabel">Your draft stays in this browser</span>
      </header>
      {storageNotice && <div className="storageNotice" role="status"><span>{storageNotice}</span><button type="button" onClick={dismissStorageNotice} aria-label="Dismiss storage notice">×</button></div>}
      <main id="main" className="mainContent">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="routeMotion" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }}>
            <Routes location={location}>
              <Route path="/" element={<HomePage/>}/>
              <Route path="/create/template" element={<TemplatePage/>}/>
              <Route element={<RequireTemplate/>}>
                <Route path="/create/details" element={<DetailsPage/>}/>
              </Route>
              <Route element={<RequireValidDetails/>}>
                <Route path="/create/export" element={<ExportPage/>}/>
              </Route>
              <Route path="/404" element={<NotFound/>}/>
              <Route path="*" element={<Navigate to="/404" replace/>}/>
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="footer"><span>© {new Date().getFullYear()} SIES College of Management Studies</span><span>Local certificate workspace</span></footer>
    </div>
  );
}

function NotFound() {
  return <section className="notFound"><span className="eyebrow">404 · PAGE NOT FOUND</span><h1 tabIndex={-1}>That page isn’t here</h1><p>Return to the certificate studio to continue.</p><Link className="primary" to="/">Go to CertifyX</Link></section>;
}
