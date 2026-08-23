#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXPECTED_ROOT = '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch';
const EXPECTED_BRANCH = 'codex/chopdot-v1-launch';
const EXPECTED_CONTACT_AGGREGATE = 'c434a9f5f405f942db0f6d96cc67013094e48514cdba15d6096ef21f9d34e345';
const AUTOBOTS_POLICY = '/Users/devinsonpena/.codex/worktrees/24f9/AutoBots/agentops/registry/repo_graph_integration_policies.json';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function fileHash(relativeOrAbsolute) {
  return digest(await readFile(path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(ROOT, relativeOrAbsolute)));
}

async function json(relativeOrAbsolute) {
  return JSON.parse(await readFile(path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(ROOT, relativeOrAbsolute), 'utf8'));
}

function payloadHash(payload, field) {
  const copy = structuredClone(payload);
  delete copy[field];
  return digest(JSON.stringify(stable(copy)));
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

const paths = {
  catalog: 'docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json',
  repositories: 'docs/research/parity-repository-snapshots/2026-08-22T20-22-00Z.json',
  registry: 'docs/research/devnet-registry-snapshots/2026-08-22T20-22-00Z.json',
  audit: 'docs/research/evidence/source-deep-audit.json',
  decisions: 'docs/research/evidence/chopdot-catalog-decisions.json',
  recall: 'artifacts/agentops/catalog-kgv2-recall.json',
  repoGraph: 'artifacts/agentops/catalog-repo-graph-packet.json',
  integration: 'artifacts/agentops/catalog-integration-preflight.json',
  contactSuite: 'artifacts/agentops/catalog-contact-suite.json',
};

const [catalog, repositories, registry, audit, decisions, recall, repoGraph, integration, contactSuite, policies] = await Promise.all([
  json(paths.catalog), json(paths.repositories), json(paths.registry), json(paths.audit), json(paths.decisions),
  json(paths.recall), json(paths.repoGraph), json(paths.integration), json(paths.contactSuite), json(AUTOBOTS_POLICY),
]);

const checks = {};
const details = {};
checks.exact_root = git('rev-parse', '--show-toplevel') === EXPECTED_ROOT;
checks.exact_branch = git('branch', '--show-current') === EXPECTED_BRANCH;
checks.exact_head = git('rev-parse', 'HEAD') === '3519a894efbcee5144ecb0bcb9ebc44b888a0e7f';

checks.repository_reconciliation = repositories.reconciliation.exact_match
  && repositories.records.length === 775
  && new Set(repositories.records.map((item) => item.id)).size === 775;
checks.registry_reconciliation = registry.reconciliation.exact_match
  && registry.records.length === 249
  && new Set(registry.records.map((item) => item.id)).size === 249
  && Object.values(registry.reconciliation.status_counts).reduce((a, b) => a + b, 0) === 249;
checks.deep_audit_reconciliation = audit.candidate_count === 36 && audit.verified_count === 36 && audit.blocked_count === 0;

checks.repository_snapshot_digest = payloadHash(repositories, 'snapshot_sha256') === repositories.snapshot_sha256;
checks.registry_snapshot_digest = payloadHash(registry, 'snapshot_sha256') === registry.snapshot_sha256;
const auditWithoutDigest = structuredClone(audit);
delete auditWithoutDigest.snapshot_sha256;
checks.deep_audit_digest = digest(JSON.stringify(auditWithoutDigest)) === audit.snapshot_sha256;
checks.catalog_digest = payloadHash(catalog, 'catalog_sha256') === catalog.catalog_sha256;

const requiredDecisionFields = [
  'id', 'name', 'classification', 'capability', 'authority_boundary', 'persistence_recovery',
  'network_version', 'license_reuse', 'maintenance_security', 'verification_status', 'confidence',
  'decision', 'prerequisites', 'falsifier', 'next_check', 'evidence',
];
checks.decision_schema = decisions.decisions.length === 16
  && decisions.decisions.every((item) => requiredDecisionFields.every((field) => Object.hasOwn(item, field)));
checks.catalog_universes_complete = catalog.repository_records.length === 775
  && catalog.registry_records.length === 249
  && catalog.source_audit_records.length === 36
  && catalog.decisions.length === 16;

const auditFiles = new Map();
for (const record of audit.records) {
  for (const file of record.files) {
    auditFiles.set(`${record.repository_url}@${record.commit}:${file.path}`, file.sha256);
  }
}
let evidenceOk = true;
let evidenceCount = 0;
for (const decision of catalog.decisions) {
  for (const evidence of decision.evidence) {
    evidenceCount += 1;
    if (evidence.kind === 'local_worktree_file') {
      evidenceOk &&= (await fileHash(evidence.path)) === evidence.sha256;
    } else {
      evidenceOk &&= auditFiles.get(`${evidence.repository}@${evidence.commit}:${evidence.path}`) === evidence.sha256;
    }
  }
}
checks.all_decision_evidence_resolves = evidenceOk;
details.decision_evidence_count = evidenceCount;

const readPath = recall.read_path;
const recalledPacket = recall.context_graph_v2?.packet ?? {};
const citations = recalledPacket.citations ?? [];
checks.kgv2_active_no_fallback = readPath.active_path === 'context_graph_v2' && readPath.fallback_used === false;
checks.kgv2_facts_and_citations = (recalledPacket.facts?.length ?? 0) > 0 && citations.length > 0;
checks.kgv2_exact_citations = citations.every((item) => item.source_ref.startsWith(`${EXPECTED_ROOT}/`) && item.verification?.status === 'verified');
checks.kgv2_two_adoption_decisions = citations.filter((item) => item.source_ref.endsWith('docs/research/CHOPDOT_PLATFORM_ADOPTION_DECISIONS.md')).length >= 2;
details.kgv2_fact_count = recalledPacket.facts?.length ?? 0;
details.kgv2_citation_count = citations.length;
details.kgv2_source_paths = [...new Set(citations.map((item) => item.source_ref))];

checks.repo_graph_exact_identity = repoGraph.identity.root === EXPECTED_ROOT
  && repoGraph.identity.branch === EXPECTED_BRANCH
  && repoGraph.identity.commit === '3519a894efbcee5144ecb0bcb9ebc44b888a0e7f';
checks.repo_graph_working = repoGraph.deployment.status === 'working' && repoGraph.deployment.ingestion.status === 'pass';
checks.repo_graph_packet_digest = typeof repoGraph.packet_digest === 'string' && repoGraph.packet_digest.length === 64;
details.repo_graph_packet_digest = repoGraph.packet_digest;
details.repo_graph_digest = repoGraph.graph_digest;

checks.integration_preflight = integration.status === 'pass' && integration.findings.length === 0
  && Object.values(integration.checks).every(Boolean);
checks.contact_suite = contactSuite.status === 'pass' && contactSuite.passed === 8 && contactSuite.failed === 0;

const contactPaths = [
  'src/contacts/verifiedContact.ts',
  'src/contacts/verifiedContact.test.ts',
  'src/contacts/verifiedContactLink.ts',
  'src/contacts/verifiedContactLink.test.ts',
  'src/contacts/verifiedContactRepository.ts',
  'src/contacts/verifiedContactRepository.test.ts',
  'src/contacts/verifiedContactCeremonyService.ts',
  'src/contacts/verifiedContactCeremonyService.test.ts',
  'tests/fixtures/verifiedContactFixture.ts',
];
const contactManifest = [];
for (const sourcePath of contactPaths) contactManifest.push(`${sourcePath} ${await fileHash(sourcePath)}`);
const aggregate = digest(`${contactManifest.join('\n')}\n`);
checks.verified_contact_aggregate = aggregate === EXPECTED_CONTACT_AGGREGATE;
details.verified_contact_manifest = contactManifest;
details.verified_contact_aggregate = aggregate;
checks.verified_contact_resolvers_absent = spawnSync('test', ['!', '-e', path.join(ROOT, 'src/contacts/verifiedContactResolvers.ts')]).status === 0;

const policyIds = new Set(policies.rules.map((item) => item.rule_id));
checks.semantic_policies_present = policyIds.has('chopdot-verified-contact-is-not-membership-authority')
  && policyIds.has('chopdot-contact-proof-is-not-organizer-proof');

const protectedDiff = git(
  'diff', '--name-only', 'HEAD', '--', 'package.json', 'package-lock.json', 'src/**/*.tsx',
  'src/membership/**', 'src/money/**', 'src/payments/**', 'src/environment/accountBoundKeyEnvelope*',
);
checks.protected_tracked_paths_unchanged = protectedDiff === '';
details.protected_tracked_diff = protectedDiff.split('\n').filter(Boolean);
details.complete_git_status = git('status', '--porcelain=v1', '-uall').split('\n').filter(Boolean);

const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const result = {
  schema_version: 1,
  kind: 'products_devnet_catalog_verification',
  verified_at: new Date().toISOString(),
  status: failures.length ? 'fail' : 'pass',
  checks,
  failures,
  details,
};
await writeFile(path.join(ROOT, 'artifacts/agentops/catalog-machine-verification.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 2 : 0;
