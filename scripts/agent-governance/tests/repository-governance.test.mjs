import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateProviderIndependence, validateRepository } from '../validate-repository.mjs';
import { buildSteeringCatalog } from '../steering-surfaces.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-governance-'));
  const copy = (relative) => {
    const source = path.join(repositoryRoot, relative);
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(source, target, { recursive: true });
  };
  copy('scripts/agent-governance/catalog');
  copy('governance/agent-system/contracts');
  copy('governance/agent-system/policies');
  copy('governance/agent-system/loops');
  copy('scripts/agent-system');
  copy('package.json');
  copy('.github/workflows/agent-governance.yml');
  copy('.githooks/pre-push');
  copy('governance/agent-system/steering-surface-registry.v1.json');
  // The catalog is derived, not committed: build it on demand rather than copying
  // a tracked artifact that no longer exists.
  const steeringCatalog = buildSteeringCatalog(repositoryRoot);
  for (const surface of steeringCatalog.repository_surfaces ?? []) {
    if (fs.existsSync(path.join(repositoryRoot, surface.path))) copy(surface.path);
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'scripts/agent-governance/catalog/invariants.v1.json')));
  for (const invariant of catalog.invariants) {
    const file = path.join(root, invariant.source);
    const source = path.join(repositoryRoot, invariant.source);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(source)) fs.copyFileSync(source, file);
    else fs.writeFileSync(file, '# fixture\n');
  }
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('accepted catalog validates all 15 current-source invariants', () => {
  const result = validateRepository(fixtureRoot());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.summary.invariant_count, 15);
  assert.equal(result.summary.evidence_level_count, 9);
});

test('duplicate and missing invariant evidence fail closed', () => {
  const root = fixtureRoot();
  const file = path.join(root, 'scripts/agent-governance/catalog/invariants.v1.json');
  const catalog = JSON.parse(fs.readFileSync(file));
  catalog.invariants[1].id = catalog.invariants[0].id;
  catalog.invariants[2].minimum_evidence = 'invented-green';
  catalog.invariants[3].source_anchor = 'stale text that is not in the current source';
  fs.writeFileSync(file, `${JSON.stringify(catalog)}\n`);
  const result = validateRepository(root);
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Duplicate invariant ID')));
  assert(result.errors.some((error) => error.includes('unknown evidence level invented-green')));
  assert(result.errors.some((error) => error.includes('source anchor is missing or stale')));
  assert(result.errors.some((error) => error.includes('Missing invariant ID')));
});

test('provider independence is policy-driven and rejects active runtime coupling', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-provider-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/provider.ts'), "export const key = 'VITE_SUPABASE_URL';\n");
  const policy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'scripts/agent-governance/catalog/provider-policy.v1.json')));
  const result = validateProviderIndependence(root, policy, { dependencies: { '@supabase/supabase-js': '2.0.0' } });
  assert(result.errors.some((error) => error.includes('blocked package @supabase/supabase-js')));
  assert(result.errors.some((error) => error.includes('VITE_SUPABASE_')));
});

test('provider scan normalizes case, import aliases, dynamic strings, and dependency aliases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-provider-hostile-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/provider.ts'), [
    "import { createClient as makeDatabase } from '@SuPaBase/Supabase-JS';",
    "const dynamicProvider = '@supa' + 'base/supabase-js';",
    "const dynamicEnvironment = 'VITE_' + 'SUPABASE_URL';",
  ].join('\n'));
  const policy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'scripts/agent-governance/catalog/provider-policy.v1.json')));
  const result = validateProviderIndependence(root, policy, {
    dependencies: { '@SUPABASE/SUPABASE-JS': '2.0.0' },
    devDependencies: { 'innocent-alias': 'npm:@SuPaBase/supabase-js@2.0.0' },
  });
  assert(result.errors.some((error) => error.includes('appears in dependencies')));
  assert(result.errors.some((error) => error.includes('appears in devDependencies as innocent-alias')));
  assert(result.errors.some((error) => error.includes('@supabase/')));
  assert(result.errors.some((error) => error.includes('VITE_SUPABASE_')));
});

test('wrong exact candidate identity is non-green', () => {
  const result = validateRepository(repositoryRoot, { expectedSha: '0'.repeat(40) });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Wrong candidate identity')));
});
