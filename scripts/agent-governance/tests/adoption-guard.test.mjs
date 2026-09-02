import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createContract } from '../../agent-system/contract.mjs';
import { recordArtifact } from '../../agent-system/artifacts.mjs';
import { recordEvaluation } from '../../agent-system/evaluator.mjs';
import { appendEvent, rebuildSnapshot, terminate } from '../../agent-system/ledger.mjs';
import { buildOutcomePacket } from '../../agent-system/outcome.mjs';
import { generateRunnerProvenance } from '../../agent-system/provenance.mjs';
import { startRun } from '../../agent-system/runner.mjs';
import { fixturePreflightIdentity, recordPassingMeasurementEvidence } from '../../agent-system/tests/helpers.mjs';
import { digestObject, sha256File } from '../lib.mjs';
import { buildGithubExecutionAttestation } from '../execution-attestation.mjs';
import { REGISTRY_PATH, buildSteeringCatalog, runSteeringMonitor } from '../steering-surfaces.mjs';
import {
  adoptionPolicyFailures, buildContextReceipt, classifyChangedPaths,
  buildPushPreflight, evaluateLocalSteering, hookHealth, parsePrePushUpdates, replayAcceptanceReceipt,
  validateAcceptance as rawValidateAcceptance,
} from '../adoption-guard.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtureKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const fixtureJwk = { ...fixtureKeys.publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
const fixtureAttestations = new Map();
const STEERING_NOW = new Date('2026-08-28T13:00:00.000Z');
const STEERING_REGISTRY_PATH = 'governance/agent-system/steering-surface-registry.v1.json';
const STEERING_CATALOG_PATH = 'governance/agent-system/steering-surface-catalog.v1.json';
const STEERING_HEALTH_PATH = 'docs/agent-system/STEERING_SURFACE_HEALTH.md';
const ZERO_OID_FOR_TEST = '0'.repeat(40);

function validateAcceptance(options) {
  return rawValidateAcceptance({ ...(fixtureAttestations.get(fs.realpathSync(options.root)) ?? {}), ...options });
}

function signedFixtureToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'RS256', kid: fixtureJwk.kid, typ: 'JWT' });
  const payload = encode(claims);
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), fixtureKeys.privateKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

