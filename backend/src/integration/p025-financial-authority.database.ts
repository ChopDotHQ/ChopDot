import assert from 'node:assert/strict';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.P025_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('P025_DATABASE_URL is required for the financial-authority proof');
}

if (process.env.DATABASE_URL !== databaseUrl) {
  throw new Error('DATABASE_URL must match P025_DATABASE_URL for the financial-authority proof');
}

const ids = {
  pot: '71000000-0000-4000-8000-000000000001',
  forgedClosedPot: '71000000-0000-4000-8000-000000000002',
  payerUser: '72000000-0000-4000-8000-000000000001',
  receiverUser: '72000000-0000-4000-8000-000000000002',
  payerMember: '73000000-0000-4000-8000-000000000001',
  receiverMember: '73000000-0000-4000-8000-000000000002',
  settlement: '74000000-0000-4000-8000-000000000001',
  readablePayment: '75000000-0000-4000-8000-000000000001',
  fabricatedPayment: '75000000-0000-4000-8000-000000000002',
  event: '76000000-0000-4000-8000-000000000001',
};

const pool = new Pool({ connectionString: databaseUrl });

async function seed(client: PoolClient) {
  await client.query('delete from public.pots where id = any($1::uuid[])', [
    [ids.pot, ids.forgedClosedPot],
  ]);
  await client.query('delete from public.users where id = any($1::uuid[])', [
    [ids.payerUser, ids.receiverUser],
  ]);
  await client.query('delete from auth.users where id = any($1::uuid[])', [
    [ids.payerUser, ids.receiverUser],
  ]);

  await client.query('insert into auth.users (id) values ($1), ($2)', [
    ids.payerUser,
    ids.receiverUser,
  ]);
  await client.query(
    `insert into public.users (id, name)
     values ($1, 'Authority payer'), ($2, 'Authority receiver')`,
    [ids.payerUser, ids.receiverUser],
  );
  await client.query(
    `insert into public.pots (id, name, created_by)
     values ($1, 'Financial authority proof', $2)`,
    [ids.pot, ids.receiverUser],
  );
  await client.query('delete from public.pot_members where pot_id = $1', [ids.pot]);
  await client.query(
    `insert into public.pot_members (id, pot_id, user_id, role, status)
     values
       ($1, $2, $3, 'member', 'active'),
       ($4, $2, $5, 'owner', 'active')`,
    [
      ids.payerMember,
      ids.pot,
      ids.payerUser,
      ids.receiverMember,
      ids.receiverUser,
    ],
  );
  await client.query(
    `insert into public.settlements (
       id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status
     ) values ($1, $2, $3, $4, 4000, 'CHF', 'pending')`,
    [ids.settlement, ids.pot, ids.payerMember, ids.receiverMember],
  );
  await client.query(
    `insert into public.payments (id, settlement_id, method, reference)
     values ($1, $2, 'cash', 'authority-read-proof')`,
    [ids.readablePayment, ids.settlement],
  );
}

