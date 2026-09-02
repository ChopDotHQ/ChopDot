import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildSteeringCatalog,
  globToRegExp,
  loadSteeringRegistry,
  observeExternalDiscovery,
  observeExternalSurfaces,
  renderSteeringHealth,
  runSteeringMonitor,
  validateSteeringRegistry,
} from '../steering-surfaces.mjs';

const AS_OF = new Date('2026-08-28T12:00:00.000Z');
const REGISTRY_PATH = 'governance/agent-system/steering-surface-registry.v1.json';
const CATALOG_PATH = 'governance/agent-system/steering-surface-catalog.v1.json';
const HEALTH_PATH = 'docs/agent-system/STEERING_SURFACE_HEALTH.md';
const FRAMEWORK_PATH = 'governance/agent-system/frameworks/evidence-bound-definition-loop.v1.json';
const PROFILE_PATH = 'governance/agent-system/profiles/experience-definition.v1.json';
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const OUTCOME = {
  statement: 'The declared steering surface produces a bounded and objectively verifiable result.',
  evidence: ['deterministic fixture evidence'],
  failure: 'The monitor reports an exact blocking or degraded state.',
  retry_exit: 'Repair the declared source and rerun the same hostile test.',
};

const AUTHORITY = {
  may_influence: ['bounded test behavior'],
  must_not_decide: ['product law', 'human approval'],
};

