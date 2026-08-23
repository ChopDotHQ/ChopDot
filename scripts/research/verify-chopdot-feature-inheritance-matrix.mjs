#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const launchRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const canonicalRoot = '/Users/devinsonpena/ChopDot';
const matrixPath = path.join(
  launchRoot,
  'docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json',
);
const markdownPath = path.join(
  launchRoot,
  'docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md',
);
const artifactPath = path.join(
  launchRoot,
  'artifacts/agentops/feature-inheritance-matrix-verification.json',
);
const reportPath = path.join(
  launchRoot,
  'artifacts/agentops/feature-inheritance-matrix-verification.md',
);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function unique(values) {
  return new Set(values).size === values.length;
}

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const behavior = JSON.parse(
  fs.readFileSync(path.join(canonicalRoot, 'product/generated/product-behavior-map.json'), 'utf8'),
);
const cardsMarkdown = fs.readFileSync(path.join(canonicalRoot, 'product/cards.md'), 'utf8');
const renderedMarkdown = fs.readFileSync(markdownPath, 'utf8');
const sourceCardIds = [...cardsMarkdown.matchAll(/^## (P-\d+) - /gm)].map((match) => match[1]);
const matrixCardIds = matrix.cards.map((card) => card.id);
const sourcePathIds = behavior.paths.map((item) => item.id);
const matrixPathIds = matrix.paths.map((item) => item.id);
const familyIds = matrix.feature_families.map((family) => family.id);
const primaryCardIds = matrix.feature_families.flatMap((family) => family.primary_card_ids);
const evidenceIds = new Set(matrix.external_evidence.map((item) => item.id));

const digestPayload = {
  source_hashes: matrix.source_hashes,
  feature_families: matrix.feature_families,
  card_mapping: matrix.cards.map((card) => [card.id, card.primary_family_id, card.secondary_family_ids]),
  path_mapping: matrix.paths.map((item) => [item.id, item.feature_family_id]),
  external_evidence: matrix.external_evidence,
};

const currentSourceHashes = Object.fromEntries(
  Object.keys(matrix.source_hashes).map((sourcePath) => [
    sourcePath,
    fs.existsSync(sourcePath) ? sha256(fs.readFileSync(sourcePath)) : null,
  ]),
);
const familyById = Object.fromEntries(matrix.feature_families.map((family) => [family.id, family]));
const evidenceById = Object.fromEntries(matrix.external_evidence.map((item) => [item.id, item]));

const checks = {
  exact_launch_root: git(launchRoot, ['rev-parse', '--show-toplevel']) === launchRoot,
  exact_launch_branch: git(launchRoot, ['branch', '--show-current']) === 'codex/chopdot-v1-launch',
  exact_launch_head: git(launchRoot, ['rev-parse', 'HEAD']) === '3519a894efbcee5144ecb0bcb9ebc44b888a0e7f',
  canonical_identity_unchanged:
    git(canonicalRoot, ['rev-parse', '--show-toplevel']) === matrix.source_identities.canonical_product_cockpit.root
    && git(canonicalRoot, ['branch', '--show-current']) === matrix.source_identities.canonical_product_cockpit.branch
    && git(canonicalRoot, ['rev-parse', 'HEAD']) === matrix.source_identities.canonical_product_cockpit.head,
  frozen_source_hashes_unchanged: Object.entries(matrix.source_hashes)
    .every(([sourcePath, digest]) => currentSourceHashes[sourcePath] === digest),
  fifteen_feature_families: matrix.feature_families.length === 15 && unique(familyIds),
  all_35_source_cards_unique: sourceCardIds.length === 35 && unique(sourceCardIds),
  all_35_matrix_cards_unique: matrixCardIds.length === 35 && unique(matrixCardIds),
  exact_card_set: [...sourceCardIds].sort().join(',') === [...matrixCardIds].sort().join(','),
  every_card_one_primary_family:
    primaryCardIds.length === 35
    && unique(primaryCardIds)
    && [...primaryCardIds].sort().join(',') === [...matrixCardIds].sort().join(','),
  card_family_references_valid: matrix.cards.every((card) =>
    familyById[card.primary_family_id]
    && card.secondary_family_ids.every((id) => familyById[id])),
  all_42_source_paths_unique: sourcePathIds.length === 42 && unique(sourcePathIds),
  all_42_matrix_paths_unique: matrixPathIds.length === 42 && unique(matrixPathIds),
  exact_path_set: [...sourcePathIds].sort().join(',') === [...matrixPathIds].sort().join(','),
  every_path_family_valid: matrix.paths.every((item) => Boolean(familyById[item.feature_family_id])),
  six_journeys_four_zero_path_futures:
    matrix.journeys.length === 6
    && matrix.journeys.filter((journey) => journey.path_count === 0).length === 4,
  every_external_evidence_reference_resolves: matrix.feature_families.every((family) =>
    family.external_evidence_ids.every((id) => evidenceIds.has(id))),
  circlecredit_is_registry_only:
    evidenceById.circlecredit?.source_kind === 'devnet_registry'
    && evidenceById.circlecredit?.verification?.status === 'verified_directory_record',
  savings_circle_not_source_verified:
    familyById.savings_circles?.evidence_grade === 'registry_discovery',
  group_card_model_is_chopdot_original:
    familyById.group_cards_home_language?.evidence_grade === 'chopdot_original',
  emergency_direct_analog_absent:
    familyById.emergency_pots?.evidence_grade === 'no_analog_found',
  native_delivery_has_verified_source:
    familyById.native_delivery_hosting?.evidence_grade === 'verified_source',
  machine_digest_reproduces:
    sha256(JSON.stringify(digestPayload)) === matrix.matrix_digest,
  markdown_mentions_every_card: matrixCardIds.every((id) => renderedMarkdown.includes(`\`${id}\``)),
  markdown_mentions_every_path: matrixPathIds.every((id) => renderedMarkdown.includes(`\`${id}\``)),
};

const failedChecks = Object.entries(checks)
  .filter(([, passed]) => !passed)
  .map(([name]) => name);
const launchStatus = execFileSync('git', [
  '-C',
  launchRoot,
  'status',
  '--porcelain=v1',
  '-z',
]);
const artifact = {
  schema_version: 1,
  kind: 'chopdot_feature_inheritance_matrix_verification',
  executed_at: new Date().toISOString(),
  status: failedChecks.length === 0 ? 'pass' : 'fail',
  checks,
  failed_checks: failedChecks,
  exact_worktree: {
    root: git(launchRoot, ['rev-parse', '--show-toplevel']),
    branch: git(launchRoot, ['branch', '--show-current']),
    head: git(launchRoot, ['rev-parse', 'HEAD']),
    status_byte_count: launchStatus.length,
    status_sha256: sha256(launchStatus),
    status_records: launchStatus.toString('utf8').split('\0').filter(Boolean),
  },
  coverage: {
    feature_families: matrix.feature_families.length,
    cards: matrix.cards.length,
    paths: matrix.paths.length,
    journeys: matrix.journeys.length,
    future_journeys_without_paths: matrix.journeys.filter((journey) => journey.path_count === 0).length,
    external_evidence_records: matrix.external_evidence.length,
    registry_only_evidence_records: matrix.external_evidence.filter((item) => item.source_kind === 'devnet_registry').length,
  },
  matrix_digest: matrix.matrix_digest,
  matrix_sha256: sha256(fs.readFileSync(matrixPath)),
  markdown_sha256: sha256(fs.readFileSync(markdownPath)),
  source_hashes_expected: matrix.source_hashes,
  source_hashes_observed: currentSourceHashes,
  conclusions: {
    platform_rails_cover_native_delivery_and_core_adapter_needs: true,
    every_chopdot_feature_has_a_source_verified_external_donor: false,
    savings_circle_has_only_registry_level_direct_analog: true,
    group_cards_are_chopdot_product_synthesis: true,
    future_mode_behavior_maps_are_complete: false,
    implementation_or_deployment_proven_by_this_artifact: false,
  },
};

fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
fs.writeFileSync(
  reportPath,
  [
    '# Feature inheritance matrix verification',
    '',
    `Status: **${artifact.status.toUpperCase()}**`,
    '',
    `- Exact worktree: \`${artifact.exact_worktree.root}\``,
    `- Branch/HEAD: \`${artifact.exact_worktree.branch}\` @ \`${artifact.exact_worktree.head}\``,
    `- Coverage: ${artifact.coverage.feature_families} families, ${artifact.coverage.cards} cards, ${artifact.coverage.paths} paths, ${artifact.coverage.journeys} journeys`,
    `- Zero-path future journeys: ${artifact.coverage.future_journeys_without_paths}`,
    `- Matrix digest: \`${artifact.matrix_digest}\``,
    `- Failed checks: ${failedChecks.length ? failedChecks.join(', ') : 'none'}`,
    '',
    'This verifies research coverage and evidence classification. It does not prove feature implementation, integration, deployment, or user reachability.',
    '',
  ].join('\n'),
);

process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
process.exitCode = failedChecks.length === 0 ? 0 : 2;
