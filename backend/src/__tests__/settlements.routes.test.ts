import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { createSettlementsRouter } from '../routes/settlements';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock('../lib/prisma', () => ({
  prisma: {
    settlement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    potEvent: {
      create: vi.fn(),
    },
    pot: {
      update: vi.fn(),
    },
    potMember: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Import after vi.mock so the mock is in place
import { prisma } from '../lib/prisma';

// ─── App factory ─────────────────────────────────────────────────────────────

const authenticateForRouteTests: RequestHandler = (req, res, next) => {
  const authorization = req.header('authorization');
  res.locals.principal = Object.freeze({
    userId: authorization === 'Bearer bob-token' ? 'user-bob' : 'user-alice',
  });
  next();
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/pots/:potId/settlements',
    createSettlementsRouter(authenticateForRouteTests),
  );
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    },
  );
  return app;
}

function mockActiveMember(
  overrides: Partial<{
    id: string;
    userId: string;
    role: string;
  }> = {},
) {
  vi.mocked(prisma.potMember.findFirst).mockResolvedValue({
    id: 'alice',
    userId: 'user-alice',
    potId: 'pot-abc',
    role: 'owner',
    status: 'active',
    joinedAt: null,
    ...overrides,
  } as any);
}

// ─── Shared test data ─────────────────────────────────────────────────────────

function makeDbRow(overrides: Partial<{
  id: string;
  potId: string;
  fromMemberId: string;
  toMemberId: string;
  amountMinor: bigint;
  currencyCode: string;
  status: string;
  txHash: string | null;
  createdAt: Date;
  confirmations: number;
}> = {}) {
  return {
    id: 'leg-1',
    potId: 'pot-abc',
    fromMemberId: 'alice',
    toMemberId: 'bob',
    amountMinor: BigInt(1250), // 12.50
    currencyCode: 'CHF',
    status: 'pending',
    txHash: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    confirmations: 0,
    ...overrides,
  };
}

// ─── GET /api/pots/:potId/settlements ─────────────────────────────────────────

describe('GET /api/pots/:potId/settlements', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveMember();
  });

  it('returns 200 with an array of wire-shaped legs', async () => {
    vi.mocked(prisma.settlement.findMany).mockResolvedValueOnce([makeDbRow()] as any);

    const res = await request(app).get('/api/pots/pot-abc/settlements');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'leg-1',
      potId: 'pot-abc',
      amount: 12.5,
      currency: 'CHF',
      status: 'pending',
    });
  });

  it('converts amountMinor (bigint) to a decimal float correctly', async () => {
    vi.mocked(prisma.settlement.findMany).mockResolvedValueOnce(
      [makeDbRow({ amountMinor: BigInt(999) })] as any,
    );

    const res = await request(app).get('/api/pots/pot-abc/settlements');
    expect(res.body[0].amount).toBe(9.99);
  });

  it('returns 200 with an empty array when no legs exist', async () => {
    vi.mocked(prisma.settlement.findMany).mockResolvedValueOnce([]);

    const res = await request(app).get('/api/pots/pot-abc/settlements');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('includes paidAt/method from txHash when present', async () => {
    const txHash = JSON.stringify({ method: 'bank', paidAt: '2024-01-02T00:00:00.000Z' });
    vi.mocked(prisma.settlement.findMany).mockResolvedValueOnce(
      [makeDbRow({ status: 'paid', txHash })] as any,
    );

    const res = await request(app).get('/api/pots/pot-abc/settlements');
    expect(res.body[0].method).toBe('bank');
    expect(res.body[0].paidAt).toBe('2024-01-02T00:00:00.000Z');
  });
});

// ─── POST /api/pots/:potId/settlements ───────────────────────────────────────

describe('POST /api/pots/:potId/settlements', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveMember();
    vi.mocked(prisma.potEvent.create).mockResolvedValue({} as any);
  });

  it('returns 400 when legs is missing', async () => {
    const res = await request(app).post('/api/pots/pot-abc/settlements').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('legs[] required');
  });

  it('returns 400 when legs is an empty array', async () => {
    const res = await request(app)
      .post('/api/pots/pot-abc/settlements')
      .send({ legs: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('legs[] required');
  });

  it('returns 201 with created legs on success', async () => {
    const createdRow = makeDbRow({ id: 'leg-new', status: 'pending' });
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([createdRow] as any);

    const res = await request(app)
      .post('/api/pots/pot-abc/settlements')
      .send({
        legs: [{ fromMemberId: 'alice', toMemberId: 'bob', amount: 12.5, currency: 'CHF' }],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('leg-new');
    expect(res.body[0].status).toBe('pending');
  });

  it('attributes chapter_proposed to the authenticated principal', async () => {
    const createdRow = makeDbRow({ id: 'leg-new' });
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([createdRow] as any);

    await request(app)
      .post('/api/pots/pot-abc/settlements')
      .set('x-user-id', 'forged-user')
      .send({
        legs: [{ fromMemberId: 'alice', toMemberId: 'bob', amount: 5, currency: 'CHF' }],
      });

    expect(prisma.potEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'chapter_proposed', actorId: 'user-alice' }),
      }),
    );
  });

  it('writes an attributable event without an x-user-id header', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([makeDbRow()] as any);

    await request(app)
      .post('/api/pots/pot-abc/settlements')
      .send({
        legs: [{ fromMemberId: 'alice', toMemberId: 'bob', amount: 5, currency: 'CHF' }],
      });

    expect(prisma.potEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'chapter_proposed', actorId: 'user-alice' }),
      }),
    );
  });
});