function write(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function trackedPaths(root, ...pathspecs) {
  const value = execFileSync('git', ['ls-files', '-z', '--', ...pathspecs], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return value.split('\0').filter(Boolean).sort();
}

function group(overrides) {
  return {
    id: 'controlled-guidance',
    surface_kind: 'method',
    control_kind: 'profile',
    domain: 'test',
    influence_class: 'operating_method',
    lifecycle: 'active',
    activation_mode: 'routed',
    accountable_owner: 'test owner',
    patterns: ['controlled/*.md'],
    allow_empty: false,
    authority: structuredClone(AUTHORITY),
    expected_outcome: structuredClone(OUTCOME),
    ...overrides,
  };
}

function externalSurface(overrides = {}) {
  return {
    id: 'optional-external-method',
    surface_kind: 'instruction_loader',
    control_kind: 'profile',
    domain: 'test',
    influence_class: 'supporting_technique',
    lifecycle: 'active',
    activation_mode: 'routed',
    accountable_owner: 'test owner',
    patterns: ['SKILL.md'],
    allow_empty: false,
    authority: structuredClone(AUTHORITY),
    expected_outcome: structuredClone(OUTCOME),
    presence_policy: 'optional',
    locator: { base: 'canonical_repo_root', path: '.external/method.md' },
    trusted_sha256: null,
    ...overrides,
  };
}

function externalDiscovery(overrides = {}) {
  return {
    id: 'canonical-project-skill-census',
    lifecycle: 'active',
    activation_mode: 'automatic',
    accountable_owner: 'test owner',
    presence_policy: 'optional',
    locator: { base: 'canonical_repo_root', path: '.agents/skills' },
    patterns: ['*/SKILL.md'],
    authority: structuredClone(AUTHORITY),
    expected_outcome: structuredClone(OUTCOME),
    ...overrides,
  };
}

function baseRegistry() {
  const registry = {
    schema: 'chopdot.steering-surface-registry.v1',
    registry_id: 'chopdot-steering-surfaces',
    version: '1.0.0',
    status: 'active',
    accountable_owner: 'test owner',
    reviewed_on: '2026-08-28',
    review_interval_days: 30,
    authority: 'Inventory and lifecycle monitoring only; never product law, priority, or approval.',
    discovery_roots: ['controlled/', 'governance/agent-system/'],
    generated_outputs: {
      catalog: CATALOG_PATH,
      health_report: HEALTH_PATH,
    },
    surface_groups: [
      group({
        id: 'definition-frameworks',
        control_kind: 'framework',
        patterns: ['governance/agent-system/frameworks/**'],
      }),
      group({
        id: 'definition-profiles',
        patterns: ['governance/agent-system/profiles/**'],
      }),
      group({
        id: 'governance-foundation',
        control_kind: 'gate',
        patterns: [
          REGISTRY_PATH,
          'governance/agent-system/contracts/**',
        ],
      }),
      group(),
    ],
    external_discovery: [externalDiscovery()],
    external_surfaces: [],
    runtime_classes: [],
  };
  registry.lifecycle_reviews = [...registry.surface_groups, ...registry.external_discovery].map((entry) => ({
    surface_id: entry.id,
    lifecycle: entry.lifecycle,
    reviewed_on: '2026-08-28',
    review_interval_days: 30,
    reason: 'Reviewed for current bounded use under the declared authority and expected outcome.',
    replacement: null,
  }));
  return registry;
}

function addExternalSurface(registry, surface) {
  registry.external_surfaces.push(surface);
  registry.lifecycle_reviews.push({
    surface_id: surface.id,
    lifecycle: surface.lifecycle,
    reviewed_on: '2026-08-28',
    review_interval_days: 30,
    reason: 'Reviewed for current bounded use under the declared authority and expected outcome.',
    replacement: ['quarantined', 'superseded', 'deprecated', 'retired'].includes(surface.lifecycle)
      ? 'Reviewed compatible successor or repaired same surface'
      : null,
  });
  return surface;
}

function addExternalDiscovery(registry, discovery) {
  registry.external_discovery.push(discovery);
  registry.lifecycle_reviews.push({
    surface_id: discovery.id,
    lifecycle: discovery.lifecycle,
    reviewed_on: '2026-08-28',
    review_interval_days: 30,
    reason: 'Reviewed for current bounded use under the declared authority and expected outcome.',
    replacement: null,
  });
  return discovery;
}

function framework() {
  return {
    schema: 'chopdot.definition-framework.v1',
    framework_id: 'evidence-bound-definition-loop',
    version: '1.0.0',
    portable: true,
    purpose: 'Define a bounded decision and prove whether its declared outcome was achieved.',
    required_contract: [
      'decision_target',
      'authoritative_inputs',
      'expected_outcome',
      'evaluation_criteria',
      'proving_evidence',
      'failure_or_blocker',
      'owner_and_authority',
      'retry_and_exit',
    ],
    stages: ['bound', 'define', 'execute', 'evaluate', 'exit'],
  };
}

function profile() {
  return {
    schema: 'chopdot.definition-profile.v1',
    profile_id: 'experience-definition',
    version: '1.0.0',
    framework_ref: '../frameworks/evidence-bound-definition-loop.v1.json',
    required_outputs: ['experience model', 'navigation model', 'evidence packet'],
    evaluation_criteria: ['requirements are explicit', 'evidence maps to requirements'],
    expected_outcome: 'A testable experience definition whose product choices come from current authority.',
    forbidden_inferences: [
      'Do not invent product hierarchy.',
      'Do not promote a technique into product law.',
      'Do not claim live proof from fixture evidence.',
    ],
  };
}

function makeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-steering-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  write(root, REGISTRY_PATH, baseRegistry());
  write(root, 'governance/agent-system/contracts/definition-framework.v1.schema.json', {});
  write(root, 'governance/agent-system/contracts/definition-profile.v1.schema.json', {});
  write(root, FRAMEWORK_PATH, framework());
  write(root, PROFILE_PATH, profile());
  write(root, 'controlled/guide.md', '# Bounded guidance\n');
  fs.mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
  git(root, 'add', '.');
  execFileSync('git', [
    '-c', 'user.name=Steering Test',
    '-c', 'user.email=steering-test@example.invalid',
    'commit', '-qm', 'fixture',
  ], { cwd: root, stdio: 'ignore' });
  return root;
}

function syncGenerated(root, registry = baseRegistry()) {
  const catalog = buildSteeringCatalog(root, registry);
  write(root, registry.generated_outputs.catalog, catalog);
  write(root, registry.generated_outputs.health_report, renderSteeringHealth(catalog));
}

function monitor(root, registry = baseRegistry(), options = {}) {
  return runSteeringMonitor(root, { registry, now: AS_OF, ...options });
}

test('rejects duplicate stable IDs across steering surface classes', () => {
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface({ id: registry.surface_groups[0].id }));

  const result = validateSteeringRegistry(registry);

  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('duplicate steering surface ID: definition-frameworks'));
});

