import { describe, expect, it } from 'vitest';
import { runActionWithRecovery } from './actionRecovery';

describe('runActionWithRecovery', () => {
  it('returns immediately when action succeeds', async () => {
    const result = await runActionWithRecovery(async () => 42, []);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
    expect(result.recoveredWith).toEqual([]);
  });

  it('throws when no recovery can fix failure', async () => {
    await expect(
      runActionWithRecovery(
        async () => {
          throw new Error('always fails');
        },
        [{ label: 'noop', run: () => undefined }]
      )
    ).rejects.toThrow('always fails');
  });
});
