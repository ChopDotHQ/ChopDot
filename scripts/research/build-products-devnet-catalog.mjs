#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REPO_SNAPSHOT = 'docs/research/parity-repository-snapshots/2026-08-22T20-22-00Z.json';
const REGISTRY_SNAPSHOT = 'docs/research/devnet-registry-snapshots/2026-08-22T20-22-00Z.json';
const DEEP_AUDIT = 'docs/research/evidence/source-deep-audit.json';
const DECISIONS = 'docs/research/evidence/chopdot-catalog-decisions.json';
const NPM_OBSERVATION = 'docs/research/evidence/npm-package-version-observation.json';
const OUTPUT = 'docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function json(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function resolveEvidence(ref, deepByName) {
  if (ref.local_path) {
    const absolute = path.join(ROOT, ref.local_path);
    return {
      kind: 'local_worktree_file',
      path: ref.local_path,
      sha256: sha256(execFileSync('sed', ['-n', '1,$p', absolute])),
    };
  }
  const repo = deepByName.get(ref.repo);
  if (!repo) throw new Error(`Unknown deep-audit repository: ${ref.repo}`);
  const file = repo.files.find((item) => item.path === ref.path);
  if (!file) throw new Error(`Missing deep-audit file: ${ref.repo}:${ref.path}`);
  return {
    kind: 'commit_pinned_upstream_file',
    repository: repo.repository_url,
    commit: repo.commit,
    path: file.path,
    raw_url: file.raw_url,
    sha256: file.sha256,
  };
}

const [repositories, registry, audit, decisionInput, npmObservation] = await Promise.all([
  json(REPO_SNAPSHOT),
  json(REGISTRY_SNAPSHOT),
  json(DEEP_AUDIT),
  json(DECISIONS),
  json(NPM_OBSERVATION),
]);

const deepByName = new Map(audit.records.map((record) => [record.name, record]));
const decisions = decisionInput.decisions.map((decision) => ({
  ...decision,
  evidence: decision.evidence.map((ref) => resolveEvidence(ref, deepByName)),
}));

const catalog = {
  schema_version: 1,
  kind: 'parity_products_devnet_capability_catalog',
  observed_at: repositories.observed_at,
  generated_at: new Date().toISOString(),
  worktree_identity: {
    root: git('rev-parse', '--show-toplevel'),
    branch: git('branch', '--show-current'),
    head: git('rev-parse', 'HEAD'),
    dirty_paths: git('status', '--short').split('\n').filter(Boolean),
  },
  completeness: {
    repositories: repositories.reconciliation,
    repository_classifications: repositories.classification_counts,
    registry: registry.reconciliation,
    deep_audit: {
      candidate_count: audit.candidate_count,
      verified_count: audit.verified_count,
      blocked_count: audit.blocked_count,
    },
    decision_count: decisions.length,
  },
  source_artifacts: {
    repository_snapshot: { path: REPO_SNAPSHOT, sha256: repositories.snapshot_sha256 },
    registry_snapshot: { path: REGISTRY_SNAPSHOT, sha256: registry.snapshot_sha256 },
    source_deep_audit: { path: DEEP_AUDIT, sha256: audit.snapshot_sha256 },
    decision_input: { path: DECISIONS, sha256: sha256(JSON.stringify(stable(decisionInput))) },
    npm_observation: { path: NPM_OBSERVATION, sha256: sha256(JSON.stringify(stable(npmObservation))) },
  },
  network: registry.network,
  package_freshness: npmObservation,
  decisions,
  repository_records: repositories.records,
  registry_records: registry.records,
  source_audit_records: audit.records.map((record) => ({
    id: record.id,
    name: record.name,
    purpose: record.purpose,
    repository_url: record.repository_url,
    branch: record.branch,
    commit: record.commit,
    verification_status: record.verification_status,
    selected_path_count: record.selected_path_count,
    tree_path_count: record.tree_path_count,
    limitations: record.limitations,
    file_manifest_sha256: sha256(JSON.stringify(stable(record.files.map(({ path: sourcePath, sha256: fileSha }) => ({ path: sourcePath, sha256: fileSha }))))),
  })),
  limitations: [
    'Repository metadata and registry descriptions are discovery evidence; source or runtime proof is recorded separately.',
    'The registry snapshot proves the content-addressed directory at one observation time, not continuous liveness.',
    'The deep audit is a deterministic relevant-path review, not a full code or security audit.',
    'Architecture decisions are bounded to ChopDot v1 planning and do not prove implementation, deployment, or reachability.',
  ],
};

catalog.catalog_sha256 = sha256(JSON.stringify(stable(catalog)));
await writeFile(path.join(ROOT, OUTPUT), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'ok',
  output: OUTPUT,
  catalog_sha256: catalog.catalog_sha256,
  repository_records: catalog.repository_records.length,
  registry_records: catalog.registry_records.length,
  source_audits: catalog.source_audit_records.length,
  decisions: catalog.decisions.length,
}, null, 2));