test('standalone validation invokes the registry schema for missing, invalid, and unknown fields', () => {
  const missingStatus = baseRegistry();
  delete missingStatus.status;
  const invalidStatus = baseRegistry();
  invalidStatus.status = 'automatic';
  const unknownField = baseRegistry();
  unknownField.status_typo = 'active';
  const unknownGroupField = baseRegistry();
  unknownGroupField.surface_groups[0].activation_typo = 'automatic';

  assert.ok(validateSteeringRegistry(missingStatus).issues.some((entry) => entry.includes('registry schema /status: Required property is missing')));
  assert.ok(validateSteeringRegistry(invalidStatus).issues.some((entry) => entry.includes('registry schema /status: Expected one of')));
  assert.ok(validateSteeringRegistry(unknownField).issues.some((entry) => entry.includes('registry schema /status_typo: Unknown property is not allowed')));
  assert.ok(validateSteeringRegistry(unknownGroupField).issues.some((entry) => entry.includes('/surface_groups/0/activation_typo: Unknown property is not allowed')));
});

test('reports an unregistered file under a controlled discovery root', (t) => {
  const root = makeFixture(t);
  write(root, 'controlled/unregistered.txt', 'looks authoritative\n');

  const catalog = buildSteeringCatalog(root, baseRegistry());

  assert.equal(catalog.validation.valid, false);
  assert.ok(catalog.validation.issues.includes('unregistered steering surface under a controlled root: controlled/unregistered.txt'));
});

test('a newly introduced provider instruction surface cannot escape monitoring', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  registry.discovery_roots.push('.claude/', '.cursor/');

  // A committed provider entrypoint nobody declared is the case that must not pass:
  // it changes agent behaviour automatically and is claimed by no surface group.
  for (const [relative, body] of [
    ['.claude/settings.json', '{"hooks":{"SessionStart":[{"command":"anything"}]}}\n'],
    ['.cursor/rules/undeclared.mdc', 'Always do the undeclared thing.\n'],
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), body);
  }

  const catalog = buildSteeringCatalog(root, registry);

  assert.equal(catalog.validation.valid, false);
  for (const relative of ['.claude/settings.json', '.cursor/rules/undeclared.mdc']) {
    assert.ok(
      catalog.validation.issues.includes(`unregistered steering surface under a controlled root: ${relative}`),
      `${relative} escaped monitoring; issues were ${JSON.stringify(catalog.validation.issues)}`,
    );
  }
});

test('production registry declares the provider entry roots', () => {
  const registry = loadSteeringRegistry(REPOSITORY_ROOT);
  for (const root of ['.agents/', '.claude/', '.cursor/']) {
    assert.ok(
      registry.discovery_roots.includes(root),
      `${root} must be a discovery root or a committed provider instruction surface escapes monitoring`,
    );
  }
});

test('blocks when a pinned steering surface changes without the registry acknowledging it', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  const group = registry.surface_groups.find((entry) => entry.patterns.includes('controlled/*.md'));
  assert.ok(group, 'fixture must declare a controlled group to pin');

  // Pin the group at its current content, then drift the source underneath it.
  group.trusted_manifest_sha256 = buildSteeringCatalog(root, registry)
    .groups.find((entry) => entry.id === group.id).manifest_sha256;
  fs.appendFileSync(path.join(root, 'controlled/guide.md'), 'Changed steering instruction.\n');

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.ok(
    result.drifts.some((entry) => entry.startsWith(`${group.id}: steering surface content changed`)),
    `expected a content-change drift for ${group.id}, got ${JSON.stringify(result.drifts)}`,
  );
});

test('an unpinned group tolerates source change without blocking', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  for (const group of registry.surface_groups) delete group.trusted_manifest_sha256;
  fs.appendFileSync(path.join(root, 'controlled/guide.md'), 'Ordinary documentation edit.\n');

  const result = monitor(root, registry);

  assert.equal(result.drifts.some((entry) => entry.includes('steering surface content changed')), false);
});

