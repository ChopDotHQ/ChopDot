#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const launchRoot = path.resolve(scriptDir, '../..');
const canonicalRoot = '/Users/devinsonpena/ChopDot';

const inputPath = path.join(
  launchRoot,
  'docs/research/evidence/chopdot-feature-family-mapping-input.json',
);
const decisionsPath = path.join(
  launchRoot,
  'docs/research/evidence/chopdot-catalog-decisions.json',
);
const deepAuditPath = path.join(
  launchRoot,
  'docs/research/evidence/source-deep-audit.json',
);
const catalogPath = path.join(
  launchRoot,
  'docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json',
);
const cardsPath = path.join(canonicalRoot, 'product/cards.md');
const behaviorPath = path.join(
  canonicalRoot,
  'product/generated/product-behavior-map.json',
);

const outputJsonPath = path.join(
  launchRoot,
  'docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json',
);
const outputMarkdownPath = path.join(
  launchRoot,
  'docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.md',
);
const sourceSnapshotPath = path.join(
  launchRoot,
  'docs/research/evidence/chopdot-product-cockpit-source-snapshot.json',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256Bytes(fs.readFileSync(filePath));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function gitText(root, args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function gitIdentity(root) {
  const statusBuffer = execFileSync('git', [
    '-C',
    root,
    'status',
    '--porcelain=v1',
    '-z',
  ]);
  return {
    root: gitText(root, ['rev-parse', '--show-toplevel']),
    branch: gitText(root, ['branch', '--show-current']),
    head: gitText(root, ['rev-parse', 'HEAD']),
    dirty: statusBuffer.length > 0,
    status_byte_count: statusBuffer.length,
    status_sha256: sha256Bytes(statusBuffer),
    status_records: statusBuffer
      .toString('utf8')
      .split('\0')
      .filter(Boolean),
  };
}

function yamlScalar(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  const raw = match[1].trim();
  if (raw === '[]') return [];
  if (raw === 'null') return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return JSON.parse(raw);
  }
  return raw;
}

function parseCards(markdown) {
  const cards = [];
  const pattern = /^## (P-\d+) - ([^\n]+)\n\n```yaml\n([\s\S]*?)\n```/gm;
  let match;
  while ((match = pattern.exec(markdown)) !== null) {
    const [, headingId, headingTitle, block] = match;
    const line = markdown.slice(0, match.index).split('\n').length;
    const id = yamlScalar(block, 'id');
    const title = yamlScalar(block, 'title');
    if (id !== headingId || title !== headingTitle) {
      throw new Error(`Card heading/YAML mismatch at ${headingId}`);
    }
    cards.push({
      id,
      title,
      type: yamlScalar(block, 'type'),
      status: yamlScalar(block, 'status'),
      scope: yamlScalar(block, 'scope'),
      module: yamlScalar(block, 'module'),
      journey: yamlScalar(block, 'journey'),
      pillar: yamlScalar(block, 'pillar'),
      priority: yamlScalar(block, 'priority'),
      evidence_quality: yamlScalar(block, 'evidence_quality'),
      blocker: yamlScalar(block, 'blocker'),
      one_next_action: yamlScalar(block, 'one_next_action'),
      next_action: yamlScalar(block, 'next_action'),
      total_score: yamlScalar(block, 'total_score'),
      last_touched: yamlScalar(block, 'last_touched'),
      source_ref: `${cardsPath}:${line}`,
    });
  }
  return cards;
}

function walkObjects(value, visitor) {
  if (!value || typeof value !== 'object') return;
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkObjects(item, visitor));
  } else {
    Object.values(value).forEach((item) => walkObjects(item, visitor));
  }
}

function findObjectById(root, id) {
  let found = null;
  walkObjects(root, (candidate) => {
    if (!found && candidate.id === id) found = candidate;
  });
  return found;
}

