import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useCertificate } from '../features/certificate/CertificateContext';
import { processSignature } from '../lib/images/signature';

export function SignatureUpload({ index, name }: { index: number; name: string }) {
  const { signatures, setSignature, setKeepSignatureBackground, storageNotice } = useCertificate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasSourceFile, setHasSourceFile] = useState(false);
  const sourceFile = useRef<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const signature = index === 0 ? signatures.first : signatures.second;
  const keepBackground = index === 0 ? signatures.keepFirstBackground : signatures.keepSecondBackground;

  const load = async (file?: File, background = keepBackground) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      sourceFile.current = file;
      setHasSourceFile(true);
      const result = await processSignature(file, background);
      setSignature(index, result.dataUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This signature image could not be processed.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const toggleBackground = (enabled: boolean) => {
    setKeepSignatureBackground(index, enabled);
    if (sourceFile.current) void load(sourceFile.current, enabled);
  };

  return (
    <div className="signatureField">
      <div className="signatureFieldHead"><span>Optional signature image</span><small>PNG, JPG, or WebP · up to 2 MB</small></div>
      {signature ? (
        <div className="signaturePreviewRow">
          <div className="signatureChecker"><img src={signature} alt={`Signature uploaded for ${name}`}/></div>
          <div className="signatureButtons">
            <button type="button" className="secondary smallButton" onClick={() => input.current?.click()} disabled={busy}><RefreshCw size={14}/>Replace</button>
            <button type="button" className="quietButton smallButton" onClick={() => { setSignature(index, ''); sourceFile.current = null; setHasSourceFile(false); }}><Trash2 size={14}/>Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" className="uploadSignature" onClick={() => input.current?.click()} disabled={busy}>
          <ImagePlus size={18}/><span>{busy ? 'Processing signature…' : 'Upload a signature image'}</span>
        </button>
      )}
      <input ref={input} className="visuallyHidden" type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Upload signature for ${name}`} onChange={(event) => void load(event.currentTarget.files?.[0])}/>
      <label className="keepBackground"><input type="checkbox" checked={keepBackground} onChange={(event) => toggleBackground(event.currentTarget.checked)}/>Keep original image background</label>
      {signature && !hasSourceFile && <span className="signatureHint">Replace the image to apply a changed background setting.</span>}
      {error && <span className="fieldError" role="alert">{error}</span>}
      {storageNotice && <span className="srOnly">Signature storage may be unavailable.</span>}
    </div>
  );
}