// ─── PATCH /:id/pay ───────────────────────────────────────────────────────────

describe('PATCH /api/pots/:potId/settlements/:id/pay', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveMember();
    vi.mocked(prisma.potEvent.create).mockResolvedValue({} as any);
    vi.mocked(prisma.payment.create).mockResolvedValue({} as any);
  });

  it('returns 404 when the leg is not found', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-missing/pay')
      .send({ method: 'cash' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Settlement not found');
  });

  it('returns 404 when the leg belongs to a different pot', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(
      makeDbRow({ potId: 'different-pot' }) as any,
    );

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .send({ method: 'cash' });

    expect(res.status).toBe(404);
  });

  it('returns 409 when the leg is not pending', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(
      makeDbRow({ status: 'paid' }) as any,
    );

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .send({ method: 'bank' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("status is 'paid'");
  });

  it('returns 200 with the updated leg on success', async () => {
    const pendingRow = makeDbRow({ status: 'pending' });
    const paidRow = makeDbRow({ status: 'paid', txHash: JSON.stringify({ method: 'bank' }) });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(pendingRow as any);
    vi.mocked(prisma.settlement.update).mockResolvedValueOnce(paidRow as any);

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .send({ method: 'bank', reference: 'ref-999' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
    expect(res.body.method).toBe('bank');
  });

  it('creates a payment record on success', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(makeDbRow() as any);
    vi.mocked(prisma.settlement.update).mockResolvedValueOnce(
      makeDbRow({ status: 'paid' }) as any,
    );

    await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/pay')
      .send({ method: 'twint', reference: 'ref-42' });

    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ settlementId: 'leg-1', method: 'twint', reference: 'ref-42' }),
      }),
    );
  });
});

// ─── PATCH /:id/confirm ───────────────────────────────────────────────────────

describe('PATCH /api/pots/:potId/settlements/:id/confirm', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveMember({ id: 'bob', userId: 'user-bob', role: 'member' });
    vi.mocked(prisma.potEvent.create).mockResolvedValue({} as any);
    vi.mocked(prisma.pot.update).mockResolvedValue({} as any);
  });

  it('returns 404 when the leg is not found', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Settlement not found');
  });

  it('returns 409 when the leg is not in paid status', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(
      makeDbRow({ status: 'pending' }) as any,
    );

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("status is 'pending'");
  });

  it('returns 409 when the leg is already confirmed', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(
      makeDbRow({ status: 'confirmed' }) as any,
    );

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("status is 'confirmed'");
  });

  it('returns 200 with the confirmed leg on success', async () => {
    const paidRow = makeDbRow({
      status: 'paid',
      txHash: JSON.stringify({ method: 'cash', paidAt: '2024-01-01T00:00:00.000Z' }),
    });
    const confirmedRow = makeDbRow({ status: 'confirmed' });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(paidRow as any);
    vi.mocked(prisma.settlement.update).mockResolvedValueOnce(confirmedRow as any);
    // remaining count > 0 — no pot closure
    vi.mocked(prisma.settlement.count).mockResolvedValueOnce(1);

    const res = await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('closes the pot when all legs are confirmed (remaining count = 0)', async () => {
    const paidRow = makeDbRow({ status: 'paid', txHash: null });
    const confirmedRow = makeDbRow({ status: 'confirmed' });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(paidRow as any);
    vi.mocked(prisma.settlement.update).mockResolvedValueOnce(confirmedRow as any);
    // remaining count = 0 — this was the last leg
    vi.mocked(prisma.settlement.count).mockResolvedValueOnce(0);

    await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');

    expect(prisma.pot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pot-abc' },
        data: { status: 'completed' },
      }),
    );

    // Also check that a chapter_closed event was written
    const calls = vi.mocked(prisma.potEvent.create).mock.calls;
    const closeCall = calls.find(
      ([arg]) => (arg as any).data.type === 'chapter_closed',
    );
    expect(closeCall).toBeDefined();
  });

  it('does not close the pot when remaining legs are still unconfirmed', async () => {
    const paidRow = makeDbRow({ status: 'paid', txHash: null });
    vi.mocked(prisma.settlement.findUnique).mockResolvedValueOnce(paidRow as any);
    vi.mocked(prisma.settlement.update).mockResolvedValueOnce(
      makeDbRow({ status: 'confirmed' }) as any,
    );
    vi.mocked(prisma.settlement.count).mockResolvedValueOnce(2);

    await request(app)
      .patch('/api/pots/pot-abc/settlements/leg-1/confirm')
      .set('Authorization', 'Bearer bob-token');

    expect(prisma.pot.update).not.toHaveBeenCalled();
  });
});
