#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { validateOutcomePacket } from '../agent-system/outcome.mjs';
import {
  checkedCount, labelValue, parseArgs, readJson, section, stripCode, tableRows,
  sha256File, writeMarkdownReport, writeReport,
} from './lib.mjs';

export const CURRENT_HEAD_TOKEN = 'CURRENT_PR_HEAD';
export const CI_GENERATED_TOKEN = 'CI_GENERATED';

const REQUIRED_SECTIONS = [
  'Summary',
  'Outcome traceability',
  'Expected outcome and artifact',
  'Authority and effect analysis',
  'Failure and recovery analysis',
  'Claim-to-evidence table',
  'Independent evaluation',
  'Side investigations',
  'Provider independence and privacy',
  'Verification',
  'Product and release state',
  'Remaining risk and next bounded proof',
];

const CHANGE_CLASSES = new Set([
  'product', 'implementation', 'UX', 'security/authority', 'incident repair',
  'release', 'research', 'governance', 'documentation',
]);

const LOOP_PROFILES = new Set([
  'research', 'product-definition', 'implementation', 'ux-creation',
  'security-authority', 'incident-repair', 'release-outcome', 'deterministic exemption',
]);

const TERMINAL_STATES = new Set([
  'succeeded', 'failed_verification', 'blocked', 'approval_required',
  'budget_exhausted', 'cancelled',
]);

const DECISIONS = new Set([
  'ACCEPT', 'ACCEPT WITH CONDITIONS', 'READY FOR INDEPENDENT VERIFY', 'HOLD',
  'REJECT / REDESIGN',
]);

function fullSha(value) {
  return /^[0-9a-f]{40}$/i.test(value);
}

function fullDigest(value) {
  return /^(?:sha256:)?[0-9a-f]{64}$/i.test(value);
}

function validateCandidate(value, headSha, label, errors, { allowArtifactDigest = true } = {}) {
  const normalized = stripCode(value);
  if (normalized === CURRENT_HEAD_TOKEN) return headSha ?? normalized;
  if (allowArtifactDigest && fullDigest(normalized)) return normalized;
  if (!fullSha(normalized)) {
    errors.push(`${label} must be CURRENT_PR_HEAD, a full 40-character Git SHA, or a SHA-256 artifact digest`);
    return null;
  }
  if (headSha && normalized.toLowerCase() !== headSha.toLowerCase()) {
    errors.push(`${label} is stale: ${normalized} does not match PR head ${headSha}`);
  }
  return normalized;
}

function safeRepositoryFile(root, relative, label, errors) {
  if (!root) {
    errors.push(`${label} cannot be checked without an exact repository root`);
    return null;
  }
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
    errors.push(`${label} must be a safe repository-relative path`);
    return null;
  }
  const exactRoot = fs.realpathSync(root);
  const unresolved = path.resolve(exactRoot, relative);
  if (!unresolved.startsWith(`${exactRoot}${path.sep}`) || !fs.existsSync(unresolved) || !fs.statSync(unresolved).isFile()) {
    errors.push(`${label} does not resolve to a repository file: ${relative}`);
    return null;
  }
  const absolute = fs.realpathSync(unresolved);
  if (!absolute.startsWith(`${exactRoot}${path.sep}`)) {
    errors.push(`${label} resolves through a symlink outside the repository: ${relative}`);
    return null;
  }
  return absolute;
}