test('rejects a repository steering surface implemented as a symlink', (t) => {
  const root = makeFixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-steering-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, 'target.md', '# outside\n');
  fs.symlinkSync(path.join(outside, 'target.md'), path.join(root, 'controlled/link.md'));

  const catalog = buildSteeringCatalog(root, baseRegistry());

  assert.equal(catalog.validation.valid, false);
  assert.ok(catalog.validation.issues.includes('repository steering surface is a symlink: controlled/link.md'));
});

test('blocks an external symlink that resolves outside its approved logical root', (t) => {
  const root = makeFixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-external-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  write(outside, 'method.md', '# outside\n');
  fs.mkdirSync(path.join(root, '.external'), { recursive: true });
  fs.symlinkSync(path.join(outside, 'method.md'), path.join(root, '.external/method.md'));
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface());

  const result = observeExternalSurfaces(root, registry, {});

  assert.equal(result.observations[0].contained_in_logical_root, false);
  assert.equal(result.observations[0].regular_file, false);
  assert.equal(result.observations[0].state, 'blocked');
  assert.equal(result.drifts.length, 1);
});

test('blocks an undeclared canonical project skill entrypoint discovered outside Git', (t) => {
  const root = makeFixture(t);
  write(root, '.agents/skills/undeclared/SKILL.md', '# Undeclared project skill\n');
  syncGenerated(root);

  const result = monitor(root);

  assert.equal(result.verdict, 'blocked');
  assert.ok(result.drifts.includes('canonical-project-skill-census: undeclared external steering surface: .agents/skills/undeclared/SKILL.md'));
  assert.deepEqual(result.external_discovery[0].undeclared_paths, ['.agents/skills/undeclared/SKILL.md']);
});

test('blocks undeclared AutoBots ChopDot agents through a configurable external census', (t) => {
  const root = makeFixture(t);
  const autobotsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-autobots-census-'));
  t.after(() => fs.rmSync(autobotsRoot, { recursive: true, force: true }));
  write(autobotsRoot, 'agentops/registry/agents/chopdot-new-agent.json', '{}\n');
  const registry = baseRegistry();
  addExternalDiscovery(registry, externalDiscovery({
    id: 'autobots-chopdot-agent-census',
    locator: { base: 'autobots_root', path: 'agentops/registry/agents' },
    patterns: ['chopdot*.json'],
  }));
  syncGenerated(root, registry);

  const result = monitor(root, registry, { env: { AUTOBOTS_ROOT: autobotsRoot } });

  assert.equal(result.verdict, 'blocked');
  assert.ok(result.drifts.includes('autobots-chopdot-agent-census: undeclared external steering surface: agentops/registry/agents/chopdot-new-agent.json'));
});

test('generic external discovery detects undeclared Claude skills and Cursor rules', (t) => {
  const root = makeFixture(t);
  write(root, '.claude/skills/new-reviewer/SKILL.md', '# New Claude skill\n');
  write(root, '.cursor/rules/new-product-rule.mdc', 'alwaysApply: true\n');
  const registry = baseRegistry();
  addExternalDiscovery(registry, externalDiscovery({
    id: 'canonical-claude-skill-census',
    locator: { base: 'canonical_repo_root', path: '.claude/skills' },
  }));
  addExternalDiscovery(registry, externalDiscovery({
    id: 'canonical-cursor-rule-census',
    locator: { base: 'canonical_repo_root', path: '.cursor/rules' },
    patterns: ['*.mdc'],
  }));
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.ok(result.drifts.some((entry) => entry.endsWith('.claude/skills/new-reviewer/SKILL.md')));
  assert.ok(result.drifts.some((entry) => entry.endsWith('.cursor/rules/new-product-rule.mdc')));
});

test('degrades but does not block when an optional external surface is absent', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface());
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'degraded');
  assert.deepEqual(result.disabled_surface_ids, ['optional-external-method']);
  assert.equal(result.observations[0].state, 'unavailable');
  assert.deepEqual(result.drifts, []);
});

