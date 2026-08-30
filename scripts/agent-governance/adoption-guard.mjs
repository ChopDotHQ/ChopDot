#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateKnowledgeRecall } from '../agent-system/adapters/port.mjs';
import { hashArtifact } from '../agent-system/artifacts.mjs';
import { contractCreatorId, contractProfileId, digestContract, loadLoopProfile } from '../agent-system/contract.mjs';
import { validateCandidateIdentity } from '../agent-system/candidate.mjs';
import { verifyReviewerIndependence } from '../agent-system/evaluator.mjs';
import { validateOutcomePacket } from '../agent-system/outcome.mjs';
import { verifyRunnerProvenance } from '../agent-system/provenance.mjs';
import { validateGovernanceInstance } from '../agent-system/schema.mjs';
import { validateAgentContract, validateContractProfileAlignment } from '../agent-system/validate.mjs';
import { nextBuildingProductCard } from '../product-card-ranking.mjs';
import { decodeJwt, RELEASE_ENVIRONMENT, verifyGithubExecutionAttestation } from './execution-attestation.mjs';
import { digestObject, parseArgs, readJson, sha256File, writeReport } from './lib.mjs';
import { loadSteeringRegistry, runSteeringMonitor } from './steering-surfaces.mjs';

const POLICY_PATH = 'governance/agent-system/policies/adoption-boundary.v1.json';
const CONTEXT_PATH = 'product/context-authority.json';
const RELEASE_STATE_PATH = 'docs/release/current-release-state.json';
const EVIDENCE_LEVELS = ['source-only', 'unit', 'simulated-integration', 'simulated-host', 'exact-candidate', 'real-host-chain', 'live-user', 'release'];
const LOOP_PROFILES = ['research', 'product-definition', 'implementation', 'ux-creation', 'security-authority', 'incident-repair', 'release-outcome'];
const ACCEPTANCE_SURFACES = ['product_finish', 'pr_merge', 'release'];
const ADOPTION_POLICY_DIGEST = '547e2bc0841d17acbdc095f513261aa0536e173896fb152e7e17d2f3e6f9a09a';
const SURFACE_PROMOTION = Object.freeze({
  task_start: 'prohibited',
  product_finish: 'governed-acceptance-only',
  pr_merge: 'governed-acceptance-only',
  release: 'governed-acceptance-only',
});