function validateOutcomeEvidence(root, reference, { runId, terminalState, headSha, headBranch, ciOutcomePath }, errors) {
  if (!reference) return null;
  let file;
  let evidenceRoot;
  if (reference.ci_generated) {
    if (!ciOutcomePath) return null;
    file = path.resolve(ciOutcomePath);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      errors.push(`CI-generated OutcomePacketV1 does not exist: ${file}`);
      return null;
    }
    evidenceRoot = path.dirname(file);
  } else {
    file = safeRepositoryFile(root, reference.path, 'OutcomePacketV1', errors);
    evidenceRoot = root;
  }
  if (!file) return null;
  const actualDigest = sha256File(file);
  if (!reference.ci_generated && actualDigest !== reference.digest) errors.push(`OutcomePacketV1 file digest ${actualDigest} does not match declared ${reference.digest}`);
  let packet;
  try { packet = readJson(file); } catch (error) {
    errors.push(`OutcomePacketV1 is not valid JSON: ${error.message}`);
    return null;
  }
  const validation = validateOutcomePacket(packet);
  errors.push(...validation.issues.map((issue) => `OutcomePacketV1: ${issue}`));
  if (packet.run_id !== runId) errors.push(`OutcomePacketV1 run_id ${packet.run_id ?? '(missing)'} does not match PR run ${runId}`);
  if (packet.terminal_state !== terminalState) errors.push(`OutcomePacketV1 terminal state ${packet.terminal_state ?? '(missing)'} does not match PR state ${terminalState}`);
  if (headSha && packet.ending_head !== headSha) errors.push(`OutcomePacketV1 ending_head ${packet.ending_head ?? '(missing)'} does not match PR head ${headSha}`);
  if (headBranch && packet.branch !== headBranch) errors.push(`OutcomePacketV1 branch ${packet.branch ?? '(missing)'} does not match PR branch ${headBranch}`);
  if (reference.ci_generated) {
    let rootMatches = false;
    try { rootMatches = typeof packet.root === 'string' && fs.realpathSync(packet.root) === fs.realpathSync(root); } catch { rootMatches = false; }
    if (!rootMatches) errors.push('CI-generated OutcomePacketV1 root does not match the exact checkout');
    let actualHead = null;
    let actualTree = null;
    try {
      actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
      actualTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root, encoding: 'utf8' }).trim();
    } catch {
      errors.push('CI-generated OutcomePacketV1 candidate identity cannot be read from the exact checkout');
    }
    if (actualHead && (packet.starting_head !== actualHead || packet.ending_head !== actualHead)) {
      errors.push(`CI-generated OutcomePacketV1 must bind starting and ending head to exact candidate ${actualHead}`);
    }
    if (actualTree && (packet.starting_tree !== actualTree || packet.ending_tree !== actualTree)) {
      errors.push(`CI-generated OutcomePacketV1 must bind starting and ending tree to exact candidate ${actualTree}`);
    }
    if (!Array.isArray(packet.git_status) || packet.git_status.length !== 0) errors.push('CI-generated OutcomePacketV1 must declare a clean candidate');
  }

  const artifacts = new Map((packet.artifacts ?? []).map((entry) => [entry.artifact_id, entry]));
  for (const evidence of packet.evidence_index ?? []) {
    const artifact = artifacts.get(evidence.artifact_id);
    if (!artifact || artifact.path !== evidence.path || artifact.sha256 !== evidence.sha256) {
      errors.push(`Outcome evidence ${evidence.artifact_id ?? '(missing)'} is not identically bound in artifacts`);
    }
    const evidenceFile = safeRepositoryFile(evidenceRoot, evidence.path, `Outcome evidence ${evidence.artifact_id}`, errors);
    if (evidenceFile && sha256File(evidenceFile) !== evidence.sha256) errors.push(`Outcome evidence ${evidence.path} does not match cited SHA-256`);
  }
  return packet;
}

function decisionValue(text) {
  return /^Requested decision:\s*(.+)$/mi.exec(text)?.[1]?.trim() ?? null;
}

function outcomeReference(value) {
  if (!value) return null;
  const normalized = stripCode(value);
  if (normalized === CI_GENERATED_TOKEN) return { ci_generated: true };
  const match = /^(\S+)\s+@\s+sha256:([0-9a-f]{64})$/i.exec(normalized);
  return match ? { path: match[1], digest: match[2].toLowerCase() } : null;
}

