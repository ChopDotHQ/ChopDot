import { beforeEach, describe, expect, it } from 'vitest';
import { simChain } from './sim';
import { runActionWithRecovery } from '../../utils/actionRecovery';

type MockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createMockStorage(): MockStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe('simChain payout flows', () => {
  beforeEach(() => {
    (globalThis as any).window = { localStorage: createMockStorage() };
  });

  it('fails with insufficient funds then passes after top-up', async () => {
    window.localStorage.setItem('mock_balance', '100000000'); // 0.01 DOT
    window.localStorage.setItem('mock_fee_planck', '100000000'); // 0.01 DOT fee

    const recovered = await runActionWithRecovery(
      () =>
        simChain.sendDot({
          from: 'addr1',
          to: 'addr2',
          amountDot: 0.05,
        }),
      [
        {
          label: 'top up balance',
          run: () => {
            window.localStorage.setItem('mock_balance', '2000000000'); // 0.2 DOT
          },
        },
      ]
    );

    expect(recovered.recoveredWith).toEqual(['top up balance']);
    expect(recovered.value.txHash).toMatch(/^0xsim/);
  });

  it('returns tx lifecycle statuses for successful transfer', async () => {
    window.localStorage.setItem('mock_balance', '90000000000'); // 9 DOT
    const statuses: string[] = [];

    const result = await simChain.sendDot({
      from: 'addr1',
      to: 'addr2',
      amountDot: 1,
      onStatus: (status) => statuses.push(status),
    });

    expect(result.txHash).toMatch(/^0xsim/);
    expect(statuses).toEqual(['submitted', 'inBlock', 'finalized']);
  });

  it('supports USDC simulated transfer lifecycle', async () => {
    window.localStorage.setItem('mock_balance', '90000000000'); // 9 DOT-equivalent preflight
    const statuses: string[] = [];

    const result = await simChain.sendUsdc({
      from: 'addr1',
      to: 'addr2',
      amountUsdc: 1.5,
      onStatus: (status) => statuses.push(status),
    });

    expect(result.txHash).toMatch(/^0xsim/);
    expect(statuses).toEqual(['submitted', 'inBlock', 'finalized']);
  });

  it('fails USDC transfer with insufficient funds', async () => {
    window.localStorage.setItem('mock_balance', '100000000'); // 0.01 DOT-equivalent
    window.localStorage.setItem('mock_fee_planck', '100000000'); // 0.01 DOT fee

    await expect(
      simChain.sendUsdc({
        from: 'addr1',
        to: 'addr2',
        amountUsdc: 0.05,
      }),
    ).rejects.toThrow('Insufficient balance');
  });
});
