import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Pot } from '../../schema/pot';
import {
  canCreatePvmCloseout,
  createCloseoutDraft,
  getCloseoutReadiness,
  isValidCloseoutEvmAddress,
} from './pvmCloseout';

const VALID_A = '0x1111111111111111111111111111111111111111';
const VALID_B = '0x2222222222222222222222222222222222222222';

const createPot = (memberOverrides: Array<{ id: string; evmAddress?: string | null }>): Pot => ({
  id: 'pot-evm-validation',
  name: 'EVM validation pot',
  type: 'expense',
  baseCurrency: 'DOT',
  members: [
    { id: 'alice', name: 'Alice', evmAddress: VALID_A },
    { id: 'bob', name: 'Bob', evmAddress: VALID_B },
  ].map((member) => ({
    ...member,
    ...memberOverrides.find((override) => override.id === member.id),
  })),
  expenses: [
    {
      id: 'expense-1',
      amount: 10,
      currency: 'DOT',
      paidBy: 'alice',
      memo: 'Dinner',
      date: '2026-05-18',
      split: [],
      attestations: [],
      hasReceipt: false,
    },
  ],
  history: [],
  closeouts: [],
} as unknown as Pot);

describe('PVM closeout EVM address validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses one strict validation rule for closeout EVM addresses', () => {
    expect(isValidCloseoutEvmAddress(VALID_A)).toBe(true);
    expect(isValidCloseoutEvmAddress(`  ${VALID_A}  `)).toBe(true);
    expect(isValidCloseoutEvmAddress('0x123')).toBe(false);
    expect(isValidCloseoutEvmAddress('not-an-address')).toBe(false);
    expect(isValidCloseoutEvmAddress('')).toBe(false);
  });

  it('fails readiness and closeout creation before malformed EVM addresses reach anchoring', async () => {
    vi.stubEnv('VITE_SIMULATE_PVM_CLOSEOUT', '1');
    const pot = createPot([{ id: 'bob', evmAddress: '0x123' }]);

    expect(canCreatePvmCloseout(pot)).toBe(false);

    const readiness = await getCloseoutReadiness(pot);
    const evmAddressReadiness = readiness.find((item) => item.id === 'member_evm_addresses');
    expect(evmAddressReadiness?.status).toBe('fail');
    expect(evmAddressReadiness?.detail).toContain('bob');

    await expect(createCloseoutDraft({ pot, createdByMemberId: 'alice' }))
      .rejects
      .toThrow('valid EVM wallet addresses');
  });

  it('creates closeout drafts when participant EVM addresses are valid after trimming', async () => {
    const pot = createPot([{ id: 'bob', evmAddress: `  ${VALID_B}  ` }]);

    expect(canCreatePvmCloseout(pot)).toBe(true);

    const draft = await createCloseoutDraft({ pot, createdByMemberId: 'alice' });
    expect(draft.participantAddresses).toContain(VALID_A);
    expect(draft.participantAddresses).toContain(VALID_B);
  });
});