function run(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function fixtureSteeringRegistry(lifecycle = 'degraded') {
  const authority = {
    may_influence: ['fixture routing evidence'],
    must_not_decide: ['product law', 'acceptance without evidence'],
  };
  const expectedOutcome = {
    statement: 'The fixture exposes steering integrity and degraded state without deciding route relevance.',
    evidence: ['standalone monitor receipt'],
    failure: 'Block the fixture receipt when generated identity drifts.',
    retry_exit: 'Regenerate fixture outputs and rerun the same context test.',
  };
  return {
    schema: 'chopdot.steering-surface-registry.v1',
    registry_id: 'chopdot-steering-surfaces',
    version: '1.0.0',
    status: 'active',
    authority: 'Fixture inventory and monitoring only; never product law, priority, route relevance, or approval.',
    accountable_owner: 'fixture owner',
    reviewed_on: '2026-08-28',
    review_interval_days: 30,
    discovery_roots: ['product/', 'scripts/agent-governance/'],
    surface_groups: [{
      id: 'fixture-steering',
      surface_kind: 'validator',
      control_kind: 'gate',
      domain: 'agent_governance',
      influence_class: 'operating_method',
      lifecycle,
      activation_mode: 'routed',
      accountable_owner: 'fixture owner',
      patterns: ['governance/agent-system/**', 'product/**', 'scripts/agent-governance/**'],
      allow_empty: false,
      authority,
      expected_outcome: expectedOutcome,
    }],
    external_discovery: [{
      id: 'fixture-external-census',
      lifecycle: 'active',
      activation_mode: 'automatic',
      accountable_owner: 'fixture owner',
      presence_policy: 'optional',
      locator: { base: 'exact_worktree_root', path: '.fixture-skills' },
      patterns: ['*/SKILL.md'],
      authority,
      expected_outcome: expectedOutcome,
    }],
    external_surfaces: [],
    runtime_classes: [],
    lifecycle_reviews: [
      {
        surface_id: 'fixture-steering', lifecycle, reviewed_on: '2026-08-28', review_interval_days: 30,
        reason: lifecycle === 'degraded'
          ? 'Deliberately degraded to prove structured receipt limitations without failing unrelated work.'
          : 'Active fixture steering proves the strict local preflight pass path.', replacement: null,
      },
      {
        surface_id: 'fixture-external-census', lifecycle: 'active', reviewed_on: '2026-08-28', review_interval_days: 30,
        reason: 'Optional external discovery remains observable in the standalone fixture monitor.', replacement: null,
      },
    ],
    generated_outputs: { catalog: STEERING_CATALOG_PATH, health_report: STEERING_HEALTH_PATH },
  };
}

function syncFixtureSteeringOutputs(root) {
  const initial = runSteeringMonitor(root, { now: STEERING_NOW });
  for (const [relative, content] of [
    [STEERING_CATALOG_PATH, initial._generated.catalog],
    [STEERING_HEALTH_PATH, initial._generated.health],
  ]) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  const result = runSteeringMonitor(root, { now: STEERING_NOW });
  assert.notEqual(result.verdict, 'blocked', `fixture steering monitor failed: ${result.drifts.join('; ')}`);
  return result;
}

async function fixture(options = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-adoption-')));
  const candidatePath = options.candidatePath ?? 'tests/change.mjs';
  run(root, ['init', '-q', '-b', 'main']);
  run(root, ['config', 'user.email', 'fixture@example.invalid']);
  run(root, ['config', 'user.name', 'Fixture']);
  fs.mkdirSync(path.join(root, 'governance/agent-system/policies'), { recursive: true });
  fs.mkdirSync(path.join(root, 'governance/agent-system/contracts'), { recursive: true });
  fs.cpSync(
    path.join(repositoryRoot, 'governance/agent-system/loops'),
    path.join(root, 'governance/agent-system/loops'),
    { recursive: true },
  );
  fs.mkdirSync(path.join(root, 'product'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/release'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts/agent-governance'), { recursive: true });
  fs.mkdirSync(path.join(root, 'output'), { recursive: true });
  if (options.steeringLifecycle === 'active') {
    fs.mkdirSync(path.join(root, '.fixture-skills'), { recursive: true });
  }
  fs.copyFileSync(
    path.join(repositoryRoot, 'governance/agent-system/policies/adoption-boundary.v1.json'),
    path.join(root, 'governance/agent-system/policies/adoption-boundary.v1.json'),
  );
  fs.copyFileSync(
    path.join(repositoryRoot, 'governance/agent-system/project-authority.v1.json'),
    path.join(root, 'governance/agent-system/project-authority.v1.json'),
  );
  for (const schema of ['definition-framework.v1.schema.json', 'definition-profile.v1.schema.json']) {
    fs.copyFileSync(
      path.join(repositoryRoot, 'governance/agent-system/contracts', schema),
      path.join(root, 'governance/agent-system/contracts', schema),
    );
  }
  fs.writeFileSync(path.join(root, STEERING_REGISTRY_PATH), `${JSON.stringify(fixtureSteeringRegistry(options.steeringLifecycle), null, 2)}\n`);
  fs.writeFileSync(path.join(root, '.gitignore'), [
    'output/',
    'docs/release/current-release-state.json',
    STEERING_CATALOG_PATH,
    STEERING_HEALTH_PATH,
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'PRODUCT_TRUTH.md'), '# Product truth\nExact authority.\n');
  fs.writeFileSync(path.join(root, 'product/cards.md'), [
    '## P-001 - Fixture',
    '```yaml',
    'id: P-001',
    'status: building',
    'priority: 10',
    'operator_next_action: Prove the fixture',
    '```',
    '',
  ].join('\n'));
  const sourceDigest = sha256File(path.join(root, 'PRODUCT_TRUTH.md'));
  fs.writeFileSync(path.join(root, 'product/context-authority.json'), JSON.stringify({
    schema: 'chopdot.context-authority.v1', exact_root: root, branch: 'main',
    default_read_order: [{
      path: 'PRODUCT_TRUTH.md', status: 'active', last_reviewed: '2026-08-27',
      freshness_days: 30, sha256: sourceDigest,
    }],
  }));
  run(root, ['add', '.']);
  run(root, ['commit', '-qm', 'fixture base']);
  syncFixtureSteeringOutputs(root);
  run(root, ['add', '-f', STEERING_CATALOG_PATH, STEERING_HEALTH_PATH]);
  run(root, ['commit', '--amend', '--no-edit', '-q']);
  const baseHead = run(root, ['rev-parse', 'HEAD']);
  const baseTree = run(root, ['rev-parse', 'HEAD^{tree}']);
  const steering = syncFixtureSteeringOutputs(root);
  run(root, ['update-ref', 'refs/remotes/origin/trunk', baseHead]);
  run(root, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk']);
  let contract;
  let runDirectory;
  const startFixtureRun = async (startingHead, startingTree) => {
    contract = createContract({
      root, loopProfile: 'implementation', branch: 'main', startingHead,
      startingTree, sourcePath: 'PRODUCT_TRUTH.md', createdAt: '2026-08-27T12:00:00.000Z',
      runId: 'run_adoption_fixture_001', createdBy: 'fixture-agent', createdByKind: 'agent',
      inPaths: [path.posix.dirname(candidatePath)], allowedWrites: [path.posix.dirname(candidatePath)],
      deterministicCommands: [{
        id: 'CHECK-ADOPTION-FIXTURE', command: `${process.execPath} --check ${candidatePath}`,
        cwd: root, expected_exit_code: 0, timeout_seconds: 10,
      }],
    });
    contract.context.max_age_seconds = 31_536_000;
    contract.knowledge_policy.preflight_required = false;
    fs.writeFileSync(path.join(root, 'output/contract.json'), JSON.stringify(contract));
    ({ run_directory: runDirectory } = await startRun(contract, {
      runsRoot: path.join(root, 'output/agent-runs'), observedIdentity: fixturePreflightIdentity(contract),
    }));
  };
  if (!options.contractStartsAtCandidate) await startFixtureRun(baseHead, baseTree);
  fs.mkdirSync(path.dirname(path.join(root, candidatePath)), { recursive: true });
  fs.writeFileSync(path.join(root, candidatePath), 'export const changed = true;\n');
  run(root, ['add', candidatePath]);
  run(root, ['commit', '-qm', 'fixture candidate']);
  let head = run(root, ['rev-parse', 'HEAD']);
  let tree = run(root, ['rev-parse', 'HEAD^{tree}']);
  const candidateSteering = syncFixtureSteeringOutputs(root);
  assert.equal(candidateSteering.catalog.digest, steering.catalog.digest);
  if (options.contractStartsAtCandidate) await startFixtureRun(head, tree);
  fs.writeFileSync(path.join(root, 'docs/release/current-release-state.json'), JSON.stringify({
    kgv2: {
      current_outcome_known: true, repo_root: root, branch: 'main', latest_packet_commit: head,
      fallback_used: false, active_read_path: 'exact-source', packet_digest: 'a'.repeat(64), stale_reasons: [],
    },
  }));
  fs.writeFileSync(path.join(root, 'output/proof.json'), JSON.stringify({ passed: true }));
  fs.writeFileSync(path.join(root, 'output/pr-outcome-evidence.json'), JSON.stringify({
    independence: {
      candidate_provenance: {
        base_sha: baseHead, head_sha: head, commit_count: 1, commits: [head], identities: [],
      },
    },
  }));
  const candidateIdentity = { root, branch: 'main', commit: head, tree, git_status: [] };
  const evaluatedAt = '2026-08-27T12:04:00.000Z';
  const executionAttestation = buildGithubExecutionAttestation({
    token: signedFixtureToken({
      iss: 'https://token.actions.githubusercontent.com', aud: 'chopdot-agent-evaluation',
      repository: 'ChopDotHQ/ChopDot', run_id: '12345', run_attempt: '1',
      run_number: '77', check_run_id: '54321',
      event_name: 'pull_request', workflow_ref: 'ChopDotHQ/ChopDot/.github/workflows/agent-governance.yml@refs/pull/1/merge',
      ref: 'refs/pull/1/merge', sha: 'b'.repeat(40), sub: 'repo:ChopDotHQ/ChopDot:pull_request',
      actor: 'fixture-independent-reviewer', iat: Date.parse('2026-08-27T12:00:00.000Z') / 1000,
      exp: Date.parse('2026-08-27T12:10:00.000Z') / 1000,
    }),
    candidate: candidateIdentity,
    evaluatedAt,
  });
  fs.writeFileSync(path.join(root, 'output/attestation.json'), JSON.stringify(executionAttestation));
  await appendEvent(runDirectory, {
    run_id: contract.run_id, event_type: 'observation_recorded',
    payload: { surface: root, readback: { root, commit: head } },
  });
  await recordArtifact(runDirectory, contract, 'output/proof.json', { artifactType: 'TestEvidencePacketV1' });
  await recordArtifact(runDirectory, contract, 'output/pr-outcome-evidence.json', { artifactType: 'PrOutcomeEvidenceV1' });
  await recordArtifact(runDirectory, contract, 'output/attestation.json', { artifactType: 'TestEvidencePacketV1' });
  const evidence = await recordPassingMeasurementEvidence(root, runDirectory, contract);
  const evaluation = await recordEvaluation(runDirectory, contract, {
    evaluatorIdentity: 'github-actions:pr-outcome:12345:1', measurements: evidence.measurements,
    evaluatedAt, candidateIdentity,
  });
  await terminate(runDirectory, contract.run_id, 'succeeded');
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  const provenance = await generateRunnerProvenance(runDirectory, contract, {
    snapshot, provenanceId: 'runner_provenance_adoption_fixture_001', createdAt: '2026-08-27T12:05:00.000Z',
  });
  const packet = buildOutcomePacket(contract, snapshot, {
    outcomeId: 'outcome_adoption_fixture_001', candidateIdentity, runnerProvenance: provenance,
    knowledgeReceipts: ['knowledge_receipt_context_fixture'], createdAt: '2026-08-27T12:05:00.000Z',
  });
  fs.writeFileSync(path.join(root, 'output/provenance.json'), JSON.stringify(provenance));
  fs.writeFileSync(path.join(root, 'output/outcome.json'), JSON.stringify(packet));
  const recordsRoot = path.join(root, 'output/agent-runs/knowledge-records');
  const durableRecordId = `knowledge_record_${contract.run_id}_${packet.packet_digest.slice(0, 12)}`;
  fs.mkdirSync(recordsRoot, { recursive: true });
  const sourcePath = path.join(recordsRoot, `${durableRecordId}.json`);
  fs.writeFileSync(sourcePath, JSON.stringify(packet));
  const sourceSha = sha256File(sourcePath);
  const recall = {
    receipt_version: '1.0.0', receipt_id: 'knowledge_receipt_adoption_fixture', operation: 'verify_recall',
    backend: 'exact-source', backend_version: '1.0.0', runtime: 'node:test',
    capabilities: ['health', 'read_context', 'record_outcome', 'verify_recall', 'citations', 'durable_record', 'freshness', 'fallback_report'],
    requested_read_path: root, active_read_path: recordsRoot, fallback_status: 'none', accepted: true,
    rejected_reasons: [], durable_record_id: durableRecordId, stored_packet_digest: packet.packet_digest,
    stored_artifact_digests: [sourceSha],
    facts: [{ fact_id: 'fact_adoption_fixture', statement: 'The exact candidate outcome was recalled.', citation_ids: ['citation_adoption_fixture'] }],
    citations: [{ citation_id: 'citation_adoption_fixture', source_identity_id: 'source_adoption_fixture', path: sourcePath, sha256: sourceSha }],
    source_identities: [{ source_identity_id: 'source_adoption_fixture', root, branch: 'main', commit: head, path: sourcePath, sha256: sourceSha }],
    mismatches: [], stale_reasons: [], current_outcome_digest: packet.packet_digest,
    observed_at: '2026-08-27T12:06:00.000Z',
  };
  fs.writeFileSync(path.join(root, 'output/recall.json'), JSON.stringify(recall));
  const releaseAttestation = buildGithubExecutionAttestation({
    token: signedFixtureToken({
      iss: 'https://token.actions.githubusercontent.com', aud: 'chopdot-agent-evaluation',
      repository: 'ChopDotHQ/ChopDot', run_id: '67890', run_attempt: '2', run_number: '88', check_run_id: '98765',
      event_name: 'workflow_dispatch', workflow_ref: 'ChopDotHQ/ChopDot/.github/workflows/agent-governance.yml@refs/heads/main',
      ref: 'refs/heads/main', sha: head, environment: 'public-testnet-release',
      sub: 'repo:ChopDotHQ/ChopDot:environment:public-testnet-release', actor: 'fixture-release-reviewer',
      iat: Date.parse('2026-08-27T12:00:00.000Z') / 1000, exp: Date.parse('2026-08-27T12:10:00.000Z') / 1000,
    }),
    candidate: candidateIdentity,
    evaluatedAt,
  });
  fs.writeFileSync(path.join(root, 'output/release-attestation.json'), JSON.stringify(releaseAttestation));
  const acceptanceAttestation = {
    executionAttestationPaths: ['output/attestation.json'],
    runnerProvenancePaths: ['output/provenance.json'], runDirectoryPaths: [path.relative(root, runDirectory)],
    executionAttestationOptions: {
      jwks: { keys: [fixtureJwk] },
      runReadback: {
        id: 12345, head_sha: head, head_branch: 'main', event: 'pull_request',
        path: '.github/workflows/agent-governance.yml', status: 'completed', run_attempt: 1, run_number: 77,
      },
    },
  };
  fixtureAttestations.set(root, acceptanceAttestation);
  return {
    root, baseHead, head, tree, packet, recall, contract, evaluation, provenance, runDirectory, releaseAttestation,
    acceptanceAttestation, steering,
  };
}

test('pre-push parser accepts exact Git records and rejects incomplete or ambiguous input', () => {
  const local = 'a'.repeat(40);
  const remote = 'b'.repeat(40);
  const accepted = parsePrePushUpdates(`refs/heads/main ${local} refs/heads/main ${remote}\n`);
  assert.deepEqual(accepted.failures, []);
  assert.deepEqual(accepted.updates, [{
    line: 1, local_ref: 'refs/heads/main', local_sha: local,
    remote_ref: 'refs/heads/main', remote_sha: remote,
  }]);

  assert.ok(parsePrePushUpdates('').failures.some((entry) => /no ref updates/u.test(entry)));
  assert.match(parsePrePushUpdates('refs/heads/main short refs/heads/main').failures[0], /exactly four fields/u);
  assert.match(
    parsePrePushUpdates(`refs/heads/main short refs/heads/main ${remote}`).failures[0],
    /malformed object ID/u,
  );
  const duplicate = parsePrePushUpdates([
    `refs/heads/main ${local} refs/heads/main ${remote}`,
    `refs/heads/other ${local} refs/heads/main ${remote}`,
  ].join('\n'));
  assert.ok(duplicate.failures.includes('pre-push stdin contains duplicate remote ref updates'));
});

test('push preflight proves only the clean checked-out fast-forward candidate', async () => {
  const value = await fixture({ steeringLifecycle: 'active' });
  const result = buildPushPreflight({
    root: value.root,
    input: `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}\n`,
    remoteName: 'origin',
    now: STEERING_NOW,
  });

  assert.equal(result.ok, true, JSON.stringify(result.failures));
  assert.equal(result.verdict, 'local_preflight_pass');
  assert.equal(result.governed_acceptance, false);
  assert.equal(result.authoritative_acceptance_surface, 'pr_merge');
  assert.equal(result.candidate.commit, value.head);
  assert.deepEqual(result.ranges[0].commits, [value.head]);
  assert.deepEqual(result.changed_paths, ['tests/change.mjs']);
  assert.notEqual(result.strict_steering.verdict, 'blocked');
  assert.match(result.preflight_digest, /^[0-9a-f]{64}$/u);
  assert.equal('acceptance_receipt_version' in result, false);
});

test('push preflight blocks multiple updates, ref rewriting, and ungoverned paths while preserving declared degradation', async (t) => {
  await t.test('multiple updates', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    const input = [
      `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}`,
      `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}`,
    ].join('\n');
    const result = buildPushPreflight({ root: value.root, input, remoteName: 'origin', now: STEERING_NOW });
    assert.equal(result.ok, false);
    assert.ok(result.failures.includes('pre-push requires exactly one ref update'));
  });

  await t.test('different remote ref', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/rewritten ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /must match exactly/u.test(entry)));
  });

  await t.test('degraded steering', async () => {
    const value = await fixture();
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, true, JSON.stringify(result.failures));
    assert.equal(result.verdict, 'local_preflight_degraded');
    assert.equal(result.governed_acceptance, false);
    assert.deepEqual(result.strict_steering.unexplained_degraded_surface_ids, []);
    assert.ok(result.strict_steering.explained_degraded_surface_ids.includes('fixture-steering'));
    assert.ok(result.strict_steering.explained_degraded_surface_ids.includes('fixture-external-census'));
  });

  await t.test('ungoverned changed path', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    const policyPath = path.join(value.root, 'governance/agent-system/policies/adoption-boundary.v1.json');
    const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
    policy.non_promotable_prefixes.push('tests/change.mjs');
    fs.writeFileSync(policyPath, JSON.stringify(policy));
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.includes('ungoverned changed path: tests/change.mjs'));
  });
});

