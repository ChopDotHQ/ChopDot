import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

const databaseUrl = process.env.P025_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('P025_DATABASE_URL is required for the migration proof');
}

if (process.env.DATABASE_URL !== databaseUrl) {
  throw new Error('DATABASE_URL must match P025_DATABASE_URL for the migration proof');
}

if (process.env.P025_ALLOW_DATABASE_RESET !== 'true') {
  throw new Error('P025_ALLOW_DATABASE_RESET=true is required for this destructive proof');
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = parsedDatabaseUrl.pathname.replace(/^\//, '');
if (
  !['localhost', '127.0.0.1', '::1'].includes(parsedDatabaseUrl.hostname) ||
  !databaseName.startsWith('chopdot_p025_')
) {
  throw new Error(
    'Migration proof only resets a local database named with the chopdot_p025_ prefix',
  );
}

const pool = new Pool({ connectionString: databaseUrl });
const migrationsDirectory = path.resolve(__dirname, '../../../supabase/migrations');
const baselineCutoff = '20260416000001_settlement_idempotency.sql';
const alignmentMigration = '20260714160000_settlement_status_alignment.sql';
const captureSourceMigration = '20260617120000_capture_link_tokens.sql';
const captureRepairMigration = '20260714170000_capture_link_tokens_repair.sql';

async function queryFile(client: PoolClient, filename: string) {
  const sql = await readFile(path.join(migrationsDirectory, filename), 'utf8');
  await client.query('begin');
  try {
    if (sql.trim()) await client.query(sql);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw new Error(`Migration ${filename} failed`, { cause: error });
  }
}

async function prepareSupabaseShims(client: PoolClient) {
  await client.query(`
    drop extension if exists "uuid-ossp" cascade;
    drop extension if exists pgcrypto cascade;
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    drop schema if exists extensions cascade;

    create schema public;
    create schema auth;
    create schema extensions;

    create extension "uuid-ossp" with schema extensions;
    create extension pgcrypto with schema extensions;

    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      end if;
    end
    $$;

    create table auth.users (
      id uuid primary key
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    create or replace function auth.jwt()
    returns jsonb
    language sql
    stable
    as $$
      select coalesce(
        nullif(current_setting('request.jwt.claims', true), '')::jsonb,
        '{}'::jsonb
      )
    $$;

    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
}

async function listMigrations() {
  return (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
}

async function applyBaseline(client: PoolClient, migrations: string[]) {
  for (const migration of migrations.filter((filename) => filename <= baselineCutoff)) {
    await queryFile(client, migration);
  }
}

const legacyIds = {
  pot: '51000000-0000-4000-8000-000000000001',
  payerUser: '52000000-0000-4000-8000-000000000001',
  receiverUser: '52000000-0000-4000-8000-000000000002',
  payerMember: '53000000-0000-4000-8000-000000000001',
  receiverMember: '53000000-0000-4000-8000-000000000002',
  settlement: '54000000-0000-4000-8000-000000000001',
};

async function seedLegacySettlement(client: PoolClient) {
  await client.query('insert into auth.users (id) values ($1), ($2)', [
    legacyIds.payerUser,
    legacyIds.receiverUser,
  ]);
  await client.query(
    `insert into public.users (id, name)
     values ($1, 'Legacy payer'), ($2, 'Legacy receiver')`,
    [legacyIds.payerUser, legacyIds.receiverUser],
  );
  await client.query(
    `insert into public.pots (id, name, created_by)
     values ($1, 'Legacy status proof', $2)`,
    [legacyIds.pot, legacyIds.payerUser],
  );
  await client.query('delete from public.pot_members where pot_id = $1', [legacyIds.pot]);
  await client.query(
    `insert into public.pot_members (id, pot_id, user_id, role, status)
     values
       ($1, $2, $3, 'member', 'active'),
       ($4, $2, $5, 'member', 'active')`,
    [
      legacyIds.payerMember,
      legacyIds.pot,
      legacyIds.payerUser,
      legacyIds.receiverMember,
      legacyIds.receiverUser,
    ],
  );
  await client.query(
    `insert into public.settlements (
       id, pot_id, from_member_id, to_member_id, amount_minor, currency_code, status
     ) values ($1, $2, $3, $4, 100, 'CHF', 'broadcast')`,
    [
      legacyIds.settlement,
      legacyIds.pot,
      legacyIds.payerMember,
      legacyIds.receiverMember,
    ],
  );
}

const captureIds = {
  pot: '61000000-0000-4000-8000-000000000001',
  otherPot: '61000000-0000-4000-8000-000000000002',
  owner: '62000000-0000-4000-8000-000000000001',
  active: '62000000-0000-4000-8000-000000000002',
  pending: '62000000-0000-4000-8000-000000000003',
  removed: '62000000-0000-4000-8000-000000000004',
  unrelated: '62000000-0000-4000-8000-000000000005',
};

async function seedCaptureActors(client: PoolClient) {
  const userIds = [
    captureIds.owner,
    captureIds.active,
    captureIds.pending,
    captureIds.removed,
    captureIds.unrelated,
  ];
  await client.query(
    `insert into auth.users (id)
     select unnest($1::uuid[])`,
    [userIds],
  );
  await client.query(
    `insert into public.users (id, name)
     select id, 'Capture proof user'
     from unnest($1::uuid[]) as id`,
    [userIds],
  );
  await client.query(
    `insert into public.pots (id, name, created_by)
     values
       ($1, 'Capture proof pot', $2),
       ($3, 'Unrelated proof pot', $4)`,
    [captureIds.pot, captureIds.owner, captureIds.otherPot, captureIds.unrelated],
  );
  await client.query(
    `insert into public.pot_members (pot_id, user_id, role, status)
     values
       ($1, $2, 'member', 'active'),
       ($1, $3, 'member', 'pending'),
       ($1, $4, 'member', 'removed')
     on conflict (pot_id, user_id) do update set status = excluded.status`,
    [captureIds.pot, captureIds.active, captureIds.pending, captureIds.removed],
  );
}

async function createLegacyCaptureTable(client: PoolClient) {
  await client.query(`
    drop table if exists public.capture_link_tokens cascade;
    create table public.capture_link_tokens (
      id uuid primary key default gen_random_uuid(),
      token text not null,
      type text not null check (type in ('pay', 'spend', 'confirm')),
      pot_id text not null,
      payload jsonb not null,
      expires_at timestamptz not null,
      consumed_at timestamptz,
      created_by uuid references auth.users(id),
      created_at timestamptz not null default now()
    );
  `);
}

function errorChain(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  return messages.join(': ');
}

async function proveMalformedLegacyValueFails(client: PoolClient, migrations: string[]) {
  await prepareSupabaseShims(client);
  await applyBaseline(client, migrations);
  await createLegacyCaptureTable(client);
  await client.query(
    `insert into public.capture_link_tokens (token, type, pot_id, payload, expires_at)
     values ('malformed-proof', 'pay', 'not-a-uuid', '{}'::jsonb, now() + interval '1 hour')`,
  );

  let message = '';
  try {
    await queryFile(client, captureRepairMigration);
  } catch (error) {
    message = errorChain(error);
  }
  assert.match(message, /non-UUID pot_id value\(s\); repair them explicitly/i);

  const preserved = await client.query<{ pot_id: string }>(
    `select pot_id from public.capture_link_tokens where token = 'malformed-proof'`,
  );
  assert.equal(preserved.rows[0]?.pot_id, 'not-a-uuid');
}

async function proveValidLegacyValueConverts(client: PoolClient, migrations: string[]) {
  await prepareSupabaseShims(client);
  await applyBaseline(client, migrations);
  await seedCaptureActors(client);
  await createLegacyCaptureTable(client);
  await client.query(
    `insert into public.capture_link_tokens (
       token, type, pot_id, payload, expires_at, created_by
     ) values ('legacy-valid-proof', 'pay', $1, '{}'::jsonb, now() + interval '1 hour', $2)`,
    [captureIds.pot, captureIds.owner],
  );
  await queryFile(client, captureRepairMigration);

  const converted = await client.query<{ pot_id: string; token: string }>(
    `select pot_id::text, token
     from public.capture_link_tokens
     where token = 'legacy-valid-proof'`,
  );
  assert.equal(converted.rows[0]?.pot_id, captureIds.pot);
  assert.equal(converted.rows[0]?.token, 'legacy-valid-proof');

  const typeResult = await client.query<{ udt_name: string }>(`
    select udt_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'capture_link_tokens'
      and column_name = 'pot_id'
  `);
  assert.equal(typeResult.rows[0]?.udt_name, 'uuid');
}

async function asAuthenticated<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  await client.query('begin');
  try {
    await client.query('set local role authenticated');
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await client.query<T>(sql, params);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function asAnon<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  sql: string,
): Promise<QueryResult<T>> {
  await client.query('begin');
  try {
    await client.query('set local role anon');
    const result = await client.query<T>(sql);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function expectRejected(operation: () => Promise<unknown>, pattern: RegExp) {
  let message = '';
  try {
    await operation();
  } catch (error) {
    message = errorChain(error);
  }
  assert.match(message, pattern);
}

async function proveCaptureRls(client: PoolClient) {
  await seedCaptureActors(client);

  const ownerInsert = await asAuthenticated<{ created_by: string }>(
    client,
    captureIds.owner,
    `insert into public.capture_link_tokens (token, type, pot_id, payload, expires_at)
     values ('owner-token', 'pay', $1, '{}'::jsonb, now() + interval '1 hour')
     returning created_by::text`,
    [captureIds.pot],
  );
  assert.equal(ownerInsert.rows[0]?.created_by, captureIds.owner);

  const activeInsert = await asAuthenticated<{ created_by: string }>(
    client,
    captureIds.active,
    `insert into public.capture_link_tokens (token, type, pot_id, payload, expires_at)
     values ('active-token', 'spend', $1, '{}'::jsonb, now() + interval '1 hour')
     returning created_by::text`,
    [captureIds.pot],
  );
  assert.equal(activeInsert.rows[0]?.created_by, captureIds.active);

  for (const userId of [captureIds.pending, captureIds.removed, captureIds.unrelated]) {
    await expectRejected(
      () =>
        asAuthenticated(
          client,
          userId,
          `insert into public.capture_link_tokens (token, type, pot_id, payload, expires_at)
           values ($1, 'pay', $2, '{}'::jsonb, now() + interval '1 hour')`,
          [`rejected-${userId}`, captureIds.pot],
        ),
      /row-level security policy/i,
    );
  }

  const ownerRows = await asAuthenticated<{ count: string }>(
    client,
    captureIds.owner,
    'select count(*)::text as count from public.capture_link_tokens where pot_id = $1',
    [captureIds.pot],
  );
  assert.equal(ownerRows.rows[0]?.count, '2');

  const activeRows = await asAuthenticated<{ count: string }>(
    client,
    captureIds.active,
    'select count(*)::text as count from public.capture_link_tokens where pot_id = $1',
    [captureIds.pot],
  );
  assert.equal(activeRows.rows[0]?.count, '2');

  for (const userId of [captureIds.pending, captureIds.removed, captureIds.unrelated]) {
    const hiddenRows = await asAuthenticated<{ count: string }>(
      client,
      userId,
      'select count(*)::text as count from public.capture_link_tokens',
    );
    assert.equal(hiddenRows.rows[0]?.count, '0');
  }

  await expectRejected(
    () => asAnon(client, 'select count(*) from public.capture_link_tokens'),
    /permission denied/i,
  );
  await expectRejected(
    () =>
      asAnon(
        client,
        `insert into public.capture_link_tokens (token, type, pot_id, payload, expires_at)
         values ('anon-token', 'pay', '${captureIds.pot}', '{}'::jsonb, now() + interval '1 hour')`,
      ),
    /permission denied/i,
  );

  const activeConsume = await asAuthenticated(
    client,
    captureIds.active,
    `update public.capture_link_tokens
     set consumed_at = now()
     where token = 'owner-token'
     returning token`,
  );
  assert.equal(activeConsume.rowCount, 1);

  for (const userId of [captureIds.pending, captureIds.removed, captureIds.unrelated]) {
    const rejectedConsume = await asAuthenticated(
      client,
      userId,
      `update public.capture_link_tokens
       set consumed_at = now()
       where token = 'active-token'
       returning token`,
    );
    assert.equal(rejectedConsume.rowCount, 0);
  }

  await expectRejected(
    () =>
      asAuthenticated(
        client,
        captureIds.active,
        `update public.capture_link_tokens
         set payload = '{"tampered":true}'::jsonb
         where token = 'active-token'`,
      ),
    /permission denied/i,
  );
}

async function run() {
  const client = await pool.connect();
  try {
    const migrations = await listMigrations();
    assert.ok(migrations.includes(captureSourceMigration));
    assert.ok(migrations.includes(captureRepairMigration));

    await proveMalformedLegacyValueFails(client, migrations);
    await proveValidLegacyValueConverts(client, migrations);

    await prepareSupabaseShims(client);
    await applyBaseline(client, migrations);
    await seedLegacySettlement(client);

    const remainingMigrations = migrations.filter((filename) => filename > baselineCutoff);
    for (const migration of remainingMigrations) {
      await queryFile(client, migration);
    }

    const legacyResult = await client.query<{ status: string }>(
      'select status from public.settlements where id = $1',
      [legacyIds.settlement],
    );
    assert.equal(legacyResult.rows[0]?.status, 'broadcast');

    const constraintResult = await client.query<{ definition: string }>(`
      select pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid = 'public.settlements'::regclass
        and conname = 'settlements_status_check'
    `);
    const constraintDefinition = constraintResult.rows[0]?.definition ?? '';
    for (const status of ['pending', 'paid', 'confirmed', 'broadcast', 'finalised']) {
      assert.match(constraintDefinition, new RegExp(`'${status}'`));
    }

    const captureType = await client.query<{ udt_name: string }>(`
      select udt_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'capture_link_tokens'
        and column_name = 'pot_id'
    `);
    assert.equal(captureType.rows[0]?.udt_name, 'uuid');

    const captureForeignKey = await client.query<{ definition: string }>(`
      select pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid = 'public.capture_link_tokens'::regclass
        and conname = 'capture_link_tokens_pot_id_fkey'
    `);
    assert.match(
      captureForeignKey.rows[0]?.definition ?? '',
      /foreign key \(pot_id\) references pots\(id\) on delete cascade/i,
    );

    const policies = await client.query<{ qual: string | null; with_check: string | null }>(`
      select qual, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = 'capture_link_tokens'
    `);
    const policyExpressions = policies.rows
      .flatMap((policy) => [policy.qual, policy.with_check])
      .filter((expression): expression is string => Boolean(expression))
      .join('\n');
    assert.doesNotMatch(policyExpressions, /pots\.members|jsonb_array_elements/i);
    assert.doesNotMatch(policyExpressions, /^true$/im);
    assert.match(policyExpressions, /can_access_pot/i);

    await proveCaptureRls(client);

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          database: databaseName,
          appliedMigrations: migrations,
          checks: {
            cleanMigrationChainPassed: true,
            validLegacyCaptureRowPreserved: true,
            malformedLegacyCaptureRowFailedWithoutDeletion: true,
            capturePotIdUsesUuidForeignKey: true,
            creatorAndActiveMemberAccessPassed: true,
            pendingRemovedUnrelatedAndAnonDenied: true,
            unrelatedTokenEnumerationBlocked: true,
            tokenPayloadMutationBlocked: true,
            canonicalRuntimeStatesAcceptedByConstraint: true,
            legacySettlementStatusPreservedWithoutRewrite: true,
          },
        },
        null,
        2,
      ),
    );
  } finally {
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