test('blocks when a required external surface is absent', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface({ presence_policy: 'required' }));
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.observations[0].state, 'blocked');
  assert.ok(result.drifts.includes('optional-external-method: required identity, containment, or digest check failed'));
});

test('blocks when a present external surface digest differs from its trusted digest', (t) => {
  const root = makeFixture(t);
  write(root, '.external/method.md', '# observed content\n');
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface({ trusted_sha256: sha256('different content') }));
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.observations[0].present, true);
  assert.equal(result.observations[0].digest_matches, false);
  assert.equal(result.observations[0].state, 'blocked');
});

test('blocks when supporting files inside a pinned skill package drift', (t) => {
  const root = makeFixture(t);
  const entry = '# Skill entrypoint\n';
  const support = '# Requirement-bound playbook\n';
  write(root, '.external/SKILL.md', entry);
  write(root, '.external/resources/playbook.md', support);
  const packageManifest = sha256(`SKILL.md\0${sha256(entry)}\nresources/playbook.md\0${sha256(support)}\n`);
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface({
    id: 'skill-pinned-package',
    locator: { base: 'canonical_repo_root', path: '.external/SKILL.md' },
    trusted_sha256: sha256(entry),
    trusted_package_manifest_sha256: packageManifest,
  }));
  syncGenerated(root, registry);
  write(root, '.external/resources/playbook.md', '# Drifted playbook\n');

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.equal(result.observations[0].observed_sha256, sha256(entry));
  assert.equal(result.observations[0].digest_matches, false);
  assert.equal(result.observations[0].state, 'blocked');
});

test('skill package manifests deterministically ignore only declared macOS and cache artifacts', (t) => {
  const root = makeFixture(t);
  const entry = '# Declared project skill\n';
  const support = '# Identity-bearing support\n';
  write(root, '.agents/skills/declared/SKILL.md', entry);
  write(root, '.agents/skills/declared/resources/playbook.md', support);
  write(root, '.agents/skills/declared/.DS_Store', 'incidental\n');
  write(root, '.agents/skills/declared/.cache/transient.txt', 'incidental\n');
  write(root, '.agents/skills/declared/__pycache__/compiled.pyc', 'incidental\n');
  const packageManifest = sha256(`SKILL.md\0${sha256(entry)}\nresources/playbook.md\0${sha256(support)}\n`);
  const registry = baseRegistry();
  addExternalSurface(registry, externalSurface({
    id: 'skill-declared-package',
    locator: { base: 'canonical_repo_root', path: '.agents/skills/declared/SKILL.md' },
    trusted_sha256: sha256(entry),
    trusted_package_manifest_sha256: packageManifest,
  }));
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'pass');
  assert.equal(result.observations[0].state, 'eligible');
  assert.equal(result.observations[0].package_file_count, 2);
  assert.deepEqual(result.external_package_manifest_policy.excluded_file_names, ['.DS_Store']);
});

test('rejects automatic activation for quarantined steering surfaces', () => {
  const registry = baseRegistry();
  registry.surface_groups[0].lifecycle = 'quarantined';
  registry.surface_groups[0].activation_mode = 'automatic';

  const result = validateSteeringRegistry(registry);

  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('definition-frameworks: quarantined surfaces must be disabled'));
});

test('rejects a generic framework that embeds a product answer', (t) => {
  const root = makeFixture(t);
  const value = framework();
  value.purpose = 'Make Scan a receipt the answer for every experience.';
  write(root, FRAMEWORK_PATH, value);

  const catalog = buildSteeringCatalog(root, baseRegistry());

  assert.equal(catalog.validation.valid, false);
  assert.ok(catalog.validation.issues.includes(`${FRAMEWORK_PATH}: generic framework embeds a domain or product answer`));
});

test('rejects a profile whose framework reference does not resolve', (t) => {
  const root = makeFixture(t);
  const value = profile();
  value.framework_ref = '../frameworks/missing.v1.json';
  write(root, PROFILE_PATH, value);

  const catalog = buildSteeringCatalog(root, baseRegistry());

  assert.equal(catalog.validation.valid, false);
  assert.ok(catalog.validation.issues.includes(`${PROFILE_PATH}: framework_ref does not resolve to a catalogued framework`));
});