test('local steering assessment blocks unexplained degradation and stale or drifted evidence', () => {
  const registry = fixtureSteeringRegistry('degraded');
  const baseline = {
    verdict: 'degraded',
    registry: { status: 'active' },
    freshness: { stale: false, lifecycle_reviews: [] },
    drifts: [],
    degraded_surface_ids: ['fixture-steering', 'fixture-external-census'],
    external_discovery: [{ id: 'fixture-external-census', state: 'unavailable', presence_policy: 'optional' }],
    observations: [],
  };
  assert.equal(evaluateLocalSteering(baseline, registry).allowed, true);

  const declaredExternalRegistry = {
    ...registry,
    external_surfaces: [{ id: 'declared-external-degradation', lifecycle: 'degraded' }],
  };
  const declaredExternal = evaluateLocalSteering({
    ...baseline,
    degraded_surface_ids: [...baseline.degraded_surface_ids, 'declared-external-degradation'],
    observations: [{ id: 'declared-external-degradation', state: 'degraded' }],
  }, declaredExternalRegistry);
  assert.equal(declaredExternal.allowed, true);
  assert.ok(declaredExternal.explained_degraded_surface_ids.includes('declared-external-degradation'));

  const unexplained = evaluateLocalSteering({
    ...baseline, degraded_surface_ids: [...baseline.degraded_surface_ids, 'injected-degradation'],
  }, registry);
  assert.equal(unexplained.allowed, false);
  assert.deepEqual(unexplained.unexplained_degraded_surface_ids, ['injected-degradation']);

  const drifted = evaluateLocalSteering({ ...baseline, drifts: ['generated catalog is stale'] }, registry);
  assert.equal(drifted.allowed, false);
  assert.ok(drifted.failures.some((entry) => /generated catalog is stale/u.test(entry)));

  const stale = evaluateLocalSteering({ ...baseline, freshness: { stale: true, lifecycle_reviews: [] } }, registry);
  assert.equal(stale.allowed, false);
  assert.ok(stale.failures.includes('strict steering registry review is stale'));
});

