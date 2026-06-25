#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const matrixPath = path.join(repoRoot, 'docs/chopdot-dot/polkadot-native-replacement-matrix.json');
const ledgerPath = path.join(repoRoot, 'docs/chopdot-dot/polkadot-native-evidence-ledger.json');
const STALE_DAYS = 90;

const allowedStatuses = new Set([
  'in_progress',
  'ready_to_spike',
  'lab_only',
  'highest_priority_spike',
  'ready_to_spike_after_transport',
  'ready_to_spike_after_receipt_contract',
  'defer_until_identity',
  'defer_until_identity_transport',
  'defer_until_core_flow',
]);

const requiredRowFields = [
  'id',
  'centralizedDependency',
  'currentDiscovery',
  'userJob',
  'facts',
  'polkadotNativeCandidate',
  'candidateEvidence',
  'inference',
  'status',
  'risk',
  'nextStep',
  'proofTest',
  'userCopyBoundary',
  'redLines',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function validateMatrix(matrix) {
  const failures = [];
  const ids = new Set();

  if (matrix.method !== 'Discovery -> Fact -> Inference -> Next Step') {
    failures.push('Matrix method must be "Discovery -> Fact -> Inference -> Next Step".');
  }

  if (!isNonEmptyArray(matrix.sourceEvidence)) {
    failures.push('Matrix must include sourceEvidence.');
  }

  if (!isNonEmptyArray(matrix.rows)) {
    failures.push('Matrix must include rows.');
    return failures;
  }

  for (const row of matrix.rows) {
    const prefix = row?.id ? `${row.id}: ` : 'unknown row: ';

    for (const field of requiredRowFields) {
      if (!(field in row)) {
        failures.push(`${prefix}missing required field "${field}".`);
      }
    }

    if (!isNonEmptyString(row.id)) failures.push(`${prefix}id must be a non-empty string.`);
    if (ids.has(row.id)) failures.push(`${prefix}duplicate id.`);
    ids.add(row.id);

    if (!allowedStatuses.has(row.status)) {
      failures.push(`${prefix}status "${row.status}" is not allowed.`);
    }

    for (const field of ['currentDiscovery', 'facts', 'candidateEvidence', 'redLines']) {
      if (!isNonEmptyArray(row[field])) {
        failures.push(`${prefix}${field} must be a non-empty array.`);
      }
    }

    for (const field of ['centralizedDependency', 'userJob', 'polkadotNativeCandidate', 'inference', 'risk', 'nextStep', 'proofTest', 'userCopyBoundary']) {
      if (!isNonEmptyString(row[field])) {
        failures.push(`${prefix}${field} must be a non-empty string.`);
      }
    }

    if (/production ready|production-ready|ready for production/i.test(`${row.inference} ${row.nextStep} ${row.status}`)) {
      failures.push(`${prefix}must not claim production readiness.`);
    }

    if (/supabase/i.test(row.polkadotNativeCandidate) && !/fallback|current|not/i.test(row.inference)) {
      failures.push(`${prefix}Polkadot-native candidate should not be Supabase.`);
    }

    if (/Asset Hub|tx|transaction/i.test(row.polkadotNativeCandidate) && !/confirm|receipt|evidence/i.test(`${row.proofTest} ${row.redLines.join(' ')}`)) {
      failures.push(`${prefix}payment/tx rows must explicitly preserve evidence vs confirmation.`);
    }

    if (/Statement Store|transport/i.test(row.polkadotNativeCandidate) && !/localStorage|privacy|encrypted|separate browser|Supabase/i.test(`${row.proofTest} ${row.risk} ${row.redLines.join(' ')}`)) {
      failures.push(`${prefix}transport rows must include privacy/no-localStorage/no-Supabase proof boundaries.`);
    }
  }

  const firstBuildTargets = matrix.rows.filter((row) => row.firstBuildTarget === true).map((row) => row.id);
  for (const requiredTarget of ['auth_session', 'pot_expense_persistence', 'realtime_event_transport', 'transaction_payment_evidence']) {
    if (!firstBuildTargets.includes(requiredTarget)) {
      failures.push(`firstBuildTarget must include ${requiredTarget}.`);
    }
  }

  return failures;
}

const ledgerRequiredFields = [
  'id',
  'repo',
  'tier',
  'capability',
  'confidence',
  'audit_depth',
  'verification_status',
  'coverage_weight',
  'chopdot_impact',
  'evidence_type',
  'module_refs',
  'notes',
  'source_url',
  'last_verified_at',
];

const allowedAuditDepth = new Set(['inventory', 'readme', 'module_map', 'line_review', 'runtime_proof']);
const allowedConfidence = new Set(['proven', 'lab_proven', 'declared', 'unknown', 'blocked']);
const provenEvidenceTypes = new Set(['runtime_proof', 'chopdot_test']);

function daysSince(isoDate) {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return Number.POSITIVE_INFINITY;
  const now = new Date();
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24);
}

function validateEvidenceLedger(ledger) {
  const failures = [];

  if (!isNonEmptyArray(ledger.entries)) {
    failures.push('Evidence ledger must include entries.');
    return failures;
  }

  const ids = new Set();
  for (const entry of ledger.entries) {
    const prefix = entry?.id ? `${entry.id}: ` : 'unknown entry: ';

    for (const field of ledgerRequiredFields) {
      if (!(field in entry)) {
        failures.push(`${prefix}missing required field "${field}".`);
      }
    }

    if (!isNonEmptyString(entry.id)) failures.push(`${prefix}id must be a non-empty string.`);
    if (ids.has(entry.id)) failures.push(`${prefix}duplicate id.`);
    ids.add(entry.id);

    if (!allowedConfidence.has(entry.confidence)) {
      failures.push(`${prefix}confidence "${entry.confidence}" is not allowed.`);
    }

    if (!allowedAuditDepth.has(entry.audit_depth)) {
      failures.push(`${prefix}audit_depth "${entry.audit_depth}" is not allowed.`);
    }

    if (!Array.isArray(entry.module_refs)) {
      failures.push(`${prefix}module_refs must be an array.`);
    }

    if (!isNonEmptyString(entry.source_url)) {
      failures.push(`${prefix}source_url must be a non-empty string.`);
    }

    if (!isNonEmptyString(entry.last_verified_at)) {
      failures.push(`${prefix}last_verified_at must be a non-empty string.`);
    } else if (daysSince(entry.last_verified_at) > STALE_DAYS) {
      failures.push(`${prefix}last_verified_at is stale (> ${STALE_DAYS} days).`);
    }

    if (entry.confidence === 'proven' && !provenEvidenceTypes.has(entry.evidence_type)) {
      failures.push(`${prefix}proven confidence requires evidence_type runtime_proof or chopdot_test.`);
    }
  }

  if (!isNonEmptyArray(ledger.hard_blockers)) {
    failures.push('Evidence ledger must include hard_blockers.');
  }

  return failures;
}

const matrix = readJson(matrixPath);
const failures = validateMatrix(matrix);

if (fs.existsSync(ledgerPath)) {
  const ledger = readJson(ledgerPath);
  failures.push(...validateEvidenceLedger(ledger));
}

if (failures.length > 0) {
  console.error('ChopDot.dot Polkadot-native build map validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const ledgerCount = fs.existsSync(ledgerPath) ? readJson(ledgerPath).entries.length : 0;
console.log(`ChopDot.dot Polkadot-native build map valid: ${matrix.rows.length} replacement rows, ${ledgerCount} evidence ledger entries.`);