function git(root, args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function list(value) {
  return String(value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function unique(values) { return [...new Set(values)].sort(); }

function normalizedRelative(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\//u, '').replace(/^\/+|\/+$/gu, '');
}

function safeFile(root, value, label, failures) {
  if (!value) {
    failures.push(`${label} is required`);
    return null;
  }
  const exactRoot = fs.realpathSync(root);
  const unresolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(exactRoot, value);
  if (unresolved !== exactRoot && !unresolved.startsWith(`${exactRoot}${path.sep}`)) {
    failures.push(`${label} escapes the exact repository root`);
    return null;
  }
  if (!fs.existsSync(unresolved) || !fs.statSync(unresolved).isFile()) {
    failures.push(`${label} does not exist: ${value}`);
    return null;
  }
  const physical = fs.realpathSync(unresolved);
  if (physical !== exactRoot && !physical.startsWith(`${exactRoot}${path.sep}`)) {
    failures.push(`${label} resolves outside the exact repository root`);
    return null;
  }
  return physical;
}

function safeDirectory(root, value, label, failures) {
  if (!value) {
    failures.push(`${label} is required`);
    return null;
  }
  const exactRoot = fs.realpathSync(root);
  const unresolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(exactRoot, value);
  if (unresolved !== exactRoot && !unresolved.startsWith(`${exactRoot}${path.sep}`)) {
    failures.push(`${label} escapes the exact repository root`);
    return null;
  }
  if (!fs.existsSync(unresolved) || !fs.statSync(unresolved).isDirectory()) {
    failures.push(`${label} does not exist: ${value}`);
    return null;
  }
  const physical = fs.realpathSync(unresolved);
  if (physical !== exactRoot && !physical.startsWith(`${exactRoot}${path.sep}`)) {
    failures.push(`${label} resolves outside the exact repository root`);
    return null;
  }
  return physical;
}

export function loadAdoptionPolicy(root) {
  return readJson(path.join(root, POLICY_PATH));
}

export function adoptionPolicyFailures(policy) {
  const failures = [];
  if (digestObject(policy) !== ADOPTION_POLICY_DIGEST) failures.push('adoption policy differs from the guard-reviewed canonical policy digest');
  if (policy?.policy_version !== '1.0.0') failures.push('adoption policy must use version 1.0.0');
  if (policy?.default_disposition !== 'governed') failures.push('adoption policy default must be governed');
  const observedSurfaces = Object.keys(policy?.surfaces ?? {}).sort();
  const requiredSurfaces = Object.keys(SURFACE_PROMOTION).sort();
  if (JSON.stringify(observedSurfaces) !== JSON.stringify(requiredSurfaces)) {
    failures.push(`adoption policy surfaces must be exactly ${requiredSurfaces.join(', ')}`);
  }
  for (const [surface, promotion] of Object.entries(SURFACE_PROMOTION)) {
    const definition = policy?.surfaces?.[surface];
    if (!definition || definition.promotion !== promotion || Object.keys(definition).length !== 1) {
      failures.push(`${surface} must declare only promotion=${promotion}; acceptance requirements are immutable guard invariants`);
    }
  }
  const ids = new Set();
  for (const rule of policy?.path_rules ?? []) {
    if (!rule.id || ids.has(rule.id)) failures.push(`invalid or duplicate adoption rule ${rule.id ?? '(missing)'}`);
    ids.add(rule.id);
    if (!(rule.paths?.length || rule.prefixes?.length || rule.filename_prefixes?.length)) failures.push(`${rule.id}: paths, prefixes, or filename_prefixes are required`);
    if ((rule.filename_prefixes ?? []).some((entry) => {
      const prefix = normalizedRelative(entry);
      return !prefix || path.posix.basename(prefix) === '';
    })) failures.push(`${rule.id}: filename_prefixes must identify a non-empty filename prefix`);
    if (!rule.allowed_profiles?.length) failures.push(`${rule.id}: allowed_profiles are required`);
    if (rule.allowed_profiles?.some((profile) => !LOOP_PROFILES.includes(profile))) failures.push(`${rule.id}: allowed_profiles contains an unknown canonical profile`);
    if (!EVIDENCE_LEVELS.includes(rule.minimum_evidence_level)) failures.push(`${rule.id}: minimum_evidence_level must be promotable and canonical`);
  }
  if (!ids.has('repository-default')) failures.push('adoption policy requires a repository-default rule');
  if (policy?.path_rules?.at(-1)?.id !== 'repository-default' || !policy.path_rules.at(-1)?.prefixes?.includes('')) failures.push('repository-default must be the final catch-all adoption rule');
  return failures;
}

function ruleMatches(rule, relative) {
  const candidate = normalizedRelative(relative);
  if ((rule.paths ?? []).some((entry) => normalizedRelative(entry) === candidate)) return true;
  if ((rule.prefixes ?? []).some((entry) => {
    const prefix = normalizedRelative(entry);
    return prefix === '' || candidate === prefix || candidate.startsWith(`${prefix}/`);
  })) return true;
  return (rule.filename_prefixes ?? []).some((entry) => {
    const prefix = normalizedRelative(entry);
    if (!prefix || path.posix.dirname(candidate) !== path.posix.dirname(prefix)) return false;
    const candidateName = path.posix.basename(candidate);
    const prefixName = path.posix.basename(prefix);
    if (!candidateName.startsWith(prefixName)) return false;
    const suffix = candidateName.slice(prefixName.length);
    return suffix === '' || prefixName.endsWith('-') || suffix.startsWith('.') || suffix.startsWith('-');
  });
}

export function classifyChangedPaths(policy, changedPaths) {
  const nonPromotable = policy.non_promotable_prefixes ?? [];
  return unique(changedPaths.map(normalizedRelative).filter(Boolean)).map((relative) => {
    const ignored = nonPromotable.some((entry) => {
      const prefix = normalizedRelative(entry);
      return relative === prefix || relative.startsWith(`${prefix}/`);
    });
    const rule = ignored ? null : (policy.path_rules ?? []).find((entry) => ruleMatches(entry, relative));
    return { path: relative, disposition: ignored ? 'ungoverned' : policy.default_disposition, rule: rule ?? null };
  });
}

function activeProductCard(root) {
  const markdown = fs.readFileSync(path.join(root, 'product/cards.md'), 'utf8');
  const cards = markdown.split(/^## /mu).slice(1).map((section) => {
    const id = /^(P-\d+)/u.exec(section)?.[1] ?? null;
    const status = /^status:\s*(\S+)/mu.exec(section)?.[1] ?? null;
    const priority = Number(/^priority:\s*(\d+)/mu.exec(section)?.[1] ?? 999);
    const blocker = /^blocker:\s*(\S+)/mu.exec(section)?.[1] ?? 'none';
    const operatorNextAction = /^operator_next_action:\s*(.+)$/mu.exec(section)?.[1]?.trim() ?? null;
    return { id, status, priority, blocker, operator_next_action: operatorNextAction };
  });
  return nextBuildingProductCard(cards.filter((entry) => entry.id));
}

function sourceReceipt(root, manifest, now) {
  const records = [];
  const failures = [];
  for (const source of manifest.default_read_order ?? []) {
    if (source.status !== 'active') continue;
    const file = path.resolve(root, source.path);
    let observed = '0'.repeat(64);
    try { observed = sha256File(file); } catch { failures.push(`governing source is unavailable: ${source.path}`); }
    const reviewed = Date.parse(`${source.last_reviewed}T00:00:00Z`);
    const fresh = Number.isFinite(reviewed) && (now.getTime() - reviewed) / 86_400_000 <= source.freshness_days;
    const matches = observed === source.sha256;
    if (!fresh) failures.push(`governing source is stale: ${source.path}`);
    if (!matches) failures.push(`governing source digest changed: ${source.path}`);
    records.push({ path: source.path, declared_sha256: source.sha256, observed_sha256: observed, fresh, matches });
  }
  if (!records.length) failures.push('context authority has no active default sources');
  return { records, failures };
}

function knowledgeState(root, candidate) {
  let state;
  try { state = readJson(path.join(root, RELEASE_STATE_PATH)); } catch { return { current: false, backend: null, packet_digest: null, stale_reasons: ['current release state is unavailable'] }; }
  const kg = state.kgv2 ?? {};
  const stale = [...(kg.stale_reasons ?? [])];
  if (kg.current_outcome_known !== true) stale.push('current_outcome_known is false');
  if (kg.repo_root !== candidate.root) stale.push('knowledge root differs from current root');
  if (kg.branch !== candidate.branch) stale.push('knowledge branch differs from current branch');
  if (kg.latest_packet_commit !== candidate.commit) stale.push('knowledge commit differs from current HEAD');
  if (kg.fallback_used !== false) stale.push('knowledge fallback is active or unknown');
  return {
    current: stale.length === 0,
    backend: kg.active_read_path ?? null,
    packet_digest: /^[0-9a-f]{64}$/u.test(String(kg.packet_digest ?? '')) ? kg.packet_digest : null,
    stale_reasons: unique(stale),
  };
}

export function buildContextReceipt({
  root: rootInput, surface = 'task_start', loopProfile = 'implementation', now = new Date(),
  candidateOverride = null, knowledgeOverride = null,
}) {
  if (surface === 'governed_push') throw new Error('unsupported acceptance surface: governed_push');
  const root = fs.realpathSync(path.resolve(rootInput));
  const policy = loadAdoptionPolicy(root);
  const failures = adoptionPolicyFailures(policy);
  const manifest = readJson(path.join(root, CONTEXT_PATH));
  const candidate = candidateOverride ?? {
    root,
    branch: git(root, ['branch', '--show-current']),
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
    git_status: list(git(root, ['status', '--porcelain=v1', '--untracked-files=all']).replaceAll('\n', ',')),
  };
  const portableCi = process.env.GITHUB_ACTIONS === 'true';
  if (!portableCi && path.resolve(manifest.exact_root ?? '') !== root) failures.push('context manifest exact_root differs from current root');
  if (!portableCi && manifest.branch !== candidate.branch) failures.push('context manifest branch differs from current branch');
  const steering = runSteeringMonitor(root, { now, requirePromoted: portableCi });
  if (steering.verdict === 'blocked') {
    failures.push(...steering.drifts.map((reason) => `steering surface monitor: ${reason}`));
  }
  const degradedSurfaceIds = unique(steering.degraded_surface_ids ?? []);
  const disabledSurfaceIds = unique(steering.disabled_surface_ids ?? []);
  const steeringLimitations = unique([
    ...(steering.limitations ?? []),
    ...(steering.verdict === 'degraded'
      ? [`Steering is degraded for ${degradedSurfaceIds.join(', ') || 'unidentified surfaces'}; relevance to the ${surface} route was not evaluated.`]
      : []),
  ]);
  const steeringState = {
    monitor_verdict: steering.verdict,
    registry_path: steering.registry.path,
    registry_sha256: steering.registry.sha256,
    registry_semantic_digest: steering.registry.semantic_digest,
    catalog_path: steering.catalog.path,
    catalog_digest: steering.catalog.digest,
    repository_manifest_sha256: steering.catalog.repository_manifest_sha256,
    worktree_manifest_sha256: steering.worktree.working_tree_manifest_sha256,
    degraded_surface_ids: degradedSurfaceIds,
    disabled_surface_ids: disabledSurfaceIds,
    drifts: unique(steering.drifts ?? []),
    route_relevance: 'not_evaluated',
    limitations: steeringLimitations,
  };
  const sources = sourceReceipt(root, manifest, now);
  failures.push(...sources.failures);
  const observedKnowledge = knowledgeOverride ?? knowledgeState(root, candidate);
  if (observedKnowledge.current !== true) {
    failures.push(...(observedKnowledge.stale_reasons?.length
      ? observedKnowledge.stale_reasons.map((reason) => `knowledge state is stale: ${reason}`)
      : ['knowledge state is not current for the exact candidate']));
  }
  const base = {
    receipt_version: '1.0.0', surface, loop_profile: loopProfile,
    candidate, governing_sources: sources.records, active_product_card: activeProductCard(root),
    knowledge_state: observedKnowledge, steering_state: steeringState,
    verdict: failures.length ? 'unverified' : 'governed', reasons: unique(failures), created_at: now.toISOString(),
  };
  const receiptId = `context_receipt_${digestObject(base).slice(0, 12)}`;
  const receipt = { ...base, receipt_id: receiptId };
  receipt.receipt_digest = digestObject(receipt);
  const validation = validateGovernanceInstance(receipt, 'context-receipt.v1.schema.json');
  if (!validation.valid) throw new Error(`Context receipt schema invalid: ${validation.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  return receipt;
}

function readContract(root, value, failures) {
  const file = safeFile(root, value, 'Contract', failures);
  if (!file) return null;
  try {
    const contract = readJson(file);
    const validation = validateAgentContract(contract, { expectedRoot: root });
    failures.push(...validation.issues.map((entry) => `Contract: ${entry.path} ${entry.message}`));
    try {
      const profile = loadLoopProfile(contractProfileId(contract));
      const alignment = validateContractProfileAlignment(contract, profile);
      failures.push(...alignment.issues.map((entry) => `Contract profile alignment: ${entry.path} ${entry.message}`));
    } catch (error) {
      failures.push(`Contract profile alignment: ${error.message}`);
    }
    return { path: path.relative(root, file), sha256: sha256File(file), value: contract };
  }
  catch (error) { failures.push(`Contract is invalid JSON: ${error.message}`); return null; }
}

async function resolvePacketReference(root, packetFile, reference, label, failures) {
  const candidates = unique([
    path.resolve(root, reference.path ?? ''),
    path.resolve(path.dirname(packetFile), reference.path ?? ''),
  ]);
  let resolved = null;
  for (const candidate of candidates) {
    const localFailures = [];
    const file = safeFile(root, candidate, label, localFailures);
    if (file) { resolved = file; break; }
  }
  if (!resolved) {
    failures.push(`${label} does not exist inside the exact repository: ${reference.path ?? '(missing)'}`);
    return null;
  }
  let aggregate;
  try { aggregate = (await hashArtifact(root, path.relative(root, resolved))).aggregate_sha256; }
  catch (error) {
    failures.push(`${label} cannot be hashed as a canonical artifact: ${error.message}`);
    return null;
  }
  const byteSha256 = sha256File(resolved);
  if (![aggregate, byteSha256].includes(reference.sha256)) {
    failures.push(`${label} ${reference.path} does not match its cited SHA-256`);
    return null;
  }
  let value = null;
  try { value = readJson(resolved); } catch { /* Binary or non-JSON evidence is still byte-verifiable. */ }
  return { file: resolved, path: path.relative(root, resolved), sha256: reference.sha256, byte_sha256: byteSha256, aggregate_sha256: aggregate, value, reference };
}

async function readOutcome(root, value, failures) {
  const file = safeFile(root, value, 'OutcomePacketV1', failures);
  if (!file) return null;
  let packet;
  try { packet = readJson(file); } catch (error) { failures.push(`OutcomePacketV1 is invalid JSON: ${error.message}`); return null; }
  const validation = validateOutcomePacket(packet);
  failures.push(...validation.issues.map((issue) => `OutcomePacketV1: ${issue}`));
  const artifacts = new Map((packet.artifacts ?? []).map((entry) => [entry.artifact_id, entry]));
  if (artifacts.size !== (packet.artifacts ?? []).length) failures.push('OutcomePacketV1 contains duplicate artifact IDs');
  const resolvedEvidence = [];
  for (const reference of packet.evidence_index ?? []) {
    const artifact = artifacts.get(reference.artifact_id);
    if (!artifact || artifact.path !== reference.path || artifact.sha256 !== reference.sha256) {
      failures.push(`OutcomePacketV1 evidence ${reference.artifact_id ?? '(missing)'} is not identically bound in artifacts`);
    }
    const resolved = await resolvePacketReference(root, file, reference, `OutcomePacketV1 evidence ${reference.artifact_id ?? '(missing)'}`, failures);
    if (resolved) resolvedEvidence.push(resolved);
  }
  const resolvedEvaluations = [];
  for (const reference of packet.evaluation_index ?? []) {
    const artifact = artifacts.get(reference.artifact_id);
    if (!artifact || artifact.path !== reference.path || artifact.sha256 !== reference.sha256) {
      failures.push(`OutcomePacketV1 evaluation ${reference.artifact_id ?? '(missing)'} is not identically bound in artifacts`);
    }
    const resolved = await resolvePacketReference(root, file, reference, `OutcomePacketV1 evaluation ${reference.artifact_id ?? '(missing)'}`, failures);
    if (resolved) resolvedEvaluations.push(resolved);
  }
  return { file, path: path.relative(root, file), sha256: sha256File(file), packet, resolvedEvidence, resolvedEvaluations };
}

function readRecall(root, value, outcome, candidate, failures) {
  const file = safeFile(root, value, 'Knowledge recall receipt', failures);
  if (!file) return null;
  let receipt;
  try { receipt = readJson(file); } catch (error) { failures.push(`Knowledge recall receipt is invalid JSON: ${error.message}`); return null; }
  const packet = outcome.packet;
  let valid = true;
  try { validateKnowledgeRecall(receipt, { root: candidate.root, branch: candidate.branch, commit: candidate.commit }, packet.packet_digest); }
  catch (error) { valid = false; failures.push(`Knowledge recall receipt: ${error.message}`); }
  if (receipt.backend !== 'exact-source') {
    valid = false;
    failures.push('Knowledge recall receipt backend is not exact-source');
  }
  const activeReadDirectory = safeDirectory(root, receipt.active_read_path, 'Knowledge recall active_read_path', failures);
  const durableRecordId = String(receipt.durable_record_id ?? '');
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/u.test(durableRecordId)) {
    valid = false;
    failures.push('Knowledge recall receipt has no valid durable_record_id');
  }
  const expectedDurableFile = activeReadDirectory && durableRecordId
    ? safeFile(root, path.join(activeReadDirectory, `${durableRecordId}.json`), 'Knowledge recall durable record', failures)
    : null;
  if (!expectedDurableFile) valid = false;
  if (expectedDurableFile && outcome.file === expectedDurableFile) {
    valid = false;
    failures.push('Knowledge recall receipt self-cites the supplied OutcomePacketV1 instead of a durable exact-source record');
  }
  const sources = new Map();
  for (const source of receipt.source_identities ?? []) {
    if (sources.has(source.source_identity_id)) {
      valid = false;
      failures.push(`Knowledge recall receipt has duplicate source identity ${source.source_identity_id}`);
    }
    sources.set(source.source_identity_id, source);
  }
  const citationIds = new Set();
  let citedOutcome = false;
  let citedSourcePath = null;
  let citedSourceSha256 = null;
  if ((receipt.citations ?? []).length !== 1 || (receipt.source_identities ?? []).length !== 1) {
    valid = false;
    failures.push('Knowledge recall receipt must cite exactly one durable exact-source record');
  }
  for (const citation of receipt.citations ?? []) {
    if (citationIds.has(citation.citation_id)) {
      valid = false;
      failures.push(`Knowledge recall receipt has duplicate citation ${citation.citation_id}`);
    }
    citationIds.add(citation.citation_id);
    const source = sources.get(citation.source_identity_id);
    if (!source) continue;
    if (path.resolve(citation.path) !== path.resolve(source.path) || citation.sha256 !== source.sha256) {
      valid = false;
      failures.push(`Knowledge recall citation ${citation.citation_id} does not identically match source ${source.source_identity_id}`);
      continue;
    }
    const citedFile = safeFile(root, citation.path, `Knowledge recall citation ${citation.citation_id}`, failures);
    if (!citedFile) { valid = false; continue; }
    if (!expectedDurableFile || citedFile !== expectedDurableFile) {
      valid = false;
      failures.push(`Knowledge recall citation ${citation.citation_id} is not the durable record selected by active_read_path and durable_record_id`);
      continue;
    }
    if (citedFile === outcome.file) {
      valid = false;
      failures.push('Knowledge recall receipt self-cites the supplied OutcomePacketV1 instead of a durable exact-source record');
      continue;
    }
    const actual = sha256File(citedFile);
    if (actual !== citation.sha256) {
      valid = false;
      failures.push(`Knowledge recall citation ${citation.citation_id} SHA-256 does not match cited bytes`);
      continue;
    }
    try {
      const cited = readJson(citedFile);
      if (cited.packet_digest === packet.packet_digest
        && path.resolve(cited.root ?? '') === candidate.root
        && cited.branch === candidate.branch
        && cited.ending_head === candidate.commit
        && digestObject(cited) === digestObject(packet)) {
        citedOutcome = true;
        citedSourcePath = path.relative(root, citedFile);
        citedSourceSha256 = actual;
      }
    } catch { /* The citation is byte-valid but does not prove the recalled outcome. */ }
  }
  if (!citedOutcome) {
    valid = false;
    failures.push(`Knowledge recall receipt does not cite the exact recalled OutcomePacketV1 bytes for ${packet.packet_digest}`);
  }
  return {
    path: path.relative(root, file), sha256: sha256File(file), receipt_id: receipt.receipt_id ?? null,
    current_outcome_digest: receipt.current_outcome_digest ?? null,
    backend: receipt.active_read_path ?? receipt.backend ?? null,
    durable_record_id: durableRecordId || null,
    cited_source_path: citedSourcePath,
    cited_source_sha256: citedSourceSha256,
    valid,
  };
}

function readExecutionAttestation(root, value, outcomes, candidate, surface, failures, options = {}) {
  const file = safeFile(root, value, 'Execution attestation', failures);
  if (!file) return null;
  let attestation;
  try { attestation = readJson(file); } catch (error) { failures.push(`Execution attestation is invalid JSON: ${error.message}`); return null; }
  const digest = sha256File(file);
  const release = surface === 'release';
  if (!release) {
    const indexed = outcomes.some((outcome) => outcome.resolvedEvidence.some((entry) => entry.file === file && entry.byte_sha256 === digest));
    if (!indexed) failures.push('Execution attestation bytes are not indexed by the accepted OutcomePacketV1');
  }
  failures.push(...verifyGithubExecutionAttestation(attestation, {
    candidate,
    ...(release ? { environment: RELEASE_ENVIRONMENT } : {}),
  }, options).map((entry) => `Execution attestation: ${entry}`));
  try {
    const { claims } = decodeJwt(attestation.oidc_jwt);
    if (claims.event_name === 'workflow_dispatch' && claims.sha !== candidate.commit) failures.push('Execution attestation: signed workflow_dispatch SHA does not match candidate commit');
    const expectedBranchRef = `refs/heads/${candidate.branch}`;
    const validPullRequestRef = claims.event_name === 'pull_request' && /^refs\/pull\/[1-9][0-9]*\/(?:head|merge)$/u.test(String(claims.ref ?? ''));
    if (claims.ref !== expectedBranchRef && !validPullRequestRef) failures.push('Execution attestation: signed ref is not bound to the candidate branch or pull request');
    if (options.runReadback?.run_attempt !== undefined && String(options.runReadback.run_attempt) !== String(claims.run_attempt)) failures.push('Execution attestation: GitHub run readback attempt mismatch');
    if (options.runReadback?.run_number !== undefined && String(options.runReadback.run_number) !== String(claims.run_number)) failures.push('Execution attestation: GitHub run readback number mismatch');
  } catch (error) {
    failures.push(`Execution attestation: ${error.message}`);
  }
  if (!release) {
    const expectedEvaluator = `github-actions:pr-outcome:${attestation.workflow_run?.run_id}:${attestation.workflow_run?.run_attempt}`;
    for (const outcome of outcomes) {
      for (const evaluation of outcome.resolvedEvaluations ?? []) {
        if (evaluation.value?.evaluator?.id !== expectedEvaluator) failures.push(`Evaluation ${evaluation.value?.evaluation_id ?? '(missing)'} is not bound to the attested GitHub execution identity`);
        if (evaluation.value?.started_at !== attestation.evaluated_at || evaluation.value?.finished_at !== attestation.evaluated_at) failures.push(`Evaluation ${evaluation.value?.evaluation_id ?? '(missing)'} timestamps are not bound to the attested issuance window`);
      }
    }
  }
  return {
    path: path.relative(root, file), sha256: digest,
    attestation_id: attestation.attestation_id,
    provider: attestation.provider,
    run_id: attestation.workflow_run?.run_id,
    run_attempt: attestation.workflow_run?.run_attempt,
    ref: attestation.workflow_run?.ref,
    sha: attestation.workflow_run?.sha,
    environment: attestation.workflow_run?.environment,
  };
}

async function readRunnerProvenance(root, value, runDirectoryValue, contract, outcome, failures) {
  const file = safeFile(root, value, 'RunnerProvenanceV1', failures);
  const runDirectory = safeDirectory(root, runDirectoryValue, 'Runner run directory', failures);
  if (!file || !runDirectory || !contract || !outcome) return null;
  let provenance;
  try { provenance = readJson(file); } catch (error) { failures.push(`RunnerProvenanceV1 is invalid JSON: ${error.message}`); return null; }
  const persistedContractFile = safeFile(root, path.join(runDirectory, 'contract.json'), 'Runner persisted contract', failures);
  if (persistedContractFile) {
    try {
      const persistedContract = readJson(persistedContractFile);
      if (digestContract(persistedContract) !== digestContract(contract.value)) failures.push('Runner persisted contract does not match the exact accepted contract');
    } catch (error) { failures.push(`Runner persisted contract is invalid JSON: ${error.message}`); }
  }
  try {
    const verification = await verifyRunnerProvenance(runDirectory, contract.value, provenance, outcome.packet);
    failures.push(...verification.issues.map((issue) => `RunnerProvenanceV1: ${issue}`));
  } catch (error) {
    failures.push(`RunnerProvenanceV1 replay failed: ${error.message}`);
  }
  return {
    path: path.relative(root, file), sha256: sha256File(file),
    run_directory: path.relative(root, runDirectory), provenance_id: provenance.provenance_id ?? null,
    provenance_digest: provenance.provenance_digest ?? null,
    ledger_head_digest: provenance.ledger?.head_digest ?? null,
    event_count: provenance.ledger?.event_count ?? null,
    evaluation_digest: provenance.evaluation?.evaluation_digest ?? null,
  };
}

function evaluationFailures(outcome, contract, candidate) {
  const failures = [];
  const expectedEvaluationIds = unique(outcome.packet.evaluation_summary?.evaluation_ids ?? []);
  const verifiedArtifactIds = new Set([
    ...(outcome.resolvedEvidence ?? []).map((entry) => entry.reference.artifact_id),
    ...(outcome.resolvedEvaluations ?? []).map((entry) => entry.reference.artifact_id),
  ]);
  const contractAssertionIds = unique((contract.expected_outcome?.assertions ?? []).map((entry) => entry.id));
  const contractAssertions = new Map((contract.expected_outcome?.assertions ?? []).map((entry) => [entry.id, entry]));
  const contractRequirementIds = unique(contract.requirement_ids ?? []);
  const expectedCandidateDigest = digestObject(candidate);
  const resolved = new Map();
  if (!expectedEvaluationIds.length) failures.push('OutcomePacketV1 has no evaluation IDs to prove independent review');
  for (const entry of outcome.resolvedEvaluations ?? []) {
    if (!entry.value) {
      failures.push(`OutcomePacketV1 evaluation ${entry.path} is not JSON`);
      continue;
    }
    const validation = validateGovernanceInstance(entry.value, 'evaluation.v1.schema.json');
    if (!validation.valid) {
      failures.push(`OutcomePacketV1 evaluation ${entry.path} is not EvaluationV1: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join('; ')}`);
      continue;
    }
    const evaluation = entry.value;
    if (resolved.has(evaluation.evaluation_id)) failures.push(`OutcomePacketV1 evaluation ${evaluation.evaluation_id} is cited more than once`);
    resolved.set(evaluation.evaluation_id, evaluation);
    if (evaluation.run_id !== outcome.packet.run_id || evaluation.run_id !== contract.run_id) failures.push(`Evaluation ${evaluation.evaluation_id} run_id is not bound to the contract outcome`);
    const identityValidation = validateCandidateIdentity(evaluation.candidate_identity, { expectedRoot: candidate.root, expectedBranch: candidate.branch, requireClean: true });
    failures.push(...identityValidation.issues.map((issue) => `Evaluation ${evaluation.evaluation_id} candidate: ${issue}`));
    for (const key of ['root', 'branch', 'commit', 'tree']) {
      if (evaluation.candidate_identity?.[key] !== candidate[key]) failures.push(`Evaluation ${evaluation.evaluation_id} candidate ${key} mismatch`);
    }
    if (evaluation.candidate_digest !== expectedCandidateDigest || identityValidation.candidate_digest !== expectedCandidateDigest) failures.push(`Evaluation ${evaluation.evaluation_id} candidate digest mismatch`);
    const independence = verifyReviewerIndependence(contract, evaluation.evaluator?.id, { critical: true });
    if (evaluation.evaluator?.id === contractCreatorId(contract) || !independence.accepted) failures.push(`Evaluation ${evaluation.evaluation_id} evaluator is not independent from the contract creator`);
    if (evaluation.independence !== independence.value || ['same_actor_rejected', 'not_required'].includes(evaluation.independence)) failures.push(`Evaluation ${evaluation.evaluation_id} does not prove the required independent-review mode`);
    if (evaluation.verdict !== 'accepted' || evaluation.counts?.failed !== 0 || evaluation.counts?.blocked !== 0 || evaluation.hard_failures?.length || evaluation.score < evaluation.threshold) failures.push(`Evaluation ${evaluation.evaluation_id} is not an accepted verdict`);
    const assertionIds = unique((evaluation.assertions ?? []).map((assertion) => assertion.assertion_id));
    if (JSON.stringify(assertionIds) !== JSON.stringify(contractAssertionIds) || JSON.stringify(assertionIds) !== JSON.stringify(contractRequirementIds)) failures.push(`Evaluation ${evaluation.evaluation_id} assertion IDs do not match the aligned contract`);
    if ((evaluation.assertions ?? []).some((assertion) => assertion.result !== 'pass')) failures.push(`Evaluation ${evaluation.evaluation_id} contains a non-passing assertion`);
    const assertions = evaluation.assertions ?? [];
    const actualPassed = assertions.filter((assertion) => assertion.result === 'pass').length;
    const actualFailed = assertions.filter((assertion) => assertion.result === 'fail').length;
    const actualBlocked = assertions.filter((assertion) => assertion.result === 'blocked').length;
    if (evaluation.counts?.total !== assertions.length || evaluation.counts?.passed !== actualPassed || evaluation.counts?.failed !== actualFailed || evaluation.counts?.blocked !== actualBlocked) failures.push(`Evaluation ${evaluation.evaluation_id} counts do not match its assertions`);
    if (evaluation.threshold !== contract.evaluator?.pass_threshold) failures.push(`Evaluation ${evaluation.evaluation_id} threshold does not match the aligned contract`);
    for (const assertion of assertions) {
      const expected = contractAssertions.get(assertion.assertion_id);
      if (!expected) continue;
      if (JSON.stringify(assertion.expected) !== JSON.stringify(expected.expected)) failures.push(`Evaluation ${evaluation.evaluation_id} assertion ${assertion.assertion_id} expected value differs from the contract`);
      if (EVIDENCE_LEVELS.indexOf(assertion.evidence_level) < EVIDENCE_LEVELS.indexOf(expected.minimum_evidence_level)) failures.push(`Evaluation ${evaluation.evaluation_id} assertion ${assertion.assertion_id} evidence is below ${expected.minimum_evidence_level}`);
    }
    for (const artifactId of unique([...(evaluation.evidence_artifact_ids ?? []), ...(evaluation.assertions ?? []).flatMap((assertion) => assertion.evidence_artifact_ids ?? [])])) {
      if (!verifiedArtifactIds.has(artifactId)) failures.push(`Evaluation ${evaluation.evaluation_id} cites artifact ${artifactId} without verified indexed bytes`);
    }
    const summary = outcome.packet.evaluation_summary;
    for (const [key, observed] of Object.entries({ total_assertions: evaluation.counts?.total, passed: evaluation.counts?.passed, failed: evaluation.counts?.failed, blocked: evaluation.counts?.blocked, score: evaluation.score, threshold: evaluation.threshold })) {
      if (summary?.[key] !== observed) failures.push(`Evaluation ${evaluation.evaluation_id} ${key} does not match OutcomePacketV1 summary`);
    }
    if (JSON.stringify(unique(evaluation.hard_failures ?? [])) !== JSON.stringify(unique(summary?.hard_failures ?? []))) failures.push(`Evaluation ${evaluation.evaluation_id} hard failures do not match OutcomePacketV1 summary`);
  }
  for (const evaluationId of expectedEvaluationIds) if (!resolved.has(evaluationId)) failures.push(`OutcomePacketV1 evaluation ${evaluationId} lacks a hashed EvaluationV1 artifact`);
  for (const evaluationId of resolved.keys()) if (!expectedEvaluationIds.includes(evaluationId)) failures.push(`OutcomePacketV1 evaluation_index contains undeclared ${evaluationId}`);
  const resolvedIds = new Set(resolved.keys());
  for (const requirement of outcome.packet.requirements ?? []) {
    if (!requirement.evaluation_ids?.length || requirement.evaluation_ids.some((id) => !resolvedIds.has(id))) failures.push(`OutcomePacketV1 requirement ${requirement.requirement_id} lacks a resolved EvaluationV1`);
  }
  return failures;
}

function gitChangedPaths(root, start, end) {
  git(root, ['cat-file', '-e', `${start}^{commit}`]);
  git(root, ['cat-file', '-e', `${end}^{commit}`]);
  git(root, ['merge-base', '--is-ancestor', start, end]);
  const raw = execFileSync('git', ['diff', '--name-only', '-z', `${start}..${end}`, '--'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return unique(raw.split('\0').map(normalizedRelative).filter(Boolean));
}

function canonicalChangedPathManifest(root, contracts, outcomes, suppliedPaths, surface, failures) {
  const manifests = [];
  const sources = [];
  if (surface === 'pr_merge') {
    const records = outcomes.flatMap((outcome) => (outcome.resolvedEvidence ?? []).flatMap((entry) => {
      const provenance = entry.value?.independence?.candidate_provenance;
      return provenance ? [{ outcome, entry, provenance }] : [];
    }));
    if (records.length !== 1) failures.push('pr_merge requires exactly one hashed PR candidate_provenance evidence record');
    const record = records[0];
    if (record) {
      const { outcome, entry, provenance } = record;
      const base = provenance.base_sha;
      const end = provenance.head_sha;
      if (end !== outcome.packet.ending_head) failures.push('PR candidate_provenance head_sha does not match OutcomePacketV1 ending_head');
      try {
        const commits = git(root, ['rev-list', '--reverse', `${base}..${end}`]).split('\n').filter(Boolean);
        if (!commits.length) failures.push('PR candidate_provenance base-to-head range is empty');
        if (provenance.commit_count !== commits.length || JSON.stringify(provenance.commits) !== JSON.stringify(commits)) failures.push('PR candidate_provenance commits do not match Git readback');
        const paths = gitChangedPaths(root, base, end);
        manifests.push({ run_id: outcome.packet.run_id, source: 'pr_candidate_provenance', starting_head: base, ending_head: end, paths });
        sources.push({
          kind: 'pr_candidate_provenance', path: entry.path, sha256: entry.sha256,
          byte_sha256: entry.byte_sha256, base_sha: base, head_sha: end,
        });
      } catch (error) {
        failures.push(`PR candidate_provenance cannot derive an ancestor-bound Git changed-path manifest: ${String(error.stderr ?? error.message).trim()}`);
      }
    }
  }
  for (const contract of surface === 'pr_merge' ? [] : contracts) {
    const outcome = outcomes.find((entry) => entry.packet.run_id === contract.value.run_id);
    if (!outcome) continue;
    const start = contract.value.scope?.starting_head;
    const end = outcome.packet.ending_head;
    try {
      git(root, ['cat-file', '-e', `${start}^{commit}`]);
      git(root, ['cat-file', '-e', `${end}^{commit}`]);
      git(root, ['merge-base', '--is-ancestor', start, end]);
      const startingTree = git(root, ['rev-parse', `${start}^{tree}`]);
      const endingTree = git(root, ['rev-parse', `${end}^{tree}`]);
      if (contract.value.scope?.starting_tree !== startingTree || outcome.packet.starting_tree !== startingTree) failures.push(`Contract ${contract.value.run_id} starting tree is not the Git tree for ${start}`);
      if (outcome.packet.ending_tree !== endingTree) failures.push(`Outcome ${outcome.packet.run_id} ending tree is not the Git tree for ${end}`);
      const paths = gitChangedPaths(root, start, end);
      manifests.push({ run_id: contract.value.run_id, starting_head: start, starting_tree: startingTree, ending_head: end, ending_tree: endingTree, paths });
      sources.push({ kind: 'contract', path: contract.path, sha256: contract.sha256, starting_head: start, ending_head: end });
    } catch (error) {
      failures.push(`Contract ${contract.value.run_id ?? '(missing)'} cannot derive an ancestor-bound Git changed-path manifest: ${String(error.stderr ?? error.message).trim()}`);
    }
  }
  const canonicalPaths = manifests[0]?.paths ?? [];
  for (const manifest of manifests.slice(1)) {
    if (JSON.stringify(manifest.paths) !== JSON.stringify(canonicalPaths)) failures.push(`Contract ${manifest.run_id} changed-path manifest disagrees with the accepted candidate`);
  }
  const supplied = unique(suppliedPaths.map(normalizedRelative).filter(Boolean));
  if (JSON.stringify(supplied) !== JSON.stringify(canonicalPaths)) {
    failures.push(`Supplied changed paths do not match canonical Git manifest (supplied ${supplied.length}, canonical ${canonicalPaths.length})`);
  }
  if (!canonicalPaths.length) failures.push('acceptance requires at least one canonical Git changed path');
  return {
    paths: canonicalPaths,
    digest: digestObject({ manifest_version: 'git-diff-name-only.v1', pairs: manifests, paths: canonicalPaths, sources }),
    sources,
  };
}

export function canonicalGitChangedPaths(rootInput, startingHead, endingHead) {
  const root = fs.realpathSync(path.resolve(rootInput));
  git(root, ['cat-file', '-e', `${startingHead}^{commit}`]);
  git(root, ['cat-file', '-e', `${endingHead}^{commit}`]);
  git(root, ['merge-base', '--is-ancestor', startingHead, endingHead]);
  const raw = execFileSync('git', ['diff', '--name-only', '-z', `${startingHead}..${endingHead}`, '--'], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  return unique(raw.split('\0').map(normalizedRelative).filter(Boolean));
}

export async function validateAcceptance({
  root: rootInput, surface, changedPaths = [], outcomePaths = [], contractPaths = [],
  knowledgeReceiptPaths = [], executionAttestationPaths = [], runnerProvenancePaths = [], runDirectoryPaths = [], runDirectories = [],
  declaredProfiles = [], expectedCommit = null,
  expectedTree = null, expectedBranch = null, contextReceiptPath = null,
  evidenceLevel = null, now = new Date(), executionAttestationOptions = {},
}) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const policy = loadAdoptionPolicy(root);
  const failures = adoptionPolicyFailures(policy);
  const surfacePolicy = policy.surfaces?.[surface];
  if (!ACCEPTANCE_SURFACES.includes(surface) || surfacePolicy?.promotion !== 'governed-acceptance-only') failures.push(`unsupported acceptance surface: ${surface}`);
  const commit = expectedCommit ?? git(root, ['rev-parse', 'HEAD']);
  const tree = expectedTree ?? git(root, ['rev-parse', `${commit}^{tree}`]);
  const branch = expectedBranch ?? git(root, ['branch', '--show-current']);
  const candidate = { root, branch, commit, tree, git_status: [] };
  const acceptedRunDirectories = runDirectoryPaths.length ? runDirectoryPaths : runDirectories;
  if (!EVIDENCE_LEVELS.includes(evidenceLevel)) failures.push('acceptance requires one promotable canonical evidence level');

  if (outcomePaths.length !== 1) failures.push(`${surface} requires exactly one OutcomePacketV1`);
  const outcomes = [];
  for (const entry of outcomePaths) {
    const outcome = await readOutcome(root, entry, failures);
    if (outcome) outcomes.push(outcome);
  }
  if (contractPaths.length !== 1) failures.push(`${surface} requires exactly one exact contract`);
  const contracts = contractPaths.map((entry) => readContract(root, entry, failures)).filter(Boolean);
  const declared = unique(declaredProfiles);
  if (declared.length > 1) failures.push('acceptance permits exactly one declared loop profile');
  const selectedProfiles = unique(contracts.map((entry) => contractProfileId(entry.value)));
  if (selectedProfiles.length !== 1) failures.push('acceptance requires exactly one contract-selected loop profile');
  if (declared.length && selectedProfiles.length && declared[0] !== selectedProfiles[0]) failures.push(`Declared loop profile ${declared[0]} does not match contract profile ${selectedProfiles[0]}`);
  const selectedProfile = selectedProfiles[0] ?? declared[0] ?? 'implementation';
  const changedPathManifest = canonicalChangedPathManifest(root, contracts, outcomes, changedPaths, surface, failures);
  const classified = classifyChangedPaths(policy, changedPathManifest.paths);
  const governed = classified.filter((entry) => entry.disposition === 'governed');
  const ungoverned = classified.filter((entry) => entry.disposition !== 'governed');

  if (runnerProvenancePaths.length !== 1) failures.push(`${surface} requires exactly one persisted RunnerProvenanceV1`);
  if (acceptedRunDirectories.length !== 1) failures.push(`${surface} requires exactly one persisted runner run directory`);
  const runnerProvenance = [];
  if (contracts.length === 1 && outcomes.length === 1 && runnerProvenancePaths.length === 1 && acceptedRunDirectories.length === 1) {
    const record = await readRunnerProvenance(
      root, runnerProvenancePaths[0], acceptedRunDirectories[0], contracts[0], outcomes[0], failures,
    );
    if (record) runnerProvenance.push(record);
  }

  if (executionAttestationPaths.length !== 1) failures.push(`${surface} requires exactly one external execution attestation`);
  const executionAttestations = executionAttestationPaths
    .map((entry) => readExecutionAttestation(root, entry, outcomes, candidate, surface, failures, executionAttestationOptions))
    .filter(Boolean);

  const recallRecords = [];
  if (knowledgeReceiptPaths.length !== 1) failures.push(`${surface} requires exactly one knowledge recall receipt`);
  for (const outcome of outcomes) {
    const localFailures = [];
    const candidates = knowledgeReceiptPaths.map((entry) => readRecall(root, entry, outcome, candidate, localFailures)).filter(Boolean);
    const matching = candidates.find((entry) => entry.valid && entry.current_outcome_digest === outcome.packet.packet_digest);
    if (!matching) {
      failures.push(...localFailures);
      failures.push(`Outcome ${outcome.packet.run_id} lacks an accepted exact-digest knowledge recall receipt`);
    } else recallRecords.push({
      path: matching.path, receipt_id: matching.receipt_id,
      sha256: matching.sha256, current_outcome_digest: matching.current_outcome_digest, backend: matching.backend,
      durable_record_id: matching.durable_record_id,
      cited_source_path: matching.cited_source_path, cited_source_sha256: matching.cited_source_sha256,
    });
  }
  const knowledgeOverride = outcomes.length === 1 && recallRecords.length === 1
    ? {
      current: true,
      backend: recallRecords[0].backend,
      packet_digest: recallRecords[0].current_outcome_digest,
      stale_reasons: [],
    }
    : null;

  let contextReceipt;
  if (contextReceiptPath) {
    const file = safeFile(root, contextReceiptPath, 'Context receipt', failures);
    if (file) {
      try { contextReceipt = readJson(file); } catch (error) { failures.push(`Context receipt is invalid JSON: ${error.message}`); }
    }
  } else contextReceipt = buildContextReceipt({ root, surface, loopProfile: selectedProfile, now, candidateOverride: candidate });
  if (contextReceipt) {
    const schema = validateGovernanceInstance(contextReceipt, 'context-receipt.v1.schema.json');
    failures.push(...schema.issues.map((entry) => `Context receipt: ${entry.path} ${entry.message}`));
    if (!knowledgeOverride && contextReceipt.verdict !== 'governed') failures.push(`Context receipt is ${contextReceipt.verdict}`);
    if (contextReceipt.surface !== surface) failures.push(`Context receipt surface ${contextReceipt.surface ?? '(missing)'} does not match ${surface}`);
    if (contextReceipt.loop_profile !== selectedProfile) failures.push(`Context receipt loop profile ${contextReceipt.loop_profile ?? '(missing)'} does not match ${selectedProfile}`);
    if (!knowledgeOverride && contextReceipt.knowledge_state?.current !== true) failures.push('Context receipt knowledge state is not current for the exact candidate');
    const { receipt_digest: recordedDigest, ...unsignedReceipt } = contextReceipt;
    if (digestObject(unsignedReceipt) !== recordedDigest) failures.push('Context receipt digest does not match its content');
    for (const key of ['root', 'branch', 'commit', 'tree']) if (contextReceipt.candidate?.[key] !== candidate[key]) failures.push(`Context receipt candidate ${key} mismatch`);
  }
  const freshContext = buildContextReceipt({
    root, surface, loopProfile: selectedProfile, now, candidateOverride: candidate, knowledgeOverride,
  });
  if (freshContext.verdict !== 'governed') failures.push(...freshContext.reasons.map((entry) => `Fresh context: ${entry}`));
  if (freshContext.knowledge_state?.current !== true) failures.push('Fresh context knowledge state is not current for the exact candidate');

  for (const outcome of outcomes) {
    for (const [key, expected] of Object.entries({ root, branch, ending_head: commit, ending_tree: tree })) {
      if (outcome.packet[key] !== expected) failures.push(`OutcomePacketV1 ${key} is not bound to ${expected}`);
    }
    if ((outcome.packet.git_status ?? []).length) failures.push('OutcomePacketV1 candidate is dirty');
    if (outcome.packet.evaluation_summary?.independent_review_satisfied !== true) failures.push('OutcomePacketV1 lacks independent review');
  }

  for (const contract of contracts) {
    const profile = contractProfileId(contract.value);
    if (declared.length && profile !== declared[0]) failures.push(`Contract ${contract.value.run_id ?? '(missing)'} profile ${profile} does not match declared ${declared[0]}`);
    const outcome = outcomes.find((entry) => entry.packet.run_id === contract.value.run_id);
    if (!outcome) failures.push(`Contract ${contract.value.run_id ?? '(missing)'} has no matching outcome`);
    else {
      if (digestContract(contract.value) !== outcome.packet.contract_digest) failures.push(`Contract ${contract.value.run_id} digest does not match its outcome`);
      if (outcome.packet.starting_head !== contract.value.scope?.starting_head || outcome.packet.starting_tree !== contract.value.scope?.starting_tree) failures.push(`Contract ${contract.value.run_id} starting candidate does not match its outcome`);
      const outcomeRequirementIds = unique((outcome.packet.requirements ?? []).map((entry) => entry.requirement_id));
      if (JSON.stringify(outcomeRequirementIds) !== JSON.stringify(unique(contract.value.requirement_ids ?? []))) failures.push(`Contract ${contract.value.run_id} requirements do not match its outcome`);
      failures.push(...evaluationFailures(outcome, contract.value, candidate));
    }
    if (path.resolve(contract.value.scope?.root ?? '') !== root) failures.push(`Contract ${contract.value.run_id ?? '(missing)'} has the wrong exact root`);
    if (contract.value.scope?.branch !== branch) failures.push(`Contract ${contract.value.run_id ?? '(missing)'} has the wrong branch`);
  }

  for (const entry of governed) {
    if (!selectedProfile || !entry.rule?.allowed_profiles?.includes(selectedProfile)) {
      failures.push(`${entry.path} is not covered by an allowed loop profile (${entry.rule?.allowed_profiles?.join(', ') ?? 'none'})`);
    }
    const requiredIndex = EVIDENCE_LEVELS.indexOf(entry.rule?.minimum_evidence_level);
    const observedIndex = EVIDENCE_LEVELS.indexOf(evidenceLevel);
    if (requiredIndex < 0 || observedIndex < requiredIndex) failures.push(`${entry.path} requires ${entry.rule?.minimum_evidence_level ?? 'a configured'} evidence; observed ${evidenceLevel ?? 'none'}`);
  }

  if (ungoverned.length && governed.length) failures.push('governed and ungoverned paths are mixed in one acceptance candidate');
  const verdict = failures.length ? 'unverified' : governed.length ? 'governed' : 'ungoverned';
  const base = {
    receipt_version: '1.0.0', surface, candidate,
    changed_paths: classified.map((entry) => entry.path),
    changed_path_manifest_digest: changedPathManifest.digest,
    changed_path_manifest_sources: changedPathManifest.sources,
    governed_rules: unique(governed.map((entry) => entry.rule?.id).filter(Boolean)),
    profiles: selectedProfiles, evidence_level: evidenceLevel ?? 'local-blocked',
    contracts: contracts.map((entry) => ({
      path: entry.path, sha256: entry.sha256, run_id: entry.value.run_id,
      contract_digest: digestContract(entry.value), profile: contractProfileId(entry.value),
    })),
    outcomes: outcomes.map((entry) => ({ path: entry.path, sha256: entry.sha256, run_id: entry.packet.run_id, packet_digest: entry.packet.packet_digest })),
    runner_provenance: runnerProvenance,
    execution_attestations: executionAttestations,
    knowledge_receipts: recallRecords,
    context_receipt: freshContext,
    checks: classified.length + outcomes.length + contracts.length + runnerProvenance.length + recallRecords.length + 4,
    verdict, failures: unique(failures), created_at: now.toISOString(),
  };
  const receiptId = `acceptance_receipt_${digestObject(base).slice(0, 12)}`;
  const receipt = { ...base, receipt_id: receiptId };
  receipt.receipt_digest = digestObject(receipt);
  const schema = validateGovernanceInstance(receipt, 'acceptance-receipt.v1.schema.json');
  if (!schema.valid) throw new Error(`Acceptance receipt schema invalid: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  return receipt;
}

function receiptFileIssue(root, record, label, issues) {
  const localFailures = [];
  const file = safeFile(root, record?.path, label, localFailures);
  issues.push(...localFailures);
  if (!file) return null;
  const observed = sha256File(file);
  if (observed !== record.sha256) issues.push(`${label} stored SHA-256 does not match referenced bytes`);
  return file;
}

export async function replayAcceptanceReceipt(rootInput, receipt, options = {}) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const issues = [];
  const schema = validateGovernanceInstance(receipt, 'acceptance-receipt.v1.schema.json');
  issues.push(...schema.issues.map((entry) => `Acceptance receipt: ${entry.path} ${entry.message}`));
  const { receipt_digest: recordedDigest, ...unsignedReceipt } = receipt ?? {};
  if (digestObject(unsignedReceipt) !== recordedDigest) issues.push('Acceptance receipt digest does not match its content');
  if (receipt?.candidate?.root !== root) issues.push('Acceptance receipt candidate root differs from replay root');
  if (receipt?.verdict !== 'governed') issues.push('Acceptance receipt did not record a governed verdict');

  for (const [label, records] of [
    ['Acceptance contract', receipt?.contracts],
    ['Acceptance outcome', receipt?.outcomes],
    ['RunnerProvenanceV1', receipt?.runner_provenance],
    ['Execution attestation', receipt?.execution_attestations],
    ['Knowledge recall receipt', receipt?.knowledge_receipts],
  ]) for (const record of records ?? []) receiptFileIssue(root, record, label, issues);
  for (const record of receipt?.runner_provenance ?? []) safeDirectory(root, record.run_directory, 'Runner run directory', issues);
  for (const record of receipt?.knowledge_receipts ?? []) {
    const file = safeFile(root, record.cited_source_path, 'Knowledge durable cited source', issues);
    if (file && sha256File(file) !== record.cited_source_sha256) issues.push('Knowledge durable cited source stored SHA-256 does not match referenced bytes');
  }

  const context = receipt?.context_receipt;
  if (context) {
    const contextSchema = validateGovernanceInstance(context, 'context-receipt.v1.schema.json');
    issues.push(...contextSchema.issues.map((entry) => `Embedded context receipt: ${entry.path} ${entry.message}`));
    const { receipt_digest: contextDigest, ...unsignedContext } = context;
    if (digestObject(unsignedContext) !== contextDigest) issues.push('Embedded context receipt digest does not match its content');
    for (const key of ['root', 'branch', 'commit', 'tree']) if (context.candidate?.[key] !== receipt.candidate?.[key]) issues.push(`Embedded context receipt candidate ${key} mismatch`);
    if (context.surface !== receipt.surface) issues.push('Embedded context receipt surface mismatch');
    if (context.loop_profile !== receipt.profiles?.[0]) issues.push('Embedded context receipt loop profile mismatch');
    if (context.verdict !== 'governed' || context.knowledge_state?.current !== true) issues.push('Embedded context receipt is not a current governed context');
  } else issues.push('Acceptance receipt lacks an embedded fresh ContextReceiptV1');

  let replayed = null;
  try {
    replayed = await validateAcceptance({
      root, surface: receipt.surface, changedPaths: receipt.changed_paths,
      contractPaths: (receipt.contracts ?? []).map((entry) => entry.path),
      outcomePaths: (receipt.outcomes ?? []).map((entry) => entry.path),
      runnerProvenancePaths: (receipt.runner_provenance ?? []).map((entry) => entry.path),
      runDirectoryPaths: (receipt.runner_provenance ?? []).map((entry) => entry.run_directory),
      executionAttestationPaths: (receipt.execution_attestations ?? []).map((entry) => entry.path),
      knowledgeReceiptPaths: (receipt.knowledge_receipts ?? []).map((entry) => entry.path),
      declaredProfiles: receipt.profiles ?? [], expectedCommit: receipt.candidate?.commit,
      expectedTree: receipt.candidate?.tree, expectedBranch: receipt.candidate?.branch,
      evidenceLevel: receipt.evidence_level, now: options.now ?? new Date(),
      executionAttestationOptions: options.executionAttestationOptions ?? {},
    });
  } catch (error) { issues.push(`Acceptance replay failed: ${error.message}`); }

  if (replayed) {
    if (replayed.verdict !== 'governed') issues.push(...replayed.failures.map((entry) => `Acceptance replay: ${entry}`));
    for (const key of [
      'surface', 'candidate', 'changed_paths', 'changed_path_manifest_digest', 'changed_path_manifest_sources',
      'governed_rules', 'profiles', 'evidence_level', 'contracts', 'outcomes', 'runner_provenance',
      'execution_attestations', 'knowledge_receipts',
    ]) if (digestObject(replayed[key]) !== digestObject(receipt[key])) issues.push(`Acceptance replay semantic binding mismatch: ${key}`);
  }
  return { valid: issues.length === 0, issues: unique(issues), replayed_receipt: replayed };
}

function changedPaths(root, base, head) {
  if (!base || /^0{40}$/u.test(base)) {
    let fallback = null;
    try { fallback = git(root, ['merge-base', head, 'origin/main']); } catch { /* new repository or missing remote */ }
    if (!fallback) return list(git(root, ['show', '--pretty=', '--name-only', head]).replaceAll('\n', ','));
    base = fallback;
  }
  return list(git(root, ['diff', '--name-only', `${base}..${head}`, '--']).replaceAll('\n', ','));
}

const ZERO_OID = '0'.repeat(40);

export function parsePrePushUpdates(input) {
  const failures = [];
  const updates = [];
  const lines = String(input ?? '').split(/\r?\n/u).filter((line) => line.trim() !== '');
  if (!lines.length) failures.push('pre-push stdin contains no ref updates');
  lines.forEach((line, index) => {
    const fields = line.trim().split(/\s+/u);
    if (fields.length !== 4) {
      failures.push(`pre-push line ${index + 1} must contain exactly four fields`);
      return;
    }
    const [localRef, localSha, remoteRef, remoteSha] = fields;
    if (!/^[0-9a-f]{40}$/u.test(localSha) || !/^[0-9a-f]{40}$/u.test(remoteSha)) {
      failures.push(`pre-push line ${index + 1} contains a malformed object ID`);
      return;
    }
    updates.push({ line: index + 1, local_ref: localRef, local_sha: localSha, remote_ref: remoteRef, remote_sha: remoteSha });
  });
  const remoteRefs = updates.map((entry) => entry.remote_ref);
  if (new Set(remoteRefs).size !== remoteRefs.length) failures.push('pre-push stdin contains duplicate remote ref updates');
  if (updates.length !== 1) failures.push('pre-push requires exactly one ref update');
  return { updates, failures: unique(failures) };
}

export function evaluateLocalSteering(result, registry) {
  const degradedIds = unique(result?.degraded_surface_ids ?? []);
  const explained = new Set([
    ...(registry?.surface_groups ?? []).filter((entry) => entry.lifecycle === 'degraded').map((entry) => entry.id),
    ...(registry?.external_surfaces ?? []).filter((entry) => entry.lifecycle === 'degraded').map((entry) => entry.id),
    ...(result?.external_discovery ?? []).filter((entry) => entry.state === 'unavailable' && entry.presence_policy === 'optional').map((entry) => entry.id),
    ...(result?.observations ?? []).filter((entry) => entry.state === 'disabled').map((entry) => entry.id),
  ]);
  const unexplained = degradedIds.filter((id) => !explained.has(id));
  const staleLifecycle = (result?.freshness?.lifecycle_reviews ?? []).filter((entry) => entry.stale).map((entry) => entry.surface_id);
  const failures = [];
  if (result?.registry?.status !== 'active') failures.push('strict steering registry is not active');
  if (result?.freshness?.stale) failures.push('strict steering registry review is stale');
  if (staleLifecycle.length) failures.push(`strict steering lifecycle reviews are stale: ${staleLifecycle.join(', ')}`);
  if ((result?.drifts ?? []).length) failures.push(...result.drifts.map((entry) => `strict steering: ${entry}`));
  if (unexplained.length) failures.push(`strict steering has unexplained degraded surfaces: ${unexplained.join(', ')}`);
  if (!['pass', 'degraded'].includes(result?.verdict)) failures.push(`strict steering is ${result?.verdict ?? 'unavailable'}`);
  if (result?.verdict === 'degraded' && degradedIds.length === 0) failures.push('strict steering degraded verdict has no exact surface IDs');
  return {
    allowed: failures.length === 0,
    state: result?.verdict ?? 'unavailable',
    degraded_surface_ids: degradedIds,
    explained_degraded_surface_ids: degradedIds.filter((id) => explained.has(id)),
    unexplained_degraded_surface_ids: unexplained,
    failures: unique(failures),
  };
}

function namedRemoteHead(root, remoteName) {
  if (!/^[A-Za-z0-9._-]+$/u.test(String(remoteName ?? ''))) throw new Error('pre-push has no safe named remote');
  const headRef = `refs/remotes/${remoteName}/HEAD`;
  const symbolic = git(root, ['symbolic-ref', headRef]);
  if (!symbolic.startsWith(`refs/remotes/${remoteName}/`) || symbolic === headRef) {
    throw new Error(`named remote HEAD escapes ${remoteName}`);
  }
  return symbolic;
}

function newRemoteRefBase(root, localSha, symbolic) {
  git(root, ['cat-file', '-e', `${symbolic}^{commit}`]);
  const base = git(root, ['merge-base', localSha, symbolic]);
  if (!base) throw new Error('new remote ref base is empty');
  git(root, ['merge-base', '--is-ancestor', base, localSha]);
  return { base, source: symbolic };
}

export function buildPushPreflight({ root: rootInput, input, remoteName = null, now = new Date() }) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const parsed = parsePrePushUpdates(input);
  const failures = [...parsed.failures];
  const ranges = [];
  let candidate = null;
  try {
    const branch = git(root, ['branch', '--show-current']);
    const commit = git(root, ['rev-parse', 'HEAD']);
    const tree = git(root, ['rev-parse', 'HEAD^{tree}']);
    const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
    candidate = { root, branch, commit, tree, git_status: status ? status.split('\n') : [] };
    if (!branch) failures.push('pre-push requires a checked-out branch');
    if (candidate.git_status.length) failures.push('pre-push candidate worktree is not clean');
    for (const update of parsed.updates) {
      if (update.local_sha === ZERO_OID) { failures.push(`pre-push deletion is not locally provable: ${update.remote_ref}`); continue; }
      if (!update.local_ref.startsWith('refs/heads/')) { failures.push(`pre-push supports branch refs only: ${update.local_ref}`); continue; }
      if (!update.remote_ref.startsWith('refs/heads/')) { failures.push(`pre-push remote ref is not a branch: ${update.remote_ref}`); continue; }
      if (update.remote_ref !== update.local_ref) { failures.push(`pre-push local and remote refs must match exactly: ${update.local_ref}`); continue; }
      let remoteHead;
      try { remoteHead = namedRemoteHead(root, remoteName); }
      catch { failures.push(`pre-push cannot resolve the named remote HEAD for ${remoteName ?? 'unknown'}`); continue; }
      const targetRemoteRef = `refs/remotes/${remoteName}/${update.remote_ref.slice('refs/heads/'.length)}`;
      if (remoteHead === targetRemoteRef) { failures.push(`pre-push rejects the named remote default branch: ${update.remote_ref}`); continue; }
      try { git(root, ['check-ref-format', update.local_ref]); git(root, ['check-ref-format', update.remote_ref]); }
      catch { failures.push(`pre-push contains an invalid ref name on line ${update.line}`); continue; }
      const localBranch = update.local_ref.slice('refs/heads/'.length);
      if (localBranch !== branch || update.local_sha !== commit) {
        failures.push(`pre-push update is not the exact checked-out candidate: ${update.local_ref}`);
        continue;
      }
      try {
        git(root, ['cat-file', '-e', `${update.local_sha}^{commit}`]);
        let base = update.remote_sha;
        let baseSource = update.remote_ref;
        if (base === ZERO_OID) ({ base, source: baseSource } = newRemoteRefBase(root, update.local_sha, remoteHead));
        else {
          git(root, ['cat-file', '-e', `${base}^{commit}`]);
          git(root, ['merge-base', '--is-ancestor', base, update.local_sha]);
        }
        const commits = git(root, ['rev-list', '--reverse', `${base}..${update.local_sha}`]).split('\n').filter(Boolean);
        if (!commits.length) throw new Error('push range contains no commits');
        const paths = canonicalGitChangedPaths(root, base, update.local_sha);
        ranges.push({
          local_ref: update.local_ref, remote_ref: update.remote_ref, base_sha: base, head_sha: update.local_sha,
          base_source: baseSource, commits, changed_paths: paths,
          range_digest: digestObject({ base_sha: base, head_sha: update.local_sha, commits, changed_paths: paths }),
        });
      } catch (error) {
        failures.push(`pre-push range is missing, non-fast-forward, unrelated, or ambiguous for ${update.remote_ref}: ${String(error.stderr ?? error.message ?? error).trim()}`);
      }
    }
  } catch (error) { failures.push(`pre-push candidate identity is unavailable: ${error.message}`); }

  let steering = null;
  let steeringState = 'blocked';
  try {
    const result = runSteeringMonitor(root, { now, requirePromoted: true });
    const registry = loadSteeringRegistry(root);
    const assessment = evaluateLocalSteering(result, registry);
    steeringState = assessment.state;
    steering = {
      verdict: result.verdict, checks: result.checks, drifts: result.drifts,
      registry_sha256: result.registry.sha256, registry_semantic_digest: result.registry.semantic_digest,
      catalog_digest: result.catalog.digest, repository_manifest_sha256: result.catalog.repository_manifest_sha256,
      worktree_manifest_sha256: result.worktree.working_tree_manifest_sha256,
      degraded_surface_ids: result.degraded_surface_ids,
      explained_degraded_surface_ids: assessment.explained_degraded_surface_ids,
      unexplained_degraded_surface_ids: assessment.unexplained_degraded_surface_ids,
      limitations: result.limitations,
    };
    failures.push(...assessment.failures);
  } catch (error) { failures.push(`strict steering could not run: ${error.message}`); }
  if (ranges.length !== parsed.updates.length) failures.push('not every requested ref update has an exact local range');
  const changedPaths = unique(ranges.flatMap((entry) => entry.changed_paths));
  const policy = loadAdoptionPolicy(root);
  failures.push(...adoptionPolicyFailures(policy).map((entry) => `adoption policy: ${entry}`));
  const rawClassifications = classifyChangedPaths(policy, changedPaths);
  for (const entry of rawClassifications) {
    if (entry.disposition !== 'governed' || !entry.rule) failures.push(`ungoverned changed path: ${entry.path}`);
  }
  const classifications = rawClassifications.map((entry) => ({
    path: entry.path, disposition: entry.disposition, rule_id: entry.rule?.id ?? null,
  }));
  const base = {
    push_preflight_version: '1.0.0',
    authority: 'Local clean-candidate, Git-range, path-classification, and strict-steering evidence only.',
    governed_acceptance: false, authoritative_acceptance_surface: 'pr_merge',
    remote: { name: remoteName, location_recorded: false }, candidate, ranges, changed_paths: changedPaths,
    classifications, strict_steering: steering, failures: unique(failures),
    limitations: [
      'A local hook can be bypassed and cannot provide hosted execution or independent merge evidence.',
      'A local preflight pass is not governed acceptance, merge approval, release proof, deployment proof, or live-user proof.',
    ],
    created_at: now.toISOString(),
  };
  const result = {
    ...base,
    ok: base.failures.length === 0,
    verdict: base.failures.length
      ? 'local_preflight_blocked'
      : (steeringState === 'degraded' ? 'local_preflight_degraded' : 'local_preflight_pass'),
  };
  result.preflight_digest = digestObject(result);
  return result;
}

