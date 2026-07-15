import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequireAuth } from '../auth/authenticate';
import { createAiRouter } from '../routes/ai';
import { createPotEventsRouter, createSettlementsRouter } from '../routes/settlements';
import { createUsersRouter } from '../routes/users';

vi.mock('../lib/prisma', () => ({
  prisma: {
    settlement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    payment: { create: vi.fn() },
    potEvent: { create: vi.fn(), findMany: vi.fn() },
    pot: { update: vi.fn() },
    potMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma';

const verifyToken = vi.fn(async (token: string) => {
  const users: Record<string, string> = {
    'alice-token': 'user-alice',
    'bob-token': 'user-bob',
    'mallory-token': 'user-mallory',
  };
  return users[token] ? { userId: users[token] } : null;
});

const authenticate: RequestHandler = createRequireAuth(verifyToken);

function buildSettlementApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pots/:potId/settlements', createSettlementsRouter(authenticate));
  return app;
}

function buildUserApp() {
  const app = express();
  app.use('/api/users', createUsersRouter(authenticate));
  return app;
}

function buildPotEventApp() {
  const app = express();
  app.use('/api/pots/:potId/events', createPotEventsRouter(authenticate));
  return app;
}

function buildAiApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pots/:potId/ai', createAiRouter(authenticate));
  return app;
}

function settlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'leg-1',
    potId: 'pot-abc',
    fromMemberId: 'member-alice',
    toMemberId: 'member-bob',
    amountMinor: BigInt(4000),
    currencyCode: 'CHF',
    status: 'pending',
    txHash: null,
    createdAt: new Date('2026-07-14T00:00:00Z'),
    confirmations: 0,
    ...overrides,
  };
}

describe('settlement actor boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.potEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.payment.create).mockResolvedValue({} as never);
  });

  it('rejects unauthenticated settlement mutation with no side effects', async () => {
    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .send({ method: 'cash' });

    expect(response.status).toBe(401);
    expect(prisma.settlement.findUnique).not.toHaveBeenCalled();
    expect(prisma.settlement.update).not.toHaveBeenCalled();
    expect(prisma.potEvent.create).not.toHaveBeenCalled();
  });

  it('ignores forged x-user-id and rejects a non-payer', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-mallory',
      userId: 'user-mallory',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(settlement() as never);

    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .set('Authorization', 'Bearer mallory-token')
      .set('x-user-id', 'user-alice')
      .send({ method: 'cash' });

    expect(response.status).toBe(403);
    expect(prisma.settlement.update).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.potEvent.create).not.toHaveBeenCalled();
  });

  it('keeps repeated rejected payer commands side-effect free', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-mallory',
      userId: 'user-mallory',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(settlement() as never);

    const app = buildSettlementApp();
    const first = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .set('Authorization', 'Bearer mallory-token')
      .send({ method: 'cash' });
    const second = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .set('Authorization', 'Bearer mallory-token')
      .send({ method: 'cash' });

    expect([first.status, second.status]).toEqual([403, 403]);
    expect(prisma.settlement.update).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.potEvent.create).not.toHaveBeenCalled();
  });

  it('allows the authenticated payer and attributes the event to the verified user', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-alice',
      userId: 'user-alice',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(settlement() as never);
    vi.mocked(prisma.settlement.update).mockResolvedValue(
      settlement({ status: 'paid' }) as never,
    );

    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .set('Authorization', 'Bearer alice-token')
      .send({ method: 'cash' });

    expect(response.status).toBe(200);
    expect(prisma.potEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: 'user-alice', type: 'leg_marked_paid' }),
    });
  });

  it('rejects payer confirmation and leaves the paid leg unchanged', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-alice',
      userId: 'user-alice',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(
      settlement({ status: 'paid' }) as never,
    );

    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer alice-token');

    expect(response.status).toBe(403);
    expect(prisma.settlement.update).not.toHaveBeenCalled();
    expect(prisma.potEvent.create).not.toHaveBeenCalled();
  });

  it('allows the authenticated receiver to confirm', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-bob',
      userId: 'user-bob',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(
      settlement({ status: 'paid' }) as never,
    );
    vi.mocked(prisma.settlement.update).mockResolvedValue(
      settlement({ status: 'confirmed' }) as never,
    );
    vi.mocked(prisma.settlement.count).mockResolvedValue(1);

    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');

    expect(response.status).toBe(200);
    expect(prisma.potEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: 'user-bob', type: 'leg_confirmed' }),
    });
  });

  it('rejects a user who is not an active pot member', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue(null);

    const response = await request(buildSettlementApp())
      .get('/api/pots/pot-abc/settlements')
      .set('Authorization', 'Bearer mallory-token');

    expect(response.status).toBe(403);
    expect(prisma.settlement.findMany).not.toHaveBeenCalled();
  });

  it('rejects a settlement from another pot without mutating it', async () => {
    vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
      id: 'member-alice',
      userId: 'user-alice',
      potId: 'pot-abc',
      role: 'member',
      status: 'active',
      joinedAt: null,
    });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(
      settlement({ potId: 'pot-other' }) as never,
    );

    const response = await request(buildSettlementApp())
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .set('Authorization', 'Bearer alice-token')
      .send({ method: 'cash' });

    expect(response.status).toBe(404);
    expect(prisma.settlement.update).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.potEvent.create).not.toHaveBeenCalled();
  });
});

describe('pending-action subject boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects reading another user pending actions', async () => {
    const response = await request(buildUserApp())
      .get('/api/users/user-bob/pending-actions')
      .set('Authorization', 'Bearer alice-token');

    expect(response.status).toBe(403);
    expect(prisma.potMember.findMany).not.toHaveBeenCalled();
    expect(prisma.settlement.findMany).not.toHaveBeenCalled();
  });

  it('reads pending actions only through the authenticated user active memberships', async () => {
    vi.mocked(prisma.potMember.findMany).mockResolvedValue([
      {
        id: 'member-alice',
        userId: 'user-alice',
        potId: 'pot-abc',
        role: 'member',
        status: 'active',
        joinedAt: null,
      },
    ]);
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([
        { id: 'leg-pay', potId: 'pot-abc', fromMemberId: 'member-alice' },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const response = await request(buildUserApp())
      .get('/api/users/user-alice/pending-actions')
      .set('Authorization', 'Bearer alice-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ potId: 'pot-abc', count: 1, role: 'payer' }]);
    expect(prisma.settlement.findMany).toHaveBeenCalledWith({
      where: { fromMemberId: { in: ['member-alice'] }, status: 'pending' },
      select: { id: true, potId: true, fromMemberId: true },
    });
  });
});

describe('other protected pot surfaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated pot-event reads', async () => {
    const response = await request(buildPotEventApp()).get('/api/pots/pot-abc/events');

    expect(response.status).toBe(401);
    expect(prisma.potMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.potEvent.findMany).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated AI receipt parsing before reading pot data', async () => {
    const response = await request(buildAiApp())
      .post('/api/pots/pot-abc/ai/parse-receipt')
      .send({ chatLog: 'Mina paid 40' });

    expect(response.status).toBe(401);
    expect(prisma.potMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.potMember.findMany).not.toHaveBeenCalled();
  });
});
