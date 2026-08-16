import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { usersRouter } from '../routes/users';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    settlement: {
      groupBy: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/users/:userId/pending-actions', () => {
  it('returns empty array when user has no pending legs', async () => {
    vi.mocked(prisma.settlement.groupBy)
      .mockResolvedValueOnce([])  // payer query
      .mockResolvedValueOnce([]); // receiver query

    const res = await request(app).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns payer entry when user has legs to pay', async () => {
    vi.mocked(prisma.settlement.groupBy)
      .mockResolvedValueOnce([{ potId: 'pot-1', _count: { id: 2 } }] as any)
      .mockResolvedValueOnce([]);

    const res = await request(app).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ potId: 'pot-1', count: 2, role: 'payer' }]);
  });

  it('returns receiver entry when user has legs to confirm', async () => {
    vi.mocked(prisma.settlement.groupBy)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ potId: 'pot-2', _count: { id: 1 } }] as any);

    const res = await request(app).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ potId: 'pot-2', count: 1, role: 'receiver' }]);
  });

  it('merges payer + receiver entries for the same pot, elevating to receiver role', async () => {
    vi.mocked(prisma.settlement.groupBy)
      .mockResolvedValueOnce([{ potId: 'pot-1', _count: { id: 1 } }] as any)
      .mockResolvedValueOnce([{ potId: 'pot-1', _count: { id: 2 } }] as any);

    const res = await request(app).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ potId: 'pot-1', count: 3, role: 'receiver' });
  });

  it('handles multiple pots independently', async () => {
    vi.mocked(prisma.settlement.groupBy)
      .mockResolvedValueOnce([{ potId: 'pot-1', _count: { id: 1 } }] as any)
      .mockResolvedValueOnce([{ potId: 'pot-2', _count: { id: 1 } }] as any);

    const res = await request(app).get('/api/users/user-alice/pending-actions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const potIds = res.body.map((r: { potId: string }) => r.potId).sort();
    expect(potIds).toEqual(['pot-1', 'pot-2']);
  });
});
