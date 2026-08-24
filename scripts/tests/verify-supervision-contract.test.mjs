import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateRepository } from '../verify-supervision-contract.mjs';

const fixtureRoot = path.resolve(new URL('../..', import.meta.url).pathname);

function cloneFixture() {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-supervision-'));
  fs.cpSync(fixtureRoot, destination, {
    recursive: true,
    filter(source) {
      return (
        !source.includes(`${path.sep}.git${path.sep}`) &&
        !source.includes(`${path.sep}node_modules${path.sep}`)
      );
    },
  });
  return destination;
}

function mutateContract(root, mutate) {
  const contractPath = path.join(root, 'governance/supervision-contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  mutate(contract);
  fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`);
}

test('accepts a structurally valid supervision contract', () => {
  const result = validateRepository({ root: fixtureRoot });
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rejects duplicate invariant identifiers', () => {
  const root = cloneFixture();
  mutateContract(root, (contract) => {
    contract.invariants.push(structuredClone(contract.invariants[0]));
  });
  const result = validateRepository({ root });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('duplicate invariant ID')));
});

test('rejects an automated state without an executable check', () => {
  const root = cloneFixture();
  mutateContract(root, (contract) => {
    contract.invariants[0].automatedChecks = [];
  });
  const result = validateRepository({ root });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('requires at least one automated check')));
});

test('rejects candidate verification without exact-candidate evidence', () => {
  const root = cloneFixture();
  mutateContract(root, (contract) => {
    contract.invariants[0].state = 'VERIFIED_CANDIDATE';
  });
  const result = validateRepository({ root });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('requires valid exact-candidate evidence')));
});

test('release enforcement fails below the declared public-beta threshold', () => {
  const result = validateRepository({ root: fixtureRoot, enforceRelease: true });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('public beta requires VERIFIED_REAL_HOST')));
});

test('accepts a valid exact-candidate evidence packet', () => {
  const root = cloneFixture();
  const evidencePath = 'artifacts/release/exact-candidate.json';
  fs.writeFileSync(
    path.join(root, evidencePath),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        invariantId: 'SETTLEMENT-INV-001',
        level: 'exact-candidate',
        result: 'pass',
        recordedAt: '2026-08-23T12:00:00Z',
        candidate: {
          commit: 'a'.repeat(40),
          clean: true,
          buildProfile: 'dot-host',
          lockfiles: { 'package-lock.json': 'sha256:fixture' },
        },
        checks: [{ command: 'npm run proof:full-loop', result: 'pass' }],
      },
      null,
      2,
    )}\n`,
  );
  mutateContract(root, (contract) => {
    contract.invariants[0].state = 'VERIFIED_CANDIDATE';
    contract.invariants[0].evidence = [{ level: 'exact-candidate', path: evidencePath }];
  });
  const result = validateRepository({ root });
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rejects dirty or weak exact-candidate evidence', () => {
  const root = cloneFixture();
  const evidencePath = 'artifacts/release/exact-candidate.json';
  fs.writeFileSync(
    path.join(root, evidencePath),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        invariantId: 'SETTLEMENT-INV-001',
        level: 'exact-candidate',
        result: 'pass',
        recordedAt: '2026-08-23T12:00:00Z',
        candidate: {
          commit: 'a'.repeat(40),
          clean: false,
          buildProfile: '',
          lockfiles: {},
        },
        checks: [],
      },
      null,
      2,
    )}\n`,
  );
  mutateContract(root, (contract) => {
    contract.invariants[0].state = 'VERIFIED_CANDIDATE';
    contract.invariants[0].evidence = [{ level: 'exact-candidate', path: evidencePath }];
  });
  const result = validateRepository({ root });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('candidate.clean must be true')));
  assert(result.errors.some((error) => error.includes('requires valid exact-candidate evidence')));
});

test('rejects active Supabase dependencies and runtime references', () => {
  const root = cloneFixture();
  const packagePath = path.join(root, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.dependencies['@supabase/supabase-js'] = '2.0.0';
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'src', 'provider.ts'), "const key = 'VITE_SUPABASE_URL';\n");
  const result = validateRepository({ root });
  assert.equal(result.ok, false);
  assert(
    result.errors.some((error) => error.includes('blocked package @supabase/supabase-js')),
  );
  assert(result.errors.some((error) => error.includes('VITE_SUPABASE_')));
});