export function validatePullRequestBody({ body, catalog, evidencePolicy, root = null, baseSha = null, headSha = null, headBranch = null, allowCiGenerated = false, requireCiGeneratedOutcome = false, ciOutcomePath = null }) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  if (!body?.trim()) return { ok: false, checks, errors: ['Pull request body is empty'], warnings, summary: {} };

  const sections = {};
  for (const heading of REQUIRED_SECTIONS) {
    checks += 1;
    const value = section(body, heading);
    if (!value) errors.push(`Missing or empty section: ${heading}`);
    else sections[heading] = value;
  }

  const traceability = sections['Outcome traceability'] ?? '';
  const declaredBase = stripCode(labelValue(traceability, 'Exact base SHA') ?? '');
  const declaredHead = labelValue(traceability, 'Exact head SHA') ?? '';
  const changeClass = stripCode(labelValue(traceability, 'Change class') ?? '');
  const profile = stripCode(labelValue(traceability, 'Agent loop profile') ?? '');
  const runId = stripCode(labelValue(traceability, 'Run ID') ?? '');
  const terminalState = stripCode(labelValue(traceability, 'Terminal state') ?? '');
  const outcomeRaw = labelValue(traceability, 'OutcomePacketV1 path and digest');
  const affectedRaw = stripCode(labelValue(traceability, 'Affected invariant IDs') ?? '');

  checks += 8;
  if (!fullSha(declaredBase)) errors.push('Exact base SHA must be a full 40-character Git SHA');
  else if (baseSha && declaredBase.toLowerCase() !== baseSha.toLowerCase()) errors.push(`Exact base SHA does not match PR base ${baseSha}`);
  validateCandidate(declaredHead, headSha, 'Exact head SHA', errors, { allowArtifactDigest: false });
  if (!CHANGE_CLASSES.has(changeClass)) errors.push(`Change class must be one exact supported value: ${[...CHANGE_CLASSES].join(', ')}`);
  if (!LOOP_PROFILES.has(profile)) errors.push(`Agent loop profile must be one exact supported value: ${[...LOOP_PROFILES].join(', ')}`);
  if (profile === 'deterministic exemption') {
    if (!/^None\s+—\s+deterministic exemption/i.test(runId)) errors.push('Deterministic exemption must be explicit in Run ID');
  } else if (!/^run_[a-z0-9][a-z0-9_-]{7,95}$/.test(runId)) {
    errors.push('Run ID must be a schema-compatible run_ ID');
  }
  if (!TERMINAL_STATES.has(terminalState)) errors.push('Terminal state must use the canonical six-state vocabulary');
  const outcome = outcomeReference(outcomeRaw);
  if (terminalState === 'succeeded' && !outcome) errors.push('A succeeded outcome requires `path @ sha256:<64 hex>` OutcomePacketV1 identity');
  if (outcome?.ci_generated && !allowCiGenerated) errors.push('CI_GENERATED is allowed only for moving pull-request outcome evidence');
  if (terminalState === 'succeeded' && requireCiGeneratedOutcome && !outcome?.ci_generated) errors.push('A succeeded moving pull request must use CI_GENERATED to avoid self-referential Git evidence');
  if (outcome && !outcome.ci_generated && (outcome.path.includes('..') || path.isAbsolute(outcome.path))) errors.push('OutcomePacketV1 path must be a safe repository-relative path');
  const outcomePacket = validateOutcomeEvidence(root, outcome, { runId, terminalState, headSha, headBranch, ciOutcomePath }, errors);
  if (outcome?.ci_generated && ciOutcomePath && !outcomePacket) errors.push('CI-generated OutcomePacketV1 validation did not produce a packet');

  const knownInvariantIds = new Set((catalog.invariants ?? []).map((entry) => entry.id));
  const affected = affectedRaw.toUpperCase() === 'NONE' ? [] : affectedRaw.split(/[\s,]+/).filter(Boolean);
  if (!affectedRaw) errors.push('Affected invariant IDs must declare IDs or NONE');
  for (const id of affected) if (!knownInvariantIds.has(id)) errors.push(`Unknown affected invariant ID: ${id}`);

  const summary = sections.Summary ?? '';
  if (summary.length < 40 || /What bounded outcome changed/i.test(summary)) errors.push('Summary is missing or still contains the template prompt');
  const expected = sections['Expected outcome and artifact'] ?? '';
  if (expected.length < 100 || /Subjective claims such as/i.test(expected) && !/Objective expected outcome:\*\*\s*\S+/i.test(expected)) {
    errors.push('Expected outcome section must replace the template prompts with objective assertions');
  }
  const authority = sections['Authority and effect analysis'] ?? '';
  if (authority.length < 120 || /Who may read, create, change/i.test(authority)) errors.push('Authority and effect analysis is missing or still contains template prompts');
  const failure = sections['Failure and recovery analysis'] ?? '';
  if (failure.length < 80 || /^What happens on cancellation/im.test(failure)) errors.push('Failure and recovery analysis is missing or still contains the template prompt');

  const evidenceIds = new Set((evidencePolicy.ordered_levels ?? []).map((entry) => entry.id));
  const rows = tableRows(sections['Claim-to-evidence table'] ?? '', 6).filter((cells) => cells.slice(0, 6).every(Boolean));
  checks += rows.length;
  if (!rows.length) errors.push('Claim-to-evidence table requires at least one complete row');
  rows.forEach((cells, index) => {
    const row = index + 1;
    const level = stripCode(cells[2]);
    if (!evidenceIds.has(level)) errors.push(`Claim row ${row} uses unknown evidence level: ${level}`);
    validateCandidate(cells[4], headSha, `Claim row ${row} candidate identity`, errors);
    if (/\b(claim|pass)\b/i.test(cells[1]) && /^(none|n\/a|-)?$/i.test(cells[3])) errors.push(`Claim row ${row} has a positive claim without exact evidence`);
  });

  const independent = sections['Independent evaluation'] ?? '';
  if (independent.length < 80 || /Evaluator \/ reviewer identity:\*\*\s*$/im.test(independent)) errors.push('Independent evaluation is incomplete');
  const side = sections['Side investigations'] ?? '';
  if (side.length < 25 || /^List adjacent uncertainty/im.test(side)) errors.push('Side investigations must name evidence or explicitly state that no trigger applies');
  const provider = sections['Provider independence and privacy'] ?? '';
  if (checkedCount(provider) !== 5) errors.push('All five provider-independence and privacy attestations must be checked');
  const verification = sections.Verification ?? '';
  if (checkedCount(verification) < 3) errors.push('At least the three portable governance validations must be checked');
  if (checkedCount(verification) < 10) warnings.push('Some verification rows remain unchecked; their associated claims cannot be promoted');

  const release = sections['Product and release state'] ?? '';
  const decision = decisionValue(release);
  if (!DECISIONS.has(decision)) errors.push(`Requested decision must be one exact supported value: ${[...DECISIONS].join(', ')}`);
  if (terminalState !== 'succeeded') {
    if (decision !== 'HOLD') errors.push('A non-succeeded terminal state must request HOLD');
    errors.push(`Terminal state ${terminalState || '(missing)'} is nonmergeable until a succeeded CI-generated outcome exists`);
  }
  for (const field of ['implemented', 'tested', 'committed', 'pushed', 'candidate_built', 'staged', 'promoted', 'reachable', 'user_owned', 'user_proven', 'knowledge_verified', 'ci_enforced', 'branch_protected']) {
    if (!new RegExp(`^- \\*\\*${field}:\\*\\* (?:true|false)\\s*$`, 'mi').test(release)) errors.push(`Product/release verdict ${field} must be explicit true or false`);
  }
  const risk = sections['Remaining risk and next bounded proof'] ?? '';
  if (risk.length < 50 || /^What remains untested/im.test(risk)) errors.push('Remaining risk must replace the prompt and name the next bounded proof');

  return {
    ok: errors.length === 0,
    checks,
    errors,
    warnings,
    summary: {
      base_sha: declaredBase || null,
      declared_head: stripCode(declaredHead) || null,
      resolved_head: headSha,
      change_class: changeClass || null,
      loop_profile: profile || null,
      terminal_state: terminalState || null,
      affected_invariants: affected,
      claim_rows: rows.length,
      decision,
      outcome_packet: outcome,
      outcome_id: outcomePacket?.outcome_id ?? null,
      outcome_file_sha256: outcome?.ci_generated && ciOutcomePath && fs.existsSync(ciOutcomePath) ? sha256File(ciOutcomePath) : outcome?.digest ?? null,
    },
  };
}