test('push preflight fails closed on deletion, dirty state, non-fast-forward, and unknown new-ref base', async (t) => {
  await t.test('deletion', async () => {
    const value = await fixture();
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${ZERO_OID_FOR_TEST} refs/heads/main ${value.head}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /deletion is not locally provable/u.test(entry)));
  });

  await t.test('dirty candidate', async () => {
    const value = await fixture();
    fs.appendFileSync(path.join(value.root, 'tests/change.mjs'), '// dirty\n');
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.includes('pre-push candidate worktree is not clean'));
  });

  await t.test('non-fast-forward', async () => {
    const value = await fixture();
    const future = run(value.root, ['commit-tree', `${value.head}^{tree}`, '-p', value.head, '-m', 'future remote']);
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${future}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /non-fast-forward/u.test(entry)));
  });

  await t.test('new ref without a provable named-remote base', async () => {
    const value = await fixture();
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${ZERO_OID_FOR_TEST}\n`,
      remoteName: 'missing', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /cannot resolve the named remote HEAD/u.test(entry)));
  });

  await t.test('new ref cannot masquerade as the named remote default branch', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    run(value.root, ['branch', '-m', 'trunk']);
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/trunk ${value.head} refs/heads/trunk ${ZERO_OID_FOR_TEST}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /named remote default branch/u.test(entry)));
  });

  await t.test('existing remote default branch is rejected', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    run(value.root, ['branch', '-m', 'trunk']);
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/trunk ${value.head} refs/heads/trunk ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /named remote default branch/u.test(entry)));
  });

  await t.test('cross-remote symbolic HEAD is rejected', async () => {
    const value = await fixture({ steeringLifecycle: 'active' });
    run(value.root, ['update-ref', 'refs/remotes/other/trunk', value.baseHead]);
    run(value.root, ['symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/other/trunk']);
    const result = buildPushPreflight({
      root: value.root,
      input: `refs/heads/main ${value.head} refs/heads/main ${value.baseHead}\n`,
      remoteName: 'origin', now: STEERING_NOW,
    });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((entry) => /cannot resolve the named remote HEAD/u.test(entry)));
  });
});

test('adoption policy defaults every tracked path to a governed loop class', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'governance/agent-system/policies/adoption-boundary.v1.json')));
  assert.deepEqual(adoptionPolicyFailures(policy), []);
  const classified = classifyChangedPaths(policy, ['PRODUCT_TRUTH.md', 'src/state/store.ts', 'unknown.txt']);
  assert(classified.every((entry) => entry.disposition === 'governed'));
  assert.equal(classified.find((entry) => entry.path === 'PRODUCT_TRUTH.md').rule.id, 'product-law');
  assert.equal(classified.find((entry) => entry.path === 'unknown.txt').rule.id, 'repository-default');
  assert.equal(classifyChangedPaths(policy, ['docs/release/current-release-state.json'])[0].rule.id, 'documentation-research');
});

test('only reserved release-script namespaces route as release while directory semantics remain bounded', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'governance/agent-system/policies/adoption-boundary.v1.json')));
  const intended = [
    'scripts/prepare-dot-host-release.mjs',
    'scripts/readback-dot-host-release.mjs',
    'scripts/record-dot-host-promotion.mjs',
    'scripts/recovery-head-deployment.mjs',
    'scripts/verify-dot-host-rebuild.mjs',
    'scripts/verify-dot-host.mjs',
    'scripts/record-dot-host-rollback.mjs',
    'scripts/readback-dot-host-promotion.mjs',
    'scripts/prepare-dot-host-release-v2.mjs',
    'scripts/verify-dot-host-release.mjs',
    'scripts/verify-dot-host-public.mjs',
    'scripts/recovery-head-deployment-v2.mjs',
    'scripts/verify-dot-host-backdoor.mjs',
  ];
  const hostileNearMisses = [
    'scripts/prepare-dot-hostile-release.mjs',
    'scripts/readbacks-dot-host-release.mjs',
    'scripts/recording-dot-host-promotion.mjs',
    'scripts/recovery-head-deployments.mjs',
    'scripts/verify-dot-hostile.mjs',
    'scripts/verify-dot-host/nested.mjs',
    'scripts/record-user-analytics.mjs',
    'scripts/readback-local-cache.mjs',
    'scripts/prepare-dot-host-other.mjs',
  ];
  const classified = classifyChangedPaths(policy, [...intended, ...hostileNearMisses, 'deployment/nested/release.json']);
  for (const relative of intended) assert.equal(classified.find((entry) => entry.path === relative).rule.id, 'release', relative);
  for (const relative of hostileNearMisses) assert.equal(classified.find((entry) => entry.path === relative).rule.id, 'repository-default', relative);
  assert.equal(classified.find((entry) => entry.path === 'scripts/verify-dot-host-backdoor.mjs').rule.id, 'release', 'verify-dot-host-* is a deliberately reserved release namespace');
  assert.equal(classified.find((entry) => entry.path === 'deployment/nested/release.json').rule.id, 'release');
});

test('exact release-script routing enforces both an allowed profile and release evidence', async () => {
  const value = await fixture({ candidatePath: 'scripts/verify-dot-host.mjs' });
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['scripts/verify-dot-host.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('scripts/verify-dot-host.mjs is not covered by an allowed loop profile (release-outcome, security-authority, incident-repair)')));
  assert(receipt.failures.some((entry) => entry.includes('scripts/verify-dot-host.mjs requires release evidence; observed exact-candidate')));
});

test('acceptance requirements cannot be weakened by editing policy booleans', () => {
  const policy = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'governance/agent-system/policies/adoption-boundary.v1.json')));
  policy.surfaces.product_finish.require_outcome_packet = false;
  policy.surfaces.product_finish.require_contract = false;
  policy.surfaces.product_finish.require_independent_review = false;
  policy.surfaces.product_finish.require_knowledge_recall = false;
  const failures = adoptionPolicyFailures(policy);
  assert(failures.some((entry) => entry.includes('acceptance requirements are immutable guard invariants')));
});

test('removed governed_push surface cannot produce programmatic acceptance', async () => {
  const value = await fixture();
  await assert.rejects(
    rawValidateAcceptance({
      root: value.root, surface: 'governed_push', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
      knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
      expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
      now: new Date('2026-08-27T13:00:00Z'),
    }),
    /unsupported acceptance surface: governed_push/u,
  );
});

test('context receipt binds exact identity and fails when an authority digest drifts', async () => {
  const value = await fixture();
  const receipt = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-27T13:00:00Z') });
  assert.equal(receipt.verdict, 'governed');
  assert.equal(receipt.candidate.commit, value.head);
  fs.writeFileSync(path.join(value.root, 'PRODUCT_TRUTH.md'), '# silently changed\n');
  const drifted = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-27T13:00:00Z') });
  assert.equal(drifted.verdict, 'unverified');
  assert(drifted.reasons.some((entry) => entry.includes('digest changed')));
});

test('degraded steering is recorded with identity and limitations without automatically failing context', async () => {
  const value = await fixture();
  const receipt = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-28T13:00:00Z') });

  assert.equal(receipt.verdict, 'governed', JSON.stringify(receipt.reasons));
  assert.equal(receipt.steering_state.monitor_verdict, 'degraded');
  assert.equal(receipt.steering_state.route_relevance, 'not_evaluated');
  assert.ok(receipt.steering_state.degraded_surface_ids.includes('fixture-steering'));
  assert.ok(receipt.steering_state.disabled_surface_ids.includes('fixture-external-census'));
  assert.deepEqual(receipt.steering_state.drifts, []);
  assert.match(receipt.steering_state.registry_sha256, /^[0-9a-f]{64}$/u);
  assert.match(receipt.steering_state.registry_semantic_digest, /^[0-9a-f]{64}$/u);
  assert.match(receipt.steering_state.catalog_digest, /^[0-9a-f]{64}$/u);
  assert.match(receipt.steering_state.repository_manifest_sha256, /^[0-9a-f]{64}$/u);
  assert.match(receipt.steering_state.worktree_manifest_sha256, /^[0-9a-f]{64}$/u);
  assert.ok(receipt.steering_state.limitations.some((entry) => /relevance.+not evaluated/iu.test(entry)));
});

test('blocked steering remains unverified and preserves its exact drift evidence', async () => {
  const value = await fixture();
  // Pin the fixture group at its accepted content, then change a file it covers.
  // Production pins instruction surfaces the same way; the drift is a content
  // change to a controlled surface, not a stale generated artifact.
  const registryFile = path.join(value.root, REGISTRY_PATH);
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  const built = buildSteeringCatalog(value.root, registry);
  for (const group of registry.surface_groups) {
    const observed = built.groups.find((entry) => entry.id === group.id)?.manifest_sha256;
    if (observed) group.trusted_manifest_sha256 = observed;
  }
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
  fs.appendFileSync(path.join(value.root, 'product/cards.md'), '\n<!-- unsynchronized steering mutation -->\n');
  const receipt = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-28T13:00:00Z') });

  assert.equal(receipt.verdict, 'unverified');
  assert.equal(receipt.steering_state.monitor_verdict, 'blocked');
  assert.equal(receipt.steering_state.route_relevance, 'not_evaluated');
  assert.ok(receipt.steering_state.drifts.some((entry) => /steering surface content changed/iu.test(entry)));
  assert.ok(receipt.reasons.some((entry) => entry.startsWith('steering surface monitor:')));
});

test('task-start context fails stale knowledge while exact recalled candidate can pass acceptance', async () => {
  const value = await fixture();
  fs.writeFileSync(path.join(value.root, 'docs/release/current-release-state.json'), JSON.stringify({
    kgv2: { current_outcome_known: false, stale_reasons: ['legacy release snapshot is stale'] },
  }));
  const context = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-27T13:00:00Z') });
  assert.equal(context.verdict, 'unverified');
  assert(context.reasons.some((entry) => entry.includes('legacy release snapshot is stale')));
  const acceptance = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(acceptance.verdict, 'governed', JSON.stringify(acceptance.failures));
});

test('context receipt uses the shared blocker-aware Cockpit ranking', async () => {
  const value = await fixture();
  fs.writeFileSync(path.join(value.root, 'product/cards.md'), [
    '## P-001 - Lower blocker', '```yaml', 'id: P-001', 'status: building', 'priority: 1', 'blocker: none', 'operator_next_action: Lower', '```', '',
    '## P-035 - Release blocker', '```yaml', 'id: P-035', 'status: building', 'priority: 90', 'blocker: P1-release', 'operator_next_action: Repair release', '```', '',
  ].join('\n'));
  const context = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-27T13:00:00Z') });
  assert.equal(context.active_product_card.id, 'P-035');
});

test('exact contract, outcome, independent verdict, and recall produce governed acceptance', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate', now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'governed', JSON.stringify(receipt.failures));
  assert.equal(receipt.outcomes[0].packet_digest, value.packet.packet_digest);
  assert.deepEqual(receipt.changed_paths, ['tests/change.mjs']);
  assert.match(receipt.changed_path_manifest_digest, /^[0-9a-f]{64}$/);
  assert.equal(receipt.execution_attestations[0].ref, 'refs/pull/1/merge');
  assert.equal(receipt.execution_attestations[0].sha, 'b'.repeat(40));
});

test('hand-authored evaluation, outcome, and recall cannot replace external execution provenance', async () => {
  const value = await fixture();
  const receipt = await rawValidateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('requires exactly one external execution attestation')));
});

test('tampered external execution signature cannot produce governed acceptance', async () => {
  const value = await fixture();
  const target = path.join(value.root, 'output/attestation.json');
  const attestation = JSON.parse(fs.readFileSync(target));
  const [header, payload, signature] = attestation.oidc_jwt.split('.');
  attestation.oidc_jwt = `${header}.${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  fs.writeFileSync(target, JSON.stringify(attestation));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('signature is invalid')));
});

