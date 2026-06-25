import { describe, expect, it } from 'vitest';
import { addMember, createAppChapter } from '../chapter/chapterEngine';
import { commitSpendSession } from '../services/capture/KernelBridge';
import type { SpendSession } from '../services/capture/types';
import { CoinageHostEvidenceAdapter, type CoinageHostPaymentInput } from './coinageEvidence';

function baseInput(overrides: Partial<CoinageHostPaymentInput> = {}): CoinageHostPaymentInput {
  return {
    subjectId: 'obligation_1',
    paymentId: 'coinage-1',
    amount: 100,
    currency: 'TEST_USDC',
    merchantName: 'Circle Market',
    topic: '0xpayw3s-topic',
    encryptedCheque: '0xencrypted-cheque',
    ephemeralPublicKey: '0xephemeral-public-key',
    rawPaymentLink: 'polkadotapp://pay/cheque?id=coinage-1&amount=100&key=0xPUBLIC',
    ...overrides,
  };
}

function baseChapter() {
  let chapter = createAppChapter({
    name: 'Friday Crew',
    currency: 'CHF',
    organizerMemberId: 'mina',
    organizerName: 'Mina',
    potId: 'pot_coinage',
  });
  chapter = addMember(chapter, { name: 'Leo', memberId: 'leo' });
  chapter = addMember(chapter, { name: 'Nina', memberId: 'nina' });
  return chapter;
}

describe('CoinageHostEvidenceAdapter', () => {
  it('turns host-settled Coinage payment into evidence without confirming ChopDot legs', async () => {
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => true,
      requireHost: true,
      client: {
        claimPayment: async () => ({
          status: 'settled',
          txHash: '0xcoinage-host',
          blockNumber: 7,
          extrinsicIndex: 2,
        }),
      },
    });

    const result = await adapter.evidenceForPayment(baseInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.evidence).toMatchObject({
      kind: 'checkout_request',
      source: 'coinage',
      status: 'settled',
      amount: 100,
      currency: 'TEST_USDC',
      paymentId: 'coinage-1',
    });
    expect(result.notice).toContain('Receiver confirmation is still required');
    expect(JSON.stringify(result.evidence)).not.toContain('0xencrypted-cheque');
    expect(JSON.stringify(result.evidence)).not.toContain('0xephemeral-public-key');

    const chapter = baseChapter();
    const session: SpendSession = {
      id: 'coinage_spend_1',
      spendCardId: chapter.spendCards?.[0]?.id ?? 'sc_default',
      potId: 'pot_coinage',
      payerMemberId: 'mina',
      participantIds: ['mina', 'leo', 'nina'],
      amount: 100,
      currency: 'CHF',
      memo: 'Circle Market',
      paymentEvidence: result.evidence,
      status: 'draft',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const committed = commitSpendSession(chapter, session);

    expect(committed.openLegs).toHaveLength(2);
    expect(committed.openLegs.every((leg) => leg.state === 'open')).toBe(true);
  });

  it('fails visibly when Coinage host evidence times out', async () => {
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => true,
      requireHost: true,
      client: {
        claimPayment: async () => ({ status: 'timeout' }),
      },
    });

    const result = await adapter.evidenceForPayment(baseInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('timeout');
    expect(result.reason).toContain('timed out');
  });

  it('fails visibly when Coinage host evidence is rejected', async () => {
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => true,
      requireHost: true,
      client: {
        claimPayment: async () => ({ status: 'rejected', reason: 'bearer coin claim rejected' }),
      },
    });

    const result = await adapter.evidenceForPayment(baseInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('rejected');
    expect(result.reason).toContain('rejected');
  });

  it('blocks local fallback when Coinage host support is required', async () => {
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => false,
      requireHost: true,
    });

    const result = await adapter.evidenceForPayment(baseInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('host_unavailable');
    expect(result.reason).toContain('requires the Polkadot host');
  });

  it('dedupes redelivered Coinage messages without another host claim', async () => {
    let claimCount = 0;
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => true,
      requireHost: true,
      client: {
        claimPayment: async () => {
          claimCount += 1;
          return { status: 'claimed', txHash: '0xcoinage-claim' };
        },
      },
    });

    const first = await adapter.evidenceForPayment(baseInput());
    const second = await adapter.evidenceForPayment(baseInput());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(claimCount).toBe(1);
    expect(second.deduped).toBe(true);
    expect(second.evidence.id).toBe(first.evidence.id);
  });

  it('rejects Coinage evidence that carries private secret material', async () => {
    const adapter = new CoinageHostEvidenceAdapter({
      shouldAttemptHost: () => true,
      requireHost: true,
      client: {
        claimPayment: async () => ({ status: 'settled' }),
      },
    });

    const result = await adapter.evidenceForPayment(baseInput({
      rawPaymentLink: 'polkadotapp://pay/cheque?id=coinage-1&amount=100&private_key=0xSECRET',
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('privacy_violation');
    expect(result.reason).toContain('private secret');
  });
});

