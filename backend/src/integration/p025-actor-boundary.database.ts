import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createRequireAuth } from '../auth/authenticate';
import { prisma } from '../lib/prisma';
import { createSettlementsRouter } from '../routes/settlements';

const databaseUrl = process.env.P025_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('P025_DATABASE_URL is required for the disposable database proof');
}

if (process.env.DATABASE_URL !== databaseUrl) {
  throw new Error('DATABASE_URL must match P025_DATABASE_URL for the database proof');
}

const ids = {
  potA: '10000000-0000-4000-8000-000000000001',
  potB: '10000000-0000-4000-8000-000000000002',
  minaUser: '20000000-0000-4000-8000-000000000001',
  leoUser: '20000000-0000-4000-8000-000000000002',
  ninaUser: '20000000-0000-4000-8000-000000000003',
  malloryUser: '20000000-0000-4000-8000-000000000004',
  removedUser: '20000000-0000-4000-8000-000000000005',
  minaMember: '30000000-0000-4000-8000-000000000001',
  leoMember: '30000000-0000-4000-8000-000000000002',
  ninaMember: '30000000-0000-4000-8000-000000000003',
  malloryMember: '30000000-0000-4000-8000-000000000004',
  removedMember: '30000000-0000-4000-8000-000000000005',
  leoSettlement: '40000000-0000-4000-8000-000000000001',
  ninaSettlement: '40000000-0000-4000-8000-000000000002',
};

const tokenUsers: Record<string, string> = {
  'mina-token': ids.minaUser,
  'leo-token': ids.leoUser,
  'nina-token': ids.ninaUser,
  'mallory-token': ids.malloryUser,
  'removed-token': ids.removedUser,
};

const authenticate = createRequireAuth(async (token) => {
  const userId = tokenUsers[token];
  return userId ? { userId } : null;
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pots/:potId/settlements', createSettlementsRouter(authenticate));
  return app;
}

async function cleanup() {
  await prisma.pot.deleteMany({ where: { id: { in: [ids.potA, ids.potB] } } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [ids.minaUser, ids.leoUser, ids.ninaUser, ids.malloryUser, ids.removedUser],
      },
    },
  });
  const [authUsers] = await prisma.$queryRaw<Array<{ authUsers: string | null }>>`
    select to_regclass('auth.users')::text as "authUsers"
  `;
  if (authUsers?.authUsers) {
    await prisma.$executeRaw`
      delete from auth.users
      where id in (
        ${ids.minaUser}::uuid,
        ${ids.leoUser}::uuid,
        ${ids.ninaUser}::uuid,
        ${ids.malloryUser}::uuid,
        ${ids.removedUser}::uuid
      )
    `;
  }
}

async function seed() {
  await cleanup();

  const [authUsers] = await prisma.$queryRaw<Array<{ authUsers: string | null }>>`
    select to_regclass('auth.users')::text as "authUsers"
  `;
  if (authUsers?.authUsers) {
    await prisma.$executeRaw`
      insert into auth.users (id)
      values
        (${ids.minaUser}::uuid),
        (${ids.leoUser}::uuid),
        (${ids.ninaUser}::uuid),
        (${ids.malloryUser}::uuid),
        (${ids.removedUser}::uuid)
      on conflict (id) do nothing
    `;
  }

  await prisma.user.createMany({
    data: [
      { id: ids.minaUser, name: 'Mina' },
      { id: ids.leoUser, name: 'Leo' },
      { id: ids.ninaUser, name: 'Nina' },
      { id: ids.malloryUser, name: 'Mallory' },
      { id: ids.removedUser, name: 'Removed member' },
    ],
    skipDuplicates: true,
  });

  await prisma.pot.createMany({
    data: [
      { id: ids.potA, name: 'P-025 actor proof', createdBy: ids.minaUser },
      { id: ids.potB, name: 'P-025 unrelated pot', createdBy: ids.malloryUser },
    ],
  });

  // The Supabase migration chain auto-creates owner memberships via a trigger;
  // the Prisma-projected schema does not. Use explicit ids in both environments.
  await prisma.potMember.deleteMany({ where: { potId: { in: [ids.potA, ids.potB] } } });

  await prisma.potMember.createMany({
    data: [
      {
        id: ids.minaMember,
        potId: ids.potA,
        userId: ids.minaUser,
        role: 'owner',
        status: 'active',
      },
      {
        id: ids.leoMember,
        potId: ids.potA,
        userId: ids.leoUser,
        role: 'member',
        status: 'active',
      },
      {
        id: ids.ninaMember,
        potId: ids.potA,
        userId: ids.ninaUser,
        role: 'member',
        status: 'active',
      },
      {
        id: ids.removedMember,
        potId: ids.potA,
        userId: ids.removedUser,
        role: 'member',
        status: 'removed',
      },
      {
        id: ids.malloryMember,
        potId: ids.potB,
        userId: ids.malloryUser,
        role: 'owner',
        status: 'active',
      },
    ],
  });

  await prisma.settlement.createMany({
    data: [
      {
        id: ids.leoSettlement,
        potId: ids.potA,
        fromMemberId: ids.leoMember,
        toMemberId: ids.minaMember,
        amountMinor: BigInt(4000),
        currencyCode: 'CHF',
        status: 'pending',
      },
      {
        id: ids.ninaSettlement,
        potId: ids.potA,
        fromMemberId: ids.ninaMember,
        toMemberId: ids.minaMember,
        amountMinor: BigInt(4000),
        currencyCode: 'CHF',
        status: 'pending',
      },
    ],
  });
}