test('caller-supplied synthetic paths cannot replace the canonical Git diff manifest', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['docs/release/current-release-state.json'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert.deepEqual(receipt.changed_paths, ['tests/change.mjs']);
  assert(receipt.failures.some((entry) => entry.includes('Supplied changed paths do not match canonical Git manifest')));
});

test('missing outcome, contract, or knowledge recall cannot pass a governed surface', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('requires exactly one OutcomePacketV1')));
  assert(receipt.failures.some((entry) => entry.includes('requires exactly one exact contract')));
  assert(receipt.failures.some((entry) => entry.includes('requires exactly one knowledge recall receipt')));
});

test('a declared profile cannot cover a contract selected from another loop profile', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], declaredProfiles: ['research'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.includes('Declared loop profile research does not match contract profile implementation'));
});

test('wrong loop profile and stale recall both fail closed', async () => {
  const value = await fixture();
  const contractPath = path.join(value.root, 'output/contract.json');
  const contract = JSON.parse(fs.readFileSync(contractPath));
  contract.loop_profile.id = 'research';
  contract.loop_profile.path = 'governance/agent-system/loops/research.v1.json';
  fs.writeFileSync(contractPath, JSON.stringify(contract));
  const recallPath = path.join(value.root, 'output/recall.json');
  const recall = JSON.parse(fs.readFileSync(recallPath));
  recall.stale_reasons = ['stale fixture'];
  fs.writeFileSync(recallPath, JSON.stringify(recall));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('digest does not match')));
  assert(receipt.failures.some((entry) => entry.includes('stale')));
});