function loadEvent(eventPath) {
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  return readJson(eventPath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const event = loadEvent(options.event_path ?? process.env.GITHUB_EVENT_PATH);
  if (!event?.pull_request && !options.body_file) {
    process.stdout.write(`${JSON.stringify({ ok: true, skipped: true, reason: 'not a pull_request event' })}\n`);
    return;
  }
  const body = options.body_file
    ? fs.readFileSync(path.resolve(options.body_file), 'utf8')
    : event.pull_request.body ?? '';
  const catalog = readJson(path.join(root, 'scripts/agent-governance/catalog/invariants.v1.json'));
  const evidencePolicy = readJson(path.join(root, 'governance/agent-system/policies/evidence-levels.json'));
  const result = validatePullRequestBody({
    body,
    catalog,
    evidencePolicy,
    root,
    baseSha: options.base_sha ?? event?.pull_request?.base?.sha ?? null,
    headSha: options.head_sha ?? event?.pull_request?.head?.sha ?? null,
    headBranch: options.head_branch ?? event?.pull_request?.head?.ref ?? null,
    allowCiGenerated: Boolean(event?.pull_request),
    requireCiGeneratedOutcome: Boolean(event?.pull_request),
    ciOutcomePath: options.ci_outcome ? path.resolve(options.ci_outcome) : null,
  });
  writeReport(options.json_out ? path.resolve(options.json_out) : null, result);
  writeMarkdownReport(options.md_out ? path.resolve(options.md_out) : null, 'ChopDot pull-request governance report', result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