function markdownCell(value) {
  const rendered = Array.isArray(value) ? value.join(', ') : String(value ?? '—');
  return rendered.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function evidenceLabel(record) {
  if (record.source_kind === 'catalog_decision') {
    return `${record.name} (${record.decision})`;
  }
  return `${record.label}.dot (registry only)`;
}

function buildMarkdown(matrix) {
  const lines = [];
  lines.push('# ChopDot Feature Inheritance and External Analog Matrix', '');
  lines.push(`Generated: ${matrix.generated_at}`, '');
  lines.push('## Result', '');
  lines.push(
    'The platform catalog covers the main native rails ChopDot needs, but it does **not** contain a source-verified donor for every ChopDot feature. Native delivery/hosting has direct source evidence. Most money-product families have indirect infrastructure or lifecycle patterns. Group cards and the domain rules for normal pots, savings circles, emergency pots, and community funds remain ChopDot-owned product work.',
    '',
  );
  lines.push(
    'CircleCredit is a useful lead, not a solved inheritance path: the content-addressed directory verifies a live listing whose description mentions lending circles, but its source, license, protocol, recovery, and runtime claims were not inspected in this slice.',
    '',
  );
  lines.push('## Source identities', '');
  lines.push('| Role | Root | Branch | HEAD | Dirty | Complete status evidence |', '|---|---|---|---|---:|---|');
  for (const [role, identity] of Object.entries(matrix.source_identities)) {
    lines.push(
      `| ${markdownCell(role)} | \`${markdownCell(identity.root)}\` | \`${markdownCell(identity.branch)}\` | \`${markdownCell(identity.head)}\` | ${identity.dirty} | ${identity.status_records.length} records; ${identity.status_byte_count} bytes; SHA-256 \`${identity.status_sha256}\` |`,
    );
  }
  lines.push('', 'The canonical cockpit is a dirty, separate checkout. Its records below are a hashed read-only source snapshot; they are not represented as committed launch-worktree state.', '');

  lines.push('## Coverage', '');
  lines.push('| Measure | Result |', '|---|---:|');
  lines.push(`| Feature families | ${matrix.summary.feature_families} |`);
  lines.push(`| Current product cards mapped | ${matrix.summary.cards_mapped}/${matrix.summary.cards_source} |`);
  lines.push(`| Current generated behavior paths mapped | ${matrix.summary.paths_mapped}/${matrix.summary.paths_source} |`);
  lines.push(`| Current generated journeys | ${matrix.summary.journeys_source} |`);
  lines.push(`| Future journey families with zero generated paths | ${matrix.summary.future_journeys_without_paths} |`);
  for (const [grade, count] of Object.entries(matrix.summary.feature_families_by_evidence_grade)) {
    lines.push(`| Families graded \`${grade}\` | ${count} |`);
  }
  lines.push(`| Ordered matrix digest | \`${matrix.matrix_digest}\` |`, '');

  lines.push('## Evidence grades', '');
  for (const [grade, definition] of Object.entries(matrix.evidence_grades)) {
    lines.push(`- \`${grade}\`: ${definition}`);
  }
  lines.push('');

  lines.push('## Feature-family decisions', '');
  lines.push('| Disposition | Feature family | Evidence | What we can inherit | One Chop Core must still own | Missing experiment |', '|---|---|---|---|---|---|');
  for (const family of matrix.feature_families) {
    const evidence = family.external_evidence_ids
      .map((id) => evidenceLabel(matrix.external_evidence_by_id[id]))
      .join('; ');
    lines.push(
      `| ${family.disposition.toUpperCase()} | **${markdownCell(family.name)}** (\`${family.id}\`) | ${markdownCell(family.evidence_grade)}: ${markdownCell(evidence)} | ${markdownCell(family.what_is_reusable)} | ${markdownCell(family.one_chop_core_requirement)} | ${markdownCell(family.missing_experiment)} |`,
    );
  }
  lines.push('');

  lines.push('## What the external projects actually contribute', '');
  lines.push('| Evidence ID | Level | Observed contribution | License/reuse boundary | Source |', '|---|---|---|---|---|');
  for (const evidence of matrix.external_evidence) {
    if (evidence.source_kind === 'catalog_decision') {
      const source = evidence.evidence
        .map((item) => item.repo ? `${item.repo}@${item.commit ?? 'unknown'}:${item.path}` : item.local_path)
        .join('; ');
      lines.push(
        `| \`${evidence.id}\` | verified source / bounded decision | ${markdownCell(evidence.capability)} Decision: \`${evidence.decision}\`. | ${markdownCell(evidence.license_reuse)} | ${markdownCell(source)} |`,
      );
    } else {
      lines.push(
        `| \`${evidence.id}\` | registry discovery only | ${markdownCell(evidence.description)} | Unknown until source is linked and inspected. | ${markdownCell(evidence.domain)}; CID \`${evidence.contenthash}\`; catalog row \`${evidence.source_id}\` |`,
      );
    }
  }
  lines.push('');

  lines.push('## Every current product card', '');
  lines.push('| Card | Status | Primary family | Secondary families | Evidence quality | One next action | Source |', '|---|---|---|---|---|---|---|');
  for (const card of matrix.cards) {
    lines.push(
      `| \`${card.id}\` ${markdownCell(card.title)} | ${markdownCell(card.status)} | \`${card.primary_family_id}\` | ${markdownCell(card.secondary_family_ids)} | ${markdownCell(card.evidence_quality)} | ${markdownCell(card.one_next_action ?? card.next_action)} | \`${markdownCell(card.source_ref)}\` |`,
    );
  }
  lines.push('');

  lines.push('## Every current generated behavior path', '');
  lines.push('| Path | Journey | Action | Family | Implementation | Proof | Risk | Owner cards |', '|---|---|---|---|---|---|---|---|');
  for (const item of matrix.paths) {
    lines.push(
      `| \`${item.id}\` ${markdownCell(item.title)} | ${markdownCell(item.journeyId)} | \`${markdownCell(item.action)}\` | \`${item.feature_family_id}\` | ${markdownCell(item.implementationStatus)} | ${markdownCell(item.proofStatus)} | ${markdownCell(item.risk)} | ${markdownCell(item.ownerCards)} |`,
    );
  }
  lines.push('');

  lines.push('## Journey-map gaps that remain explicit', '');
  lines.push('| Journey | Status | Generated paths | Consequence |', '|---|---|---:|---|');
  for (const journey of matrix.journeys) {
    const consequence = journey.path_count === 0
      ? 'The product family exists in cards/specs, but the generated behavior map has no executable path coverage.'
      : 'Generated paths exist; implementation and proof states remain path-specific above.';
    lines.push(`| \`${journey.id}\` ${markdownCell(journey.title)} | ${markdownCell(journey.status)} | ${journey.path_count} | ${consequence} |`);
  }
  lines.push('');

  lines.push('## Plan consequence', '');
  lines.push(
    '1. Keep One Chop Core, recovery, exact-money, normal-pot lifecycle, capture, and group-card comprehension in the immediate product lane.',
    '2. Use Product SDK, host simulation, Statement Store, host storage, DotNS, and (only after its experiment) Bulletin as replaceable rails.',
    '3. Treat CircleCredit, PublicResearch, OpenDocs, PolkaNote, dot-drive, Peoplebook, and DripStream as discovery queues until their source and runtime contracts are audited.',
    '4. Do not claim savings circles, emergency pots, community funds, or Spend Card comprehensively mapped: their generated journeys currently contain zero paths.',
    '5. Re-review the deployment plan only after it consumes this matrix and assigns each missing experiment to an acceptance gate.',
    '',
  );

  lines.push('## Product gate and documentation impact', '');
  lines.push(
    'No user-facing UI was changed, so the scored product gate is not applicable. This research does not change a product or architecture decision; it makes the current evidence boundary explicit. A later adapter or One Chop Core adoption decision must update the relevant source wiki/ADR and regenerate its read models.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

const mapping = readJson(inputPath);
const decisions = readJson(decisionsPath);
const deepAudit = readJson(deepAuditPath);
const catalog = readJson(catalogPath);
const behavior = readJson(behaviorPath);
const cardsMarkdown = fs.readFileSync(cardsPath, 'utf8');
const cards = parseCards(cardsMarkdown);

const familyIds = new Set(mapping.feature_families.map((family) => family.id));
if (familyIds.size !== mapping.feature_families.length) {
  throw new Error('Duplicate feature family ID');
}

const primaryCardToFamily = new Map();
for (const family of mapping.feature_families) {
  for (const cardId of family.primary_card_ids) {
    if (primaryCardToFamily.has(cardId)) {
      throw new Error(`Card ${cardId} has multiple primary families`);
    }
    primaryCardToFamily.set(cardId, family.id);
  }
}

const cardIds = new Set(cards.map((card) => card.id));
if (cards.length !== 35 || cardIds.size !== cards.length) {
  throw new Error(`Expected 35 unique cards, got ${cards.length}/${cardIds.size}`);
}
const missingPrimaryCards = cards.filter((card) => !primaryCardToFamily.has(card.id));
const unknownPrimaryCards = [...primaryCardToFamily.keys()].filter((id) => !cardIds.has(id));
if (missingPrimaryCards.length || unknownPrimaryCards.length) {
  throw new Error(
    `Primary card coverage failure: missing=${missingPrimaryCards.map((card) => card.id)} unknown=${unknownPrimaryCards}`,
  );
}

const resolvedCards = cards.map((card) => ({
  ...card,
  primary_family_id: primaryCardToFamily.get(card.id),
  secondary_family_ids: mapping.feature_families
    .filter((family) => family.related_card_ids.includes(card.id))
    .map((family) => family.id),
}));

const deepAuditByName = new Map(deepAudit.records.map((record) => [record.name, record]));
const decisionById = new Map(decisions.decisions.map((decision) => [decision.id, decision]));
const resolvedEvidence = mapping.external_evidence.map((descriptor) => {
  if (descriptor.source_kind === 'catalog_decision') {
    const decision = decisionById.get(descriptor.source_id);
    if (!decision) throw new Error(`Missing decision evidence ${descriptor.source_id}`);
    return {
      id: descriptor.id,
      source_kind: descriptor.source_kind,
      source_id: descriptor.source_id,
      name: decision.name,
      capability: decision.capability,
      decision: decision.decision,
      verification_status: decision.verification_status,
      confidence: decision.confidence,
      license_reuse: decision.license_reuse,
      evidence: decision.evidence.map((item) => {
        if (!item.repo) return item;
        const audit = deepAuditByName.get(item.repo);
        if (!audit) throw new Error(`No pinned audit record for ${item.repo}`);
        return { ...item, commit: audit.commit, source_audit_id: audit.id };
      }),
    };
  }
  if (descriptor.source_kind === 'devnet_registry') {
    const record = findObjectById(catalog, descriptor.source_id);
    if (!record) throw new Error(`Missing registry evidence ${descriptor.source_id}`);
    return {
      id: descriptor.id,
      source_kind: descriptor.source_kind,
      source_id: descriptor.source_id,
      label: record.label,
      domain: record.domain,
      url: record.url,
      contenthash: record.contenthash,
      alive: record.alive,
      description: record.source_record?.description ?? null,
      verification: record.verification,
      source_snapshot: 'docs/research/devnet-registry-snapshots/2026-08-22T20-22-00Z.json',
    };
  }
  throw new Error(`Unknown evidence source kind ${descriptor.source_kind}`);
});
const externalEvidenceById = Object.fromEntries(resolvedEvidence.map((item) => [item.id, item]));

for (const family of mapping.feature_families) {
  if (!(family.evidence_grade in mapping.evidence_grades)) {
    throw new Error(`Unknown evidence grade ${family.evidence_grade}`);
  }
  for (const evidenceId of family.external_evidence_ids) {
    if (!externalEvidenceById[evidenceId]) {
      throw new Error(`Family ${family.id} references unknown evidence ${evidenceId}`);
    }
  }
  for (const sourcePath of family.chopdot_source_paths) {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Family ${family.id} references missing ChopDot source ${sourcePath}`);
    }
  }
}

const behaviorPathIds = new Set(behavior.paths.map((item) => item.id));
const mappedPathIds = new Set(Object.keys(mapping.path_family_map));
if (behavior.paths.length !== 42 || behaviorPathIds.size !== 42 || mappedPathIds.size !== 42) {
  throw new Error(
    `Expected 42 unique source and mapped paths, got source=${behavior.paths.length}/${behaviorPathIds.size} mapped=${mappedPathIds.size}`,
  );
}
const missingPaths = [...behaviorPathIds].filter((id) => !mappedPathIds.has(id));
const unknownPaths = [...mappedPathIds].filter((id) => !behaviorPathIds.has(id));
if (missingPaths.length || unknownPaths.length) {
  throw new Error(`Path coverage failure: missing=${missingPaths} unknown=${unknownPaths}`);
}
const resolvedPaths = behavior.paths.map((item) => {
  const featureFamilyId = mapping.path_family_map[item.id];
  if (!familyIds.has(featureFamilyId)) {
    throw new Error(`Path ${item.id} references unknown family ${featureFamilyId}`);
  }
  return { ...item, feature_family_id: featureFamilyId };
});

const sourcePaths = [
  cardsPath,
  path.join(canonicalRoot, 'product/story-map.md'),
  path.join(canonicalRoot, 'product/path-model.yaml'),
  behaviorPath,
  path.join(canonicalRoot, 'docs/chopdot-dot/holy-grail-capability-inheritance-register-2026-08-12.md'),
  path.join(canonicalRoot, 'docs/CHOPDOT_MAIN_APP_SHELL_HOLY_GRAIL_ANALYSIS_2026-08-03.md'),
  path.join(canonicalRoot, 'docs/superpowers/plans/2026-08-13-batch-5-spending-group-cards.md'),
  path.join(canonicalRoot, 'docs/chopdot-dot/savings-circle-spec.md'),
  path.join(canonicalRoot, 'docs/chopdot-dot/emergency-pot-spec.md'),
  path.join(canonicalRoot, 'docs/chopdot-dot/community-fund-spec.md'),
  path.join(canonicalRoot, 'docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md'),
  path.join(canonicalRoot, 'docs/chopdot-dot/path-to-fully-native.md'),
  inputPath,
  decisionsPath,
  deepAuditPath,
  catalogPath,
];
const sourceHashes = Object.fromEntries(sourcePaths.map((filePath) => [filePath, sha256File(filePath)]));
const sourceIdentities = {
  canonical_product_cockpit: gitIdentity(canonicalRoot),
  launch_output_target: gitIdentity(launchRoot),
};

const sourceSnapshot = {
  schema_version: 1,
  kind: 'chopdot_product_cockpit_read_only_source_snapshot',
  generated_at: new Date().toISOString(),
  authority_boundary: 'Derived facts from a separately identified dirty canonical checkout; not committed launch-worktree truth.',
  source_identity: sourceIdentities.canonical_product_cockpit,
  source_hashes: sourceHashes,
  cards: resolvedCards,
  journeys: behavior.journeys.map((journey) => ({
    id: journey.id,
    title: journey.title,
    status: journey.status,
    ownerCard: journey.ownerCard,
    path_count: journey.paths.length,
  })),
  paths: resolvedPaths,
  behavior_summary: behavior.summary,
  behavior_validation: behavior.validation,
};
writeJson(sourceSnapshotPath, sourceSnapshot);

const gradeCounts = Object.fromEntries(
  Object.keys(mapping.evidence_grades).map((grade) => [
    grade,
    mapping.feature_families.filter((family) => family.evidence_grade === grade).length,
  ]),
);
const journeys = behavior.journeys.map((journey) => ({
  id: journey.id,
  title: journey.title,
  status: journey.status,
  owner_card: journey.ownerCard,
  path_count: journey.paths.length,
  feature_family_ids: mapping.feature_families
    .filter((family) => family.generated_journey_ids.includes(journey.id))
    .map((family) => family.id),
}));

const digestPayload = {
  source_hashes: sourceHashes,
  feature_families: mapping.feature_families,
  card_mapping: resolvedCards.map((card) => [card.id, card.primary_family_id, card.secondary_family_ids]),
  path_mapping: resolvedPaths.map((item) => [item.id, item.feature_family_id]),
  external_evidence: resolvedEvidence,
};
const matrix = {
  schema_version: 1,
  kind: 'chopdot_feature_inheritance_and_external_analog_matrix',
  generated_at: new Date().toISOString(),
  programme: 'Programme B - product/platform research',
  authority_boundary: mapping.authority_boundary,
  source_identities: sourceIdentities,
  source_hashes: sourceHashes,
  source_snapshot: path.relative(launchRoot, sourceSnapshotPath),
  evidence_grades: mapping.evidence_grades,
  summary: {
    feature_families: mapping.feature_families.length,
    cards_source: cards.length,
    cards_mapped: resolvedCards.length,
    paths_source: behavior.paths.length,
    paths_mapped: resolvedPaths.length,
    journeys_source: journeys.length,
    future_journeys_without_paths: journeys.filter((journey) => journey.path_count === 0).length,
    feature_families_by_evidence_grade: gradeCounts,
    card_statuses: Object.fromEntries(
      [...new Set(resolvedCards.map((card) => card.status))]
        .sort()
        .map((status) => [status, resolvedCards.filter((card) => card.status === status).length]),
    ),
    path_proof: behavior.summary.proof,
    path_risk: behavior.summary.risk,
  },
  feature_families: mapping.feature_families,
  external_evidence: resolvedEvidence,
  external_evidence_by_id: externalEvidenceById,
  cards: resolvedCards,
  paths: resolvedPaths,
  journeys,
  matrix_digest: sha256Bytes(JSON.stringify(digestPayload)),
  limitations: [
    'The canonical cockpit source is dirty and separate from the launch output worktree.',
    'Commit-pinned source audit inspected selected paths; it was not a full security audit.',
    'Devnet registry rows verify indexed content-addressed records, not source, runtime claims, security, or licenses.',
    'An external analog does not prove the corresponding ChopDot feature is implemented, tested, integrated, deployed, or reachable.',
    'Four product journey families currently have zero paths in the generated behavior map.',
  ],
};

writeJson(outputJsonPath, matrix);
fs.writeFileSync(outputMarkdownPath, buildMarkdown(matrix));

process.stdout.write(`${JSON.stringify({
  output_json: outputJsonPath,
  output_markdown: outputMarkdownPath,
  source_snapshot: sourceSnapshotPath,
  summary: matrix.summary,
  matrix_digest: matrix.matrix_digest,
}, null, 2)}\n`);
