#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const CURRENT_HEAD_TOKEN = 'CURRENT_PR_HEAD';

const REQUIRED_SECTIONS = [
  'Supervision traceability',
  'Authority and failure analysis',
  'Claim-to-evidence table',
  'Side investigations',
  'Supabase independence',
  'Verification',
  'Release state',
  'Remaining risk',
];

const ALLOWED_CHANGE_CLASSES = new Set([
  'executable source',
  'backend/data',
  'contract',
  'tests',
  'release tooling',
  'research',
  'documentation',
]);

const ALLOWED_DECISIONS = new Set([
  'ACCEPT',
  'ACCEPT WITH CONDITIONS',
  'READY_FOR_CODEX_VERIFY',
  'HOLD',
  'REJECT / REDESIGN',
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSection(body, heading) {
  const pattern = new RegExp(`^## ${escapeRegex(heading)}\\s*$`, 'm');
  const match = pattern.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const next = /^##\s+/m.exec(body.slice(start));
  return body.slice(start, next ? start + next.index : body.length).trim();
}

function lineValue(section, label) {
  const pattern = new RegExp(`^[-*]?\\s*\\*\\*${escapeRegex(label)}:\\*\\*\\s*(.+?)\\s*$`, 'mi');
  return pattern.exec(section)?.[1]?.trim() ?? null;
}

function plainLineValue(section, label) {
  const pattern = new RegExp(`^${escapeRegex(label)}:\\s*(.+?)\\s*$`, 'mi');
  return pattern.exec(section)?.[1]?.trim() ?? null;
}

function checkedCount(section) {
  return [...section.matchAll(/^- \[[xX]\]/gm)].length;
}

function stripCode(value) {
  return value.trim().replace(/^`+|`+$/g, '');
}

function claimRows(section) {
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .filter((cells) => !cells[0].toLowerCase().includes('claim'))
    .filter((cells) => !cells.every((cell) => /^-+$/.test(cell)))
    .filter((cells) => cells.slice(0, 5).every(Boolean));
}

function validateHeadReference(value, headSha, label, errors) {
  const normalized = stripCode(value ?? '');
  if (normalized === CURRENT_HEAD_TOKEN) return CURRENT_HEAD_TOKEN;
  if (!/^[0-9a-f]{40}$/i.test(normalized)) {
    errors.push(`${label} must be a full 40-character Git SHA or ${CURRENT_HEAD_TOKEN}`);
    return null;
  }
  if (headSha && normalized.toLowerCase() !== headSha.toLowerCase()) {
    errors.push(`${label} does not match PR head ${headSha}`);
  }
  return normalized;
}

export function validatePullRequestBody({ body, contract, baseSha = null, headSha = null }) {
  const errors = [];
  const warnings = [];
  if (!body?.trim()) {
    return { ok: false, errors: ['Pull request body is empty'], warnings, summary: {} };
  }

  const sections = {};
  for (const heading of REQUIRED_SECTIONS) {
    const value = getSection(body, heading);
    if (!value) errors.push(`Missing or empty section: ${heading}`);
    else sections[heading] = value;
  }

  const traceability = sections['Supervision traceability'] ?? '';
  const declaredBase = stripCode(lineValue(traceability, 'Exact base SHA') ?? '');
  const declaredHead = lineValue(traceability, 'Exact head SHA');
  const changeClass = lineValue(traceability, 'Change class');
  const affected = lineValue(traceability, 'Affected invariant IDs');

  if (!/^[0-9a-f]{40}$/i.test(declaredBase)) {
    errors.push('Exact base SHA must be a full 40-character Git SHA');
  }
  const normalizedHead = validateHeadReference(
    declaredHead,
    headSha,
    'Declared head SHA',
    errors,
  );
  if (baseSha && declaredBase.toLowerCase() !== baseSha.toLowerCase()) {
    errors.push(`Declared base SHA does not match PR base ${baseSha}`);
  }

  if (
    !changeClass ||
    changeClass.includes('|') ||
    !ALLOWED_CHANGE_CLASSES.has(changeClass.toLowerCase())
  ) {
    errors.push(
      `Change class must be one exact supported value: ${[...ALLOWED_CHANGE_CLASSES].join(', ')}`,
    );
  }

  const knownIds = new Set((contract.invariants ?? []).map((item) => item.id));
  let affectedIds = [];
  if (!affected) {
    errors.push('Affected invariant IDs must be declared');
  } else if (affected.toUpperCase() !== 'NONE') {
    affectedIds = affected.split(/[\s,]+/).filter(Boolean);
    if (affectedIds.length === 0) errors.push('Affected invariant IDs must contain IDs or NONE');
    for (const id of affectedIds) {
      if (!knownIds.has(id)) errors.push(`Unknown affected invariant ID: ${id}`);
    }
  }

  const authority = sections['Authority and failure analysis'] ?? '';
  if (authority.includes('Who can create, change, confirm, recover, or publish state after this change?')) {
    errors.push('Authority and failure analysis still contains the untouched template prompt');
  }
  if (authority.length < 80) errors.push('Authority and failure analysis is too short to be actionable');

  const rows = claimRows(sections['Claim-to-evidence table'] ?? '');
  if (rows.length === 0) {
    errors.push('Claim-to-evidence table needs at least one completed claim row');
  }
  const allowedEvidenceLevels = new Set(Object.keys(contract.evidenceLevels ?? {}));
  rows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const evidenceLevel = stripCode(cells[1]);
    if (!allowedEvidenceLevels.has(evidenceLevel)) {
      errors.push(`Claim row ${rowNumber} has unknown evidence level: ${evidenceLevel}`);
    }
    validateHeadReference(cells[3], headSha, `Claim row ${rowNumber} candidate SHA`, errors);
  });

  const sideInvestigations = sections['Side investigations'] ?? '';
  if (sideInvestigations.includes('List the adjacent questions investigated')) {
    errors.push('Side investigations still contains the untouched template prompt');
  }
  if (sideInvestigations.length < 25) {
    errors.push('Side investigations must name evidence or explicitly state why no trigger applies');
  }

  const provider = sections['Supabase independence'] ?? '';
  if (checkedCount(provider) < 2) {
    errors.push('Both Supabase-independence attestations must be checked');
  }

  const verification = sections.Verification ?? '';
  if (checkedCount(verification) < 2) {
    warnings.push('Supervision self-tests and structural gate are not both marked complete yet');
  }

  const release = sections['Release state'] ?? '';
  const decision = plainLineValue(release, 'Requested decision');
  if (!decision || decision.includes('|') || !ALLOWED_DECISIONS.has(decision)) {
    errors.push(
      `Requested decision must be one exact supported value: ${[...ALLOWED_DECISIONS].join(', ')}`,
    );
  }

  const remainingRisk = sections['Remaining risk'] ?? '';
  if (remainingRisk.length < 25) {
    errors.push('Remaining risk must state unresolved risk or explicitly justify none');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      affectedInvariantIds: affectedIds,
      changeClass,
      decision,
      claimRows: rows.length,
      checkedVerificationItems: checkedCount(verification),
      declaredHead: normalizedHead,
      resolvedHeadSha: headSha,
    },
  };
}