test('tampered cited evidence cannot produce governed acceptance', async () => {
  const value = await fixture();
  fs.writeFileSync(path.join(value.root, 'output/proof.json'), JSON.stringify({ passed: false }));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('does not match its cited SHA-256')));
});

test('a hand-built independent_review_satisfied boolean cannot replace hashed EvaluationV1 evidence', async () => {
  const value = await fixture();
  const packetPath = path.join(value.root, 'output/outcome.json');
  const packet = JSON.parse(fs.readFileSync(packetPath));
  packet.evaluation_index = [];
  packet.packet_digest = digestObject(Object.fromEntries(Object.entries(packet).filter(([key]) => key !== 'packet_digest')));
  fs.writeFileSync(packetPath, JSON.stringify(packet));
  const recallPath = path.join(value.root, 'output/recall.json');
  const recall = JSON.parse(fs.readFileSync(recallPath));
  const outcomeSha = sha256File(packetPath);
  recall.current_outcome_digest = packet.packet_digest;
  recall.citations[0].sha256 = outcomeSha;
  recall.source_identities[0].sha256 = outcomeSha;
  fs.writeFileSync(recallPath, JSON.stringify(recall));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('lacks a hashed EvaluationV1 artifact')));
});

test('forged recall citations fail when bytes are missing or their SHA-256 differs', async () => {
  for (const mode of ['missing', 'hash-mismatch']) {
    const value = await fixture();
    const recallPath = path.join(value.root, 'output/recall.json');
    const recall = JSON.parse(fs.readFileSync(recallPath));
    if (mode === 'missing') {
      recall.citations[0].path = path.join(value.root, 'output/nonexistent-outcome.json');
      recall.source_identities[0].path = recall.citations[0].path;
    } else {
      recall.citations[0].sha256 = 'f'.repeat(64);
      recall.source_identities[0].sha256 = 'f'.repeat(64);
    }
    fs.writeFileSync(recallPath, JSON.stringify(recall));
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
      knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
      expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
      now: new Date('2026-08-27T13:00:00Z'),
    });
    assert.equal(receipt.verdict, 'unverified');
    if (mode === 'missing') assert(receipt.failures.some((entry) => entry.includes('does not exist')));
    else assert(receipt.failures.some((entry) => entry.includes('SHA-256 does not match cited bytes')));
  }
});