export function hookHealth(root) {
  const failures = [];
  const configured = (() => { try { return git(root, ['config', '--get', 'core.hooksPath']); } catch { return ''; } })();
  const hook = path.join(root, '.githooks/pre-push');
  if (configured !== '.githooks') failures.push(`core.hooksPath is ${configured || 'unset'}, expected .githooks`);
  if (!fs.existsSync(hook)) failures.push('tracked pre-push hook is missing');
  else {
    const body = fs.readFileSync(hook, 'utf8');
    if (!/adoption-guard\.mjs\s+push-preflight\b/u.test(body)) failures.push('tracked pre-push hook does not invoke bounded push-preflight');
    if (/adoption-guard\.mjs\s+push(?:\s|$)/u.test(body)) failures.push('tracked pre-push hook still invokes local governed acceptance');
    if (!(fs.statSync(hook).mode & 0o111)) failures.push('tracked pre-push hook is not executable');
  }
  return { ok: failures.length === 0, configured, hook: path.relative(root, hook), failures };
}

async function main() {
  const [command = 'context', ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const root = fs.realpathSync(path.resolve(options.root ?? process.cwd()));
  let result;
  if (command === 'context') {
    result = buildContextReceipt({ root, surface: options.surface ?? 'task_start', loopProfile: options.profile ?? 'implementation' });
    if (options.require_governed && result.verdict !== 'governed') process.exitCode = 1;
  } else if (command === 'accept') {
    if (!options.surface) throw new Error('accept requires an explicit --surface; repository-code acceptance is hosted pr_merge only');
    result = await validateAcceptance({
      root, surface: options.surface, changedPaths: list(options.changed_paths),
      outcomePaths: list(options.outcomes ?? options.outcome), contractPaths: list(options.contracts ?? options.contract),
      knowledgeReceiptPaths: list(options.knowledge_receipts ?? options.knowledge_receipt),
      executionAttestationPaths: list(options.execution_attestations ?? options.execution_attestation),
      runnerProvenancePaths: list(options.runner_provenance), runDirectoryPaths: list(options.run_directory),
      declaredProfiles: list(options.profiles ?? options.profile), expectedCommit: options.expected_sha,
      expectedTree: options.expected_tree, expectedBranch: options.expected_branch,
      contextReceiptPath: options.context_receipt, evidenceLevel: options.evidence_level,
    });
    if (result.verdict !== 'governed') process.exitCode = 1;
  } else if (command === 'push-preflight') {
    result = buildPushPreflight({ root, input: fs.readFileSync(0, 'utf8'), remoteName: options.remote_name });
    if (!result.ok) process.exitCode = 1;
  } else if (command === 'push') {
    throw new Error('push is retired because a local hook cannot produce governed acceptance; use push-preflight and hosted pr_merge');
  } else if (command === 'hooks-check') {
    result = hookHealth(root);
    if (!result.ok) process.exitCode = 1;
  } else throw new Error(`Unknown adoption guard command: ${command}`);
  if (options.json_out) writeReport(path.resolve(options.json_out), result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