test('rejects a profile that universalizes one action', (t) => {
  const root = makeFixture(t);
  const value = profile();
  value.required_outputs.push('Exactly one action on every first screen');
  write(root, PROFILE_PATH, value);

  const catalog = buildSteeringCatalog(root, baseRegistry());

  assert.equal(catalog.validation.valid, false);
  assert.ok(catalog.validation.issues.includes(`${PROFILE_PATH}: profile universalizes one action`));
});

test('passes only when generated catalog and health outputs equal deterministic regeneration', (t) => {
  const root = makeFixture(t);
  syncGenerated(root);

  const result = monitor(root);

  assert.equal(result.verdict, 'pass');
  assert.deepEqual(result.drifts, []);
  assert.equal(fs.readFileSync(path.join(root, CATALOG_PATH), 'utf8'), result._generated.catalog);
  assert.equal(fs.readFileSync(path.join(root, HEALTH_PATH), 'utf8'), result._generated.health);
});

test('degraded repository groups force a degraded verdict and expose their IDs', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  const group = registry.surface_groups.find((entry) => entry.id === 'controlled-guidance');
  group.lifecycle = 'degraded';
  const review = registry.lifecycle_reviews.find((entry) => entry.surface_id === group.id);
  review.lifecycle = 'degraded';
  review.review_interval_days = 14;
  review.reason = 'Retained with explicit limitations and prevented from producing an unqualified pass verdict.';
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'degraded');
  assert.ok(result.degraded_surface_ids.includes('controlled-guidance'));
  assert.match(result._generated.health, /Degraded repository groups: `controlled-guidance`/u);
});

test('blocks a stale per-surface lifecycle review', (t) => {
  const root = makeFixture(t);
  const registry = baseRegistry();
  const review = registry.lifecycle_reviews.find((entry) => entry.surface_id === 'controlled-guidance');
  review.reviewed_on = '2020-01-01';
  review.review_interval_days = 1;
  syncGenerated(root, registry);

  const result = monitor(root, registry);

  assert.equal(result.verdict, 'blocked');
  assert.ok(result.drifts.some((entry) => entry.startsWith('controlled-guidance: lifecycle review is stale; due ')));
});

test('exact-candidate mode blocks regenerated dirty tracked steering sources and binds a worktree aggregate', (t) => {
  const root = makeFixture(t);
  syncGenerated(root);
  git(root, 'add', CATALOG_PATH, HEALTH_PATH);
  execFileSync('git', [
    '-c', 'user.name=Steering Test',
    '-c', 'user.email=steering-test@example.invalid',
    'commit', '-qm', 'generated baseline',
  ], { cwd: root, stdio: 'ignore' });
  fs.appendFileSync(path.join(root, 'controlled/guide.md'), 'Dirty tracked steering change.\n');
  syncGenerated(root);

  const result = monitor(root, baseRegistry(), { requirePromoted: true });

  assert.equal(result.verdict, 'blocked');
  assert.deepEqual(result.worktree.unpromoted, []);
  assert.deepEqual(result.worktree.tracked_dirty, [HEALTH_PATH, 'controlled/guide.md', CATALOG_PATH].sort());
  assert.match(result.worktree.working_tree_manifest_sha256, /^[0-9a-f]{64}$/u);
  assert.ok(result.drifts.includes('3 tracked steering surfaces have uncommitted changes'));
});

test('surfaces untracked steering files as unpromoted and blocks when promotion is required', (t) => {
  const root = makeFixture(t);
  write(root, 'controlled/unpromoted.md', '# candidate steering method\n');
  syncGenerated(root);
  git(root, 'add', CATALOG_PATH, HEALTH_PATH);

  const result = monitor(root, baseRegistry(), { requirePromoted: true });

  assert.equal(result.verdict, 'blocked');
  assert.deepEqual(result.worktree.unpromoted, ['controlled/unpromoted.md']);
  assert.ok(result.drifts.includes('1 steering surfaces are untracked/unpromoted'));
});

