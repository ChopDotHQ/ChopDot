import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mergeTrackedPotRecovery, saveTrackedPotRecovery } from './trackedRecovery';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  clear() {
    this.values.clear();
  }
}

describe('tracked pot recovery', () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    storage.clear();
  });

  afterEach(() => {
    storage.clear();
  });

  it('does not let timestampless empty recovery erase current closeouts or history', () => {
    saveTrackedPotRecovery({
      id: 'pot-1',
      closeouts: [],
      history: [],
    });

    const pot = {
      id: 'pot-1',
      closeouts: [{ id: 'current-closeout' }],
      history: [{ id: 'current-history' }],
    };

    const merged = mergeTrackedPotRecovery(pot);

    expect(merged?.closeouts).toEqual([{ id: 'current-closeout' }]);
    expect(merged?.history).toEqual([{ id: 'current-history' }]);
  });

  it('still restores recovery data when recovery has a valid newer edit timestamp', () => {
    saveTrackedPotRecovery({
      id: 'pot-2',
      closeouts: [{ id: 'recovered-closeout' }],
      history: [{ id: 'recovered-history' }],
      lastEditAt: '2026-05-18T12:00:00.000Z',
    });

    const pot = {
      id: 'pot-2',
      closeouts: [{ id: 'current-closeout' }],
      history: [{ id: 'current-history' }],
      lastEditAt: '2026-05-18T11:00:00.000Z',
    };

    const merged = mergeTrackedPotRecovery(pot);

    expect(merged?.closeouts).toEqual([{ id: 'recovered-closeout' }]);
    expect(merged?.history).toEqual([{ id: 'recovered-history' }]);
    expect(merged?.lastEditAt).toBe('2026-05-18T12:00:00.000Z');
  });
});
