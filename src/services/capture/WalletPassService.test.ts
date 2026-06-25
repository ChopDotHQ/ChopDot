/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { WalletPassService } from './WalletPassService';

describe('WalletPassService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('mints spend launcher URL', () => {
    const service = new WalletPassService();
    const result = service.mintSpendLauncher({
      potId: 'pot_1',
      chapterId: 'ch_1',
      spendCardId: 'sc_1',
      payerId: 'owner',
      label: 'Friday Crew',
    });

    expect(result.spendUrl).toContain('/spend?t=');
    expect(result.message).toMatch(/not a bank card/i);
  });
});
