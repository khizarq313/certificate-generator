import { useId, useState, type ClipboardEvent, type ChangeEvent } from 'react';
import { sanitizeText } from '../features/certificate/sanitize';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  maxLength: number;
  minLength?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  multiline?: boolean;
  disabled?: boolean;
  type?: 'text' | 'date';
  min?: string;
  max?: string;
  pattern?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  before?: React.ReactNode;
  after?: React.ReactNode;
}

export function Field({
  id, label, value, maxLength, minLength, required, error, hint, multiline, disabled, type = 'text', min, max, pattern, autoComplete, onChange, onBlur, before, after,
}: FieldProps) {
  const generated = useId();
  const hintId = `${generated}-hint`;
  const errorId = `${generated}-error`;
  const pasteId = `${generated}-paste`;
  const [pasteNote, setPasteNote] = useState('');
  const count = Array.from(value).length;
  const counterTone = count >= maxLength ? 'atLimit' : count >= Math.ceil(maxLength * 0.9) ? 'nearLimit' : '';
  const describedBy = [hint ? hintId : '', error ? errorId : '', pasteNote ? pasteId : ''].filter(Boolean).join(' ') || undefined;

  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const sanitized = sanitizeText(event.currentTarget.value, maxLength);
    onChange(sanitized.value);
    if (!sanitized.truncated) setPasteNote('');
  };
  const paste = (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type === 'date' || disabled) return;
    const text = event.clipboardData.getData('text');
    const cleaned = sanitizeText(text, maxLength, true);
    const beforeLength = Array.from(value.slice(0, event.currentTarget.selectionStart ?? value.length)).length;
    const selectedLength = Array.from(value.slice(event.currentTarget.selectionStart ?? value.length, event.currentTarget.selectionEnd ?? value.length)).length;
    const available = Math.max(0, maxLength - beforeLength - (count - beforeLength - selectedLength));
    const pasted = Array.from(cleaned.value).slice(0, available).join('');
    const next = `${value.slice(0, event.currentTarget.selectionStart ?? value.length)}${pasted}${value.slice(event.currentTarget.selectionEnd ?? value.length)}`;
    event.preventDefault();
    onChange(sanitizeText(next, maxLength).value);
    if (cleaned.truncated || Array.from(cleaned.value).length > available) setPasteNote(`Pasted text was truncated to fit the ${maxLength}-character limit.`);
    else setPasteNote('');
  };
  const blur = () => {
    if (type !== 'date') onChange(sanitizeText(value, maxLength, true).value);
    onBlur?.();
  };
  const common = {
    id,
    value,
    maxLength: type === 'date' ? undefined : maxLength,
    required,
    disabled,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    onChange: change,
    onPaste: paste,
    onBlur: blur,
    autoComplete,
    pattern,
    min,
    max,
  } as const;

  return (
    <div className={`field ${multiline ? 'fieldMultiline' : ''}`}>
      <label htmlFor={id} className="fieldLabel">{label}{required && <span aria-hidden="true"> *</span>}{before}</label>
      {multiline ? <textarea {...common} rows={4} /> : <input {...common} type={type} />}
      <div className="fieldFoot">
        <span id={hint ? hintId : undefined} className="fieldHint">{hint}</span>
        {type !== 'date' && <span className={`fieldCounter ${counterTone}`} aria-label={`${count} of ${maxLength} characters`}>{count}/{maxLength}</span>}
      </div>
      {error && <span id={errorId} className="fieldError">{error}</span>}
      {pasteNote && <span id={pasteId} className="pasteNote" role="status">{pasteNote}</span>}
      {after}
      {minLength && <span className="srOnly">Minimum length: {minLength} characters.</span>}
    </div>
  );
}