function parseArgs(argv) {
  const options = {
    eventPath: process.env.GITHUB_EVENT_PATH ?? null,
    bodyFile: null,
    contractPath: 'governance/supervision-contract.json',
  };
  for (const arg of argv) {
    if (arg.startsWith('--event-path=')) options.eventPath = arg.slice('--event-path='.length);
    else if (arg.startsWith('--body-file=')) options.bodyFile = arg.slice('--body-file='.length);
    else if (arg.startsWith('--contract=')) options.contractPath = arg.slice('--contract='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function format(result) {
  const lines = [
    '# ChopDot PR supervision report',
    '',
    `- Result: **${result.ok ? 'PASS' : 'FAIL'}**`,
    `- Claim rows: ${result.summary.claimRows ?? 0}`,
    `- Affected invariants: ${(result.summary.affectedInvariantIds ?? []).join(', ') || 'NONE'}`,
    `- Declared head: ${result.summary.declaredHead ?? 'unresolved'}`,
    `- Resolved head SHA: ${result.summary.resolvedHeadSha ?? 'unavailable'}`,
    `- Errors: ${result.errors.length}`,
    `- Warnings: ${result.warnings.length}`,
  ];
  if (result.errors.length) {
    lines.push('', '## Errors', '', ...result.errors.map((item) => `- ${item}`));
  }
  if (result.warnings.length) {
    lines.push('', '## Warnings', '', ...result.warnings.map((item) => `- ${item}`));
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const contract = readJson(path.resolve(options.contractPath));
  let body;
  let baseSha = null;
  let headSha = null;

  if (options.bodyFile) {
    body = fs.readFileSync(path.resolve(options.bodyFile), 'utf8');
  } else if (options.eventPath && fs.existsSync(options.eventPath)) {
    const event = readJson(options.eventPath);
    if (!event.pull_request) {
      console.log('No pull_request payload; PR supervision check skipped.');
      return;
    }
    body = event.pull_request.body ?? '';
    baseSha = event.pull_request.base?.sha ?? null;
    headSha = event.pull_request.head?.sha ?? null;
  } else {
    console.log('No PR body or pull_request event; PR supervision check skipped.');
    return;
  }

  const result = validatePullRequestBody({ body, contract, baseSha, headSha });
  console.log(format(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
