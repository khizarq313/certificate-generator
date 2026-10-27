import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/roboto-slab/latin-700.css';
import '@fontsource/unifrakturcook/latin-700.css';
import './style.css';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('CertifyX could not find its root element.');

createRoot(rootElement).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, { once: true });
}
