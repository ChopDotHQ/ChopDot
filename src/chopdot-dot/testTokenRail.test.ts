import { describe, expect, it } from 'vitest';
import {
  addDotObligation,
  buildDotStatus,
  claimDotContribution,
  createDotChapter,
  type DotParticipant,
} from './commitmentKernel';
import {
  completeTestTokenTransfer,
  createTestTokenRail,
  failTestTokenTransfer,
  requestTestTokenTransfer,
} from './testTokenRail';

const participants: DotParticipant[] = [
  { id: 'treasurer', name: 'Treasurer', roles: ['organizer', 'treasurer'] },
  { id: 'member', name: 'Member', roles: ['contributor'] },
];

function chapterWithObligation() {
  let chapter = createDotChapter({
    id: 'token-rail-test',
    name: 'Token rail test',
    mode: 'savings_circle',
    currency: 'TEST_USD',
    policySummary: 'Token completion is evidence only.',
    participants,
  });
  chapter = addDotObligation(chapter, {
    kind: 'circle_contribution',
    title: 'Member contribution',
    fromParticipantId: 'member',
    toParticipantId: 'treasurer',
    amount: 100,
    currency: 'TEST_USD',
    required: true,
  });
  return chapter;
}

describe('ChopDot.dot fake test-token rail', () => {
  it('completes fake token movement without confirming the obligation', () => {
    const chapter = chapterWithObligation();
    let rail = createTestTokenRail([
      { participantId: 'member', currency: 'TEST_USD', available: 200 },
      { participantId: 'treasurer', currency: 'TEST_USD', available: 0 },
    ]);

    rail = requestTestTokenTransfer(rail, {
      subjectId: 'obligation_1',
      fromParticipantId: 'member',
      toParticipantId: 'treasurer',
      amount: 100,
      currency: 'TEST_USD',
      note: 'Evidence only',
    });
    rail = completeTestTokenTransfer(rail, 'test_transfer_1');

    expect(rail.transfers[0]?.state).toBe('completed');
    expect(chapter.obligations[0]?.state).toBe('open');
    expect(buildDotStatus(chapter).closeoutReadiness).toBe('blocked');
  });

  it('requires a separate claim and receiver confirmation after token evidence', () => {
    let chapter = chapterWithObligation();
    chapter = claimDotContribution(chapter, {
      obligationId: 'obligation_1',
      claimantId: 'member',
      note: 'Fake token evidence completed.',
    });

    expect(chapter.obligations[0]?.state).toBe('claimed');
    expect(buildDotStatus(chapter).blockers[0]).toContain('Member must complete');
  });

  it('blocks duplicate active transfer evidence for the same action', () => {
    let rail = createTestTokenRail([
      { participantId: 'member', currency: 'TEST_USD', available: 300 },
      { participantId: 'treasurer', currency: 'TEST_USD', available: 0 },
    ]);
    rail = requestTestTokenTransfer(rail, {
      subjectId: 'obligation_1',
      fromParticipantId: 'member',
      toParticipantId: 'treasurer',
      amount: 100,
      currency: 'TEST_USD',
      note: 'First evidence',
    });

    expect(() =>
      requestTestTokenTransfer(rail, {
        subjectId: 'obligation_1',
        fromParticipantId: 'member',
        toParticipantId: 'treasurer',
        amount: 100,
        currency: 'TEST_USD',
        note: 'Duplicate evidence',
      }),
    ).toThrow(/duplicate/i);
  });

  it('failed transfer returns balance and leaves no completed evidence', () => {
    let rail = createTestTokenRail([
      { participantId: 'member', currency: 'TEST_USD', available: 100 },
      { participantId: 'treasurer', currency: 'TEST_USD', available: 0 },
    ]);
    rail = requestTestTokenTransfer(rail, {
      subjectId: 'failed-transfer',
      fromParticipantId: 'member',
      toParticipantId: 'treasurer',
      amount: 100,
      currency: 'TEST_USD',
      note: 'Failure drill',
    });
    rail = failTestTokenTransfer(rail, 'test_transfer_1');

    expect(rail.transfers[0]?.state).toBe('failed');
    expect(rail.balances.find((item) => item.participantId === 'member')?.available).toBe(100);
  });

  it('blocks insufficient balances', () => {
    const rail = createTestTokenRail([
      { participantId: 'member', currency: 'TEST_USD', available: 50 },
      { participantId: 'treasurer', currency: 'TEST_USD', available: 0 },
    ]);

    expect(() =>
      requestTestTokenTransfer(rail, {
        subjectId: 'too-large',
        fromParticipantId: 'member',
        toParticipantId: 'treasurer',
        amount: 100,
        currency: 'TEST_USD',
        note: 'Too large',
      }),
    ).toThrow(/insufficient/i);
  });
});
