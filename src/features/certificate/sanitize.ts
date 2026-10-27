// These ranges intentionally match control and invisible formatting code points.
// eslint-disable-next-line no-control-regex
const CONTROL_OR_INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/gu;

export interface SanitizedText {
  value: string;
  truncated: boolean;
}

export function sanitizeText(input: string, maxLength: number, trim = false): SanitizedText {
  const cleaned = input
    .normalize('NFC')
    .replace(CONTROL_OR_INVISIBLE, '')
    .replace(/[\r\n\t\f\v]+/gu, ' ')
    .replace(/\s+/gu, ' ');
  const normalized = trim ? cleaned.trim() : cleaned;
  const value = Array.from(normalized).slice(0, maxLength).join('');
  return { value, truncated: Array.from(normalized).length > maxLength };
}

export function cleanForValidation(input: string, maxLength: number): string {
  return sanitizeText(input, maxLength, true).value;
}

export function firstUnsupportedCharacter(input: string, characterSet: ReadonlySet<number>): string | null {
  for (const character of Array.from(input)) {
    if (/\s/u.test(character)) continue;
    if (!characterSet.has(character.codePointAt(0) ?? -1)) return character;
  }
  return null;
}