async function asAuthenticated<T>(
  client: PoolClient,
  userId: string,
  operation: () => Promise<T>,
): Promise<T> {
  await client.query('begin');
  try {
    await client.query('set local role authenticated');
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await operation();
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function expectPermissionDenied(operation: () => Promise<unknown>) {
  let error: unknown;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof Error, 'expected PostgreSQL to deny the direct client write');
  const code = (error as Error & { code?: string }).code;
  assert.equal(code, '42501', `expected insufficient_privilege (42501), received ${code ?? 'no code'}`);
}

async function run() {
  const client = await pool.connect();
  try {
    await seed(client);

    const readable = await asAuthenticated(client, ids.payerUser, () =>
      client.query<{ status: string }>(
        'select status from public.settlements where id = $1',
        [ids.settlement],
      ),
    );
    assert.equal(readable.rows[0]?.status, 'pending');

    const readablePayments = await asAuthenticated(client, ids.payerUser, () =>
      client.query<{ id: string }>(
        'select id from public.payments where settlement_id = $1',
        [ids.settlement],
      ),
    );
    assert.deepEqual(readablePayments.rows.map((row) => row.id), [ids.readablePayment]);

    const mutationPrivileges = await client.query<{ table_name: string; privilege_type: string }>(`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('settlements', 'payments', 'pot_events')
        and grantee = 'authenticated'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
      order by table_name, privilege_type
    `);
    assert.deepEqual(mutationPrivileges.rows, []);

    const mutationPolicies = await client.query<{ tablename: string; cmd: string }>(`
      select tablename, cmd
      from pg_policies
      where schemaname = 'public'
        and tablename in ('settlements', 'payments', 'pot_events')
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      order by tablename, cmd
    `);
    assert.deepEqual(mutationPolicies.rows, []);

    await expectPermissionDenied(() =>
      asAuthenticated(client, ids.payerUser, () =>
        client.query(
          `update public.settlements set status = 'confirmed' where id = $1`,
          [ids.settlement],
        ),
      ),
    );

    const normalPotEdit = await asAuthenticated(client, ids.receiverUser, () =>
      client.query(
        `update public.pots set name = 'Edited authority proof' where id = $1`,
        [ids.pot],
      ),
    );
    assert.equal(normalPotEdit.rowCount, 1);

    await expectPermissionDenied(() =>
      asAuthenticated(client, ids.receiverUser, () =>
        client.query(`update public.pots set status = 'completed' where id = $1`, [ids.pot]),
      ),
    );

    await expectPermissionDenied(() =>
      asAuthenticated(client, ids.receiverUser, () =>
        client.query(
          `insert into public.pots (id, name, created_by, status)
           values ($1, 'Forged closed pot', $2, 'completed')`,
          [ids.forgedClosedPot, ids.receiverUser],
        ),
      ),
    );

    await expectPermissionDenied(() =>
      asAuthenticated(client, ids.payerUser, () =>
        client.query(
          `insert into public.payments (id, settlement_id, method)
           values ($1, $2, 'cash')`,
          [ids.fabricatedPayment, ids.settlement],
        ),
      ),
    );

    await expectPermissionDenied(() =>
      asAuthenticated(client, ids.payerUser, () =>
        client.query(
          `insert into public.pot_events (id, pot_id, type, actor_id, meta)
           values ($1, $2, 'leg_confirmed', $3, '{}'::jsonb)`,
          [ids.event, ids.pot, ids.payerUser],
        ),
      ),
    );

    const unchanged = await client.query<{ status: string }>(
      'select status from public.settlements where id = $1',
      [ids.settlement],
    );
    const paymentCount = await client.query<{ count: string }>(
      'select count(*)::text as count from public.payments where settlement_id = $1',
      [ids.settlement],
    );
    const eventCount = await client.query<{ count: string }>(
      'select count(*)::text as count from public.pot_events where pot_id = $1',
      [ids.pot],
    );
    const potState = await client.query<{ name: string; status: string }>(
      'select name, status from public.pots where id = $1',
      [ids.pot],
    );
    const forgedPotCount = await client.query<{ count: string }>(
      'select count(*)::text as count from public.pots where id = $1',
      [ids.forgedClosedPot],
    );

    assert.equal(unchanged.rows[0]?.status, 'pending');
    assert.equal(paymentCount.rows[0]?.count, '1');
    assert.equal(eventCount.rows[0]?.count, '0');
    assert.deepEqual(potState.rows[0], {
      name: 'Edited authority proof',
      status: 'active',
    });
    assert.equal(forgedPotCount.rows[0]?.count, '0');

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          database: 'migrated-disposable-postgres',
          checks: {
            memberSettlementAndPaymentReadsPreserved: true,
            authenticatedMutationPrivilegesRemoved: true,
            financialMutationPoliciesRemoved: true,
            directSettlementMutationDenied: true,
            directPaymentFabricationDenied: true,
            directEventFabricationDenied: true,
            rejectedWritesHadNoSideEffects: true,
            normalPotEditingPreserved: true,
            directCloseoutTransitionDenied: true,
            directClosedPotCreationDenied: true,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.query('delete from public.pots where id = any($1::uuid[])', [
      [ids.pot, ids.forgedClosedPot],
    ]);
    await client.query('delete from public.users where id = any($1::uuid[])', [
      [ids.payerUser, ids.receiverUser],
    ]);
    await client.query('delete from auth.users where id = any($1::uuid[])', [
      [ids.payerUser, ids.receiverUser],
    ]);
    client.release();
  }
}

run()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