test('requires generated catalog and health outputs to be promoted with their sources', (t) => {
  const root = makeFixture(t);
  syncGenerated(root);

  const result = monitor(root, baseRegistry(), { requirePromoted: true });

  assert.equal(result.verdict, 'blocked');
  assert.deepEqual(result.worktree.unpromoted, [HEALTH_PATH, CATALOG_PATH].sort());
  assert.ok(result.drifts.includes('2 steering surfaces are untracked/unpromoted'));
});

test('ignores an ordinary non-steering file outside controlled roots', (t) => {
  const root = makeFixture(t);
  syncGenerated(root);
  write(root, 'src/ordinary.js', 'export const ordinary = true;\n');

  const result = monitor(root);

  assert.equal(result.verdict, 'pass');
  assert.deepEqual(result.drifts, []);
  assert.equal(result.worktree.unpromoted.includes('src/ordinary.js'), false);
  assert.equal(result.worktree.changed.some((entry) => entry.path === 'src/ordinary.js'), false);
});

test('production registry controls agent instruction surfaces and ignores ordinary documentation', () => {
  const registry = loadSteeringRegistry(REPOSITORY_ROOT);
  const controls = (relative) => registry.surface_groups
    .some((entry) => entry.patterns.some((pattern) => globToRegExp(pattern).test(relative)));

  // Surfaces an agent obeys must be controlled.
  for (const relative of [
    'AGENTS.md',
    'CLAUDE.md',
    'PRODUCT_TRUTH.md',
    'governance/agent-system/instructions/chopdot-product-judgment.md',
    'governance/agent-system/instructions/chopdot-frontend-design.md',
    'governance/agent-system/policies/adoption-boundary.v1.json',
  ]) {
    assert.equal(controls(relative), true, `${relative} must be a controlled steering surface`);
  }

  // Ordinary documentation must not be, or every doc edit rebuilds a governance artifact.
  for (const relative of [
    'docs/CHOPDOT_LOOP_RUNNER.md',
    'docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json',
    'docs/superpowers/plans/2026-08-26-portable-agent-outcome-system.md',
    'plans/2026-07-14-dot-host-browser-polish.md',
    'proof/host-matrix.json',
    'product/cards.md',
  ]) {
    assert.equal(controls(relative), false, `${relative} must not be a controlled steering surface`);
  }
});

test('provider directories are ignored so machine-local content stays invisible', () => {
  // The provider roots are watched, so machine-local content must be gitignored or
  // every developer's own skills would block them. Tracked content there is the only
  // thing the monitor should ever see.
  const ignoreRules = fs.readFileSync(path.join(REPOSITORY_ROOT, '.gitignore'), 'utf8');
  for (const directory of ['.agents/', '.claude/', '.cursor/', '.local-private/']) {
    assert.match(
      ignoreRules,
      new RegExp(`^${directory.replace('.', '\\.')}$`, 'mu'),
      `${directory} must be gitignored; machine-local material is never required for normal repository operation`,
    );
  }
});

test('production registry inventories no machine-local or private material', () => {
  const registry = loadSteeringRegistry(REPOSITORY_ROOT);
  const serialized = JSON.stringify(registry);

  // Naming a provider directory as a discovery boundary is fine and necessary.
  // Enumerating what is inside one is not: a tracked, shareable governance source
  // must never publish filenames, directory structure, or digests from machine-local
  // or private context.
  assert.equal(serialized.includes('.local-private'), false, 'registry must not reference private context');
  for (const root of ['.claude/', '.cursor/', '.agents/']) {
    const inside = new RegExp(`${root.replace('.', '\\.')}[A-Za-z0-9._-]+`, 'gu');
    const hits = (serialized.match(inside) ?? []).filter((entry) => entry !== root);
    assert.deepEqual(hits, [], `registry must name ${root} only as a boundary, never enumerate inside it`);
  }
  assert.deepEqual(registry.external_surfaces, [], 'machine-local skill inventory must not be tracked');
  assert.deepEqual(registry.external_discovery, [], 'machine-local censuses must not be required');
});