test('an evidence level below the governed path minimum fails closed', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'unit',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('requires simulated-integration evidence; observed unit')));
});

test('a tampered supplied context receipt is rejected and current sources are rechecked', async () => {
  const value = await fixture();
  const context = buildContextReceipt({ root: value.root, loopProfile: 'implementation', now: new Date('2026-08-27T13:00:00Z') });
  context.active_product_card.operator_next_action = 'tampered';
  fs.writeFileSync(path.join(value.root, 'output/context.json'), JSON.stringify(context));
  fs.writeFileSync(path.join(value.root, 'PRODUCT_TRUTH.md'), '# drifted after receipt\n');
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], contextReceiptPath: 'output/context.json',
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.includes('Context receipt digest does not match its content'));
  assert(receipt.failures.some((entry) => entry.includes('Fresh context: governing source digest changed')));
});

test('promotion fails when the exact-candidate recall itself is not current', async () => {
  const value = await fixture();
  const recallPath = path.join(value.root, 'output/recall.json');
  const recall = JSON.parse(fs.readFileSync(recallPath));
  recall.accepted = false;
  recall.stale_reasons = ['fixture outcome is not durably known'];
  recall.rejected_reasons = ['fixture outcome is not durably known'];
  fs.writeFileSync(recallPath, JSON.stringify(recall));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('fixture outcome is not durably known')));
  assert(receipt.failures.some((entry) => entry.includes('lacks an accepted exact-digest knowledge recall receipt')));
});

test('pr_merge derives changed paths from hashed PR provenance when verifier contract starts at candidate HEAD', async () => {
  const value = await fixture({ contractStartsAtCandidate: true });
  const receipt = await validateAcceptance({
    root: value.root, surface: 'pr_merge', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(value.contract.scope.starting_head, value.head);
  assert.equal(receipt.verdict, 'governed', JSON.stringify(receipt.failures));
  assert.deepEqual(receipt.changed_paths, ['tests/change.mjs']);
  assert.equal(receipt.changed_path_manifest_sources[0].kind, 'pr_candidate_provenance');
  assert.equal(receipt.changed_path_manifest_sources[0].path, 'output/pr-outcome-evidence.json');
  assert.match(receipt.changed_path_manifest_sources[0].sha256, /^[0-9a-f]{64}$/u);
});

test('pr_merge rejects an empty or caller-synthesized manifest even when the verifier contract range is empty', async () => {
  const value = await fixture({ contractStartsAtCandidate: true });
  const receipt = await validateAcceptance({
    root: value.root, surface: 'pr_merge', changedPaths: [],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('Supplied changed paths do not match canonical Git manifest')));
});

test('a hand-authored RunnerProvenanceV1 cannot replace replayed runner state', async () => {
  const value = await fixture();
  const provenancePath = path.join(value.root, 'output/provenance.json');
  const provenance = JSON.parse(fs.readFileSync(provenancePath));
  provenance.command_evidence.command_results_digest = 'f'.repeat(64);
  provenance.provenance_digest = digestObject(Object.fromEntries(Object.entries(provenance).filter(([key]) => key !== 'provenance_digest')));
  fs.writeFileSync(provenancePath, JSON.stringify(provenance));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'],
    knowledgeReceiptPaths: ['output/recall.json'], expectedCommit: value.head,
    expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('provenance does not match replayed ledger')));
});

test('tampered runner ledger, evaluation, and command evidence each fail governed acceptance', async (t) => {
  await t.test('ledger', async () => {
    const value = await fixture();
    const ledger = path.join(value.runDirectory, 'events.jsonl');
    fs.writeFileSync(ledger, fs.readFileSync(ledger, 'utf8').replace('"terminal_state":"succeeded"', '"terminal_state":"cancelled"'));
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
      expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    });
    assert.equal(receipt.verdict, 'unverified');
    assert(receipt.failures.some((entry) => /RunnerProvenanceV1:.*(?:digest|terminal|ledger)/iu.test(entry)));
  });
  await t.test('evaluation record', async () => {
    const value = await fixture();
    fs.writeFileSync(path.resolve(value.root, value.packet.evaluation_index[0].path), JSON.stringify({ forged: true }));
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
      expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    });
    assert.equal(receipt.verdict, 'unverified');
    assert(receipt.failures.some((entry) => /evaluation.*(?:SHA-256|hash mismatch)/iu.test(entry)));
  });
  await t.test('command evidence', async () => {
    const value = await fixture();
    const command = value.packet.artifacts.find((entry) => entry.artifact_id === value.provenance.command_evidence.artifact_id);
    fs.writeFileSync(path.resolve(value.root, command.path), JSON.stringify({ command_results: [] }));
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
      expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    });
    assert.equal(receipt.verdict, 'unverified');
    assert(receipt.failures.some((entry) => /command.*(?:SHA-256|hash mismatch)/iu.test(entry)));
  });
});

test('knowledge recall rejects self-citing the supplied outcome instead of the durable exact-source record', async () => {
  const value = await fixture();
  const recallPath = path.join(value.root, 'output/recall.json');
  const recall = JSON.parse(fs.readFileSync(recallPath));
  const outcomePath = path.join(value.root, 'output/outcome.json');
  const outcomeSha = sha256File(outcomePath);
  recall.active_read_path = path.dirname(outcomePath);
  recall.durable_record_id = 'outcome';
  recall.citations[0].path = outcomePath;
  recall.citations[0].sha256 = outcomeSha;
  recall.source_identities[0].path = outcomePath;
  recall.source_identities[0].sha256 = outcomeSha;
  fs.writeFileSync(recallPath, JSON.stringify(recall));
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
  });
  assert.equal(receipt.verdict, 'unverified');
  assert(receipt.failures.some((entry) => entry.includes('self-cites the supplied OutcomePacketV1')));
});

