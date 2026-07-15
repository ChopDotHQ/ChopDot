import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { type RequestHandler } from 'express';
import { createUsersRouter } from '../routes/users';

vi.mock('../lib/prisma', () => ({
  prisma: {
    potMember: {
      findMany: vi.fn(),
    },
    settlement: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';

const authenticateForRouteTests: RequestHandler = (_req, res, next) => {
  res.locals.principal = Object.freeze({ userId: 'user-alice' });
  next();
};

function buildApp() {
  const app = express();
  app.use('/api/users', createUsersRouter(authenticateForRouteTests));
  return app;
}

function payerLeg(potId: string, id: string) {
  return { id, potId, fromMemberId: 'member-alice' };
}

function receiverLeg(potId: string, id: string) {
  return { id, potId, toMemberId: 'member-alice' };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.potMember.findMany).mockResolvedValue([
    {
      id: 'member-alice',
      userId: 'user-alice',
      potId: 'pot-1',
      role: 'member',
      status: 'active',
      joinedAt: null,
    },
  ] as any);
});

describe('GET /api/users/:userId/pending-actions', () => {
  it('returns empty array when user has no pending legs', async () => {
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns payer entry when user has legs to pay', async () => {
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([
        payerLeg('pot-1', 'leg-1'),
        payerLeg('pot-1', 'leg-2'),
      ] as any)
      .mockResolvedValueOnce([]);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ potId: 'pot-1', count: 2, role: 'payer' }]);
  });

  it('returns receiver entry when user has legs to confirm', async () => {
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([receiverLeg('pot-2', 'leg-1')] as any);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ potId: 'pot-2', count: 1, role: 'receiver' }]);
  });

  it('merges payer and receiver entries for the same pot, elevating to receiver role', async () => {
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([payerLeg('pot-1', 'leg-1')] as any)
      .mockResolvedValueOnce([
        receiverLeg('pot-1', 'leg-2'),
        receiverLeg('pot-1', 'leg-3'),
      ] as any);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ potId: 'pot-1', count: 3, role: 'receiver' });
  });

  it('handles multiple pots independently', async () => {
    vi.mocked(prisma.settlement.findMany)
      .mockResolvedValueOnce([payerLeg('pot-1', 'leg-1')] as any)
      .mockResolvedValueOnce([receiverLeg('pot-2', 'leg-2')] as any);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const potIds = res.body.map((row: { potId: string }) => row.potId).sort();
    expect(potIds).toEqual(['pot-1', 'pot-2']);
  });

  it('returns no actions when the authenticated user has no active memberships', async () => {
    vi.mocked(prisma.potMember.findMany).mockResolvedValueOnce([]);

    const res = await request(buildApp()).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(prisma.settlement.findMany).not.toHaveBeenCalled();
  });
});