async function settlementStatus(id: string) {
  return (await prisma.settlement.findUniqueOrThrow({ where: { id } })).status;
}

async function run() {
  const app = buildApp();
  await seed();

  const removed = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/pay`)
    .set('Authorization', 'Bearer removed-token')
    .send({ method: 'cash' });
  assert.equal(removed.status, 403);
  assert.equal(await settlementStatus(ids.leoSettlement), 'pending');

  const crossPot = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/pay`)
    .set('Authorization', 'Bearer mallory-token')
    .send({ method: 'cash' });
  assert.equal(crossPot.status, 403);
  assert.equal(await settlementStatus(ids.leoSettlement), 'pending');

  const wrongPayer = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/pay`)
    .set('Authorization', 'Bearer nina-token')
    .send({ method: 'cash' });
  assert.equal(wrongPayer.status, 403);
  assert.equal(await settlementStatus(ids.leoSettlement), 'pending');
  assert.equal(await prisma.payment.count({ where: { settlementId: ids.leoSettlement } }), 0);
  assert.equal(await prisma.potEvent.count({ where: { potId: ids.potA } }), 0);

  const paid = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/pay`)
    .set('Authorization', 'Bearer leo-token')
    .send({ method: 'cash', reference: 'p025-proof' });
  assert.equal(paid.status, 200);
  assert.equal(await settlementStatus(ids.leoSettlement), 'paid');
  assert.equal(await prisma.payment.count({ where: { settlementId: ids.leoSettlement } }), 1);

  const repeatedPaid = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/pay`)
    .set('Authorization', 'Bearer leo-token')
    .send({ method: 'cash', reference: 'p025-proof' });
  assert.equal(repeatedPaid.status, 409);
  assert.equal(await settlementStatus(ids.leoSettlement), 'paid');
  assert.equal(await prisma.payment.count({ where: { settlementId: ids.leoSettlement } }), 1);
  assert.equal(await prisma.potEvent.count({ where: { potId: ids.potA } }), 1);

  const payerCannotConfirm = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/confirm`)
    .set('Authorization', 'Bearer leo-token');
  assert.equal(payerCannotConfirm.status, 403);
  assert.equal(await settlementStatus(ids.leoSettlement), 'paid');

  const confirmed = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/confirm`)
    .set('Authorization', 'Bearer mina-token');
  assert.equal(confirmed.status, 200);
  assert.equal(await settlementStatus(ids.leoSettlement), 'confirmed');
  assert.equal(await settlementStatus(ids.ninaSettlement), 'pending');

  const repeatedConfirmed = await request(app)
    .patch(`/api/pots/${ids.potA}/settlements/${ids.leoSettlement}/confirm`)
    .set('Authorization', 'Bearer mina-token');
  assert.equal(repeatedConfirmed.status, 409);
  assert.equal(await settlementStatus(ids.leoSettlement), 'confirmed');
  assert.equal(await prisma.payment.count({ where: { settlementId: ids.leoSettlement } }), 1);
  assert.equal(await prisma.potEvent.count({ where: { potId: ids.potA } }), 2);

  const pot = await prisma.pot.findUniqueOrThrow({ where: { id: ids.potA } });
  assert.equal(pot.status, 'active');

  const events = await prisma.potEvent.findMany({
    where: { potId: ids.potA },
    orderBy: { createdAt: 'asc' },
  });
  assert.deepEqual(
    events.map((event) => [event.type, event.actorId]),
    [
      ['leg_marked_paid', ids.leoUser],
      ['leg_confirmed', ids.minaUser],
    ],
  );

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        database: 'disposable-postgres',
        checks: {
          inactiveMemberRejected: true,
          crossPotMemberRejected: true,
          wrongPayerRejectedWithoutSideEffects: true,
          payerMarkedOwnPayment: true,
          repeatedCommandsCreatedNoDuplicateEffects: true,
          payerCouldNotConfirm: true,
          receiverConfirmed: true,
          unrelatedShareRemainedOpen: true,
          auditActorsMatchedVerifiedUsers: true,
        },
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