test('missing persisted provenance or durable recall bytes fail closed', async (t) => {
  await t.test('missing provenance', async () => {
    const value = await fixture();
    fs.unlinkSync(path.join(value.root, 'output/provenance.json'));
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
      expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    });
    assert.equal(receipt.verdict, 'unverified');
    assert(receipt.failures.some((entry) => entry.includes('RunnerProvenanceV1 does not exist')));
  });
  await t.test('missing durable recall record', async () => {
    const value = await fixture();
    fs.unlinkSync(value.recall.citations[0].path);
    const receipt = await validateAcceptance({
      root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
      outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
      expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    });
    assert.equal(receipt.verdict, 'unverified');
    assert(receipt.failures.some((entry) => entry.includes('Knowledge recall durable record does not exist')));
  });
});

test('AcceptanceReceiptV1 can be independently replayed from only its persisted bindings', async () => {
  const value = await fixture();
  const receipt = await validateAcceptance({
    root: value.root, surface: 'product_finish', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'exact-candidate',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  const replay = await replayAcceptanceReceipt(value.root, receipt, {
    now: new Date('2026-08-27T13:00:00Z'),
    executionAttestationOptions: value.acceptanceAttestation.executionAttestationOptions,
  });
  assert.equal(replay.valid, true, JSON.stringify(replay.issues));
  const tampered = structuredClone(receipt);
  tampered.contracts[0].sha256 = 'f'.repeat(64);
  const rejected = await replayAcceptanceReceipt(value.root, tampered, {
    now: new Date('2026-08-27T13:00:00Z'),
    executionAttestationOptions: value.acceptanceAttestation.executionAttestationOptions,
  });
  assert.equal(rejected.valid, false);
  assert(rejected.issues.some((entry) => entry.includes('Acceptance receipt digest does not match')));
  assert(rejected.issues.some((entry) => entry.includes('Acceptance contract stored SHA-256')));
});

test('release accepts only a separately signed protected-environment attestation without requiring outcome indexing', async () => {
  const value = await fixture();
  const executionAttestationOptions = {
    jwks: { keys: [fixtureJwk] },
    runReadback: {
      id: 67890, head_sha: value.head, head_branch: 'main', event: 'workflow_dispatch',
      path: '.github/workflows/agent-governance.yml', status: 'completed', run_attempt: 2, run_number: 88,
    },
    environmentReadback: {
      name: 'public-testnet-release', can_admins_bypass: false,
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
      protection_rules: [],
    },
    environmentBranchPolicies: {
      total_count: 2,
      branch_policies: [
        { id: 1, name: 'codex/chopdot-v1-launch', type: 'branch' },
        { id: 2, name: 'main', type: 'branch' },
      ],
    },
  };
  const receipt = await rawValidateAcceptance({
    root: value.root, surface: 'release', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    runnerProvenancePaths: ['output/provenance.json'], runDirectoryPaths: [path.relative(value.root, value.runDirectory)],
    executionAttestationPaths: ['output/release-attestation.json'],
    executionAttestationOptions,
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'release',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(receipt.verdict, 'governed', JSON.stringify(receipt.failures));
  assert.equal(receipt.execution_attestations[0].environment, 'public-testnet-release');
  assert.equal(receipt.execution_attestations[0].path, 'output/release-attestation.json');

  const bypassOptions = structuredClone(executionAttestationOptions);
  bypassOptions.environmentReadback.can_admins_bypass = true;
  const bypassReceipt = await rawValidateAcceptance({
    root: value.root, surface: 'release', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    runnerProvenancePaths: ['output/provenance.json'], runDirectoryPaths: [path.relative(value.root, value.runDirectory)],
    executionAttestationPaths: ['output/release-attestation.json'], executionAttestationOptions: bypassOptions,
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'release',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(bypassReceipt.verdict, 'unverified');
  assert(bypassReceipt.failures.some((entry) => entry.includes('administrator bypass')));

  const unexpectedReviewerOptions = structuredClone(executionAttestationOptions);
  unexpectedReviewerOptions.environmentReadback.protection_rules = [{
    type: 'required_reviewers', prevent_self_review: false,
    reviewers: [{ type: 'User', reviewer: { id: 999999, login: 'UnconfiguredCollaborator' } }],
  }];
  const unexpectedReviewerReceipt = await rawValidateAcceptance({
    root: value.root, surface: 'release', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    runnerProvenancePaths: ['output/provenance.json'], runDirectoryPaths: [path.relative(value.root, value.runDirectory)],
    executionAttestationPaths: ['output/release-attestation.json'], executionAttestationOptions: unexpectedReviewerOptions,
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'release',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(unexpectedReviewerReceipt.verdict, 'unverified');
  assert(unexpectedReviewerReceipt.failures.some((entry) => entry.includes('unexpected required reviewer')));

  const wrongSelfReviewOptions = structuredClone(executionAttestationOptions);
  wrongSelfReviewOptions.environmentReadback.protection_rules = [{
    type: 'required_reviewers', prevent_self_review: true, reviewers: [],
  }];
  const wrongSelfReviewReceipt = await rawValidateAcceptance({
    root: value.root, surface: 'release', changedPaths: ['tests/change.mjs'],
    outcomePaths: ['output/outcome.json'], contractPaths: ['output/contract.json'], knowledgeReceiptPaths: ['output/recall.json'],
    runnerProvenancePaths: ['output/provenance.json'], runDirectoryPaths: [path.relative(value.root, value.runDirectory)],
    executionAttestationPaths: ['output/release-attestation.json'], executionAttestationOptions: wrongSelfReviewOptions,
    expectedCommit: value.head, expectedTree: value.tree, expectedBranch: 'main', evidenceLevel: 'release',
    now: new Date('2026-08-27T13:00:00Z'),
  });
  assert.equal(wrongSelfReviewReceipt.verdict, 'unverified');
  assert(wrongSelfReviewReceipt.failures.some((entry) => entry.includes('prevent_self_review differs')));
});

test('the repository has an executable governed pre-push hook', () => {
  const result = hookHealth(repositoryRoot);
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});
