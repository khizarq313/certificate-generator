import { describe, expect, it } from 'vitest';
import { clearAppStorage, makeDraft, restoreState, writeDraft } from '../../src/features/certificate/storage';
import { cloneDefaultDetails } from '../../src/features/certificate/types';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = false;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { if (this.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError'); this.values.set(key, value); }
}

describe('draft storage', () => {
  it('restores only a valid v2 schema and falls back safely for corrupt data', () => {
    const storage = new MemoryStorage();
    storage.setItem('certifyx:v2:draft', '{broken json');
    expect(restoreState(storage).draft).toBeNull();
    storage.setItem('certifyx:v2:draft', JSON.stringify({ version: 1, savedAt: 'old' }));
    expect(restoreState(storage).draft).toBeNull();
  });

  it('writes a versioned draft and handles quota errors without throwing', () => {
    const storage = new MemoryStorage();
    const draft = makeDraft('gold-frame', cloneDefaultDetails(), new Date('2026-10-27T00:00:00Z'));
    expect(writeDraft(draft, storage)).toBe(true);
    expect(restoreState(storage).draft).toEqual(draft);
    storage.failWrites = true;
    expect(writeDraft(draft, storage)).toBe(false);
  });

  it('clears app-prefixed and legacy keys but leaves unrelated browser data intact', () => {
    const storage = new MemoryStorage();
    storage.setItem('certifyx:v2:draft', 'draft');
    storage.setItem('certifyx-history', 'legacy');
    storage.setItem('unrelated', 'keep');
    clearAppStorage(storage);
    expect(storage.getItem('certifyx:v2:draft')).toBeNull();
    expect(storage.getItem('certifyx-history')).toBeNull();
    expect(storage.getItem('unrelated')).toBe('keep');
  });
});
