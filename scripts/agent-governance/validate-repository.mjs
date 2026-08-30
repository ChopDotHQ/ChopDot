#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  isExcluded, parseArgs, readJson, walkTextFiles, writeMarkdownReport, writeReport,
} from './lib.mjs';
import { adoptionPolicyFailures } from './adoption-guard.mjs';
import { runSteeringMonitor } from './steering-surfaces.mjs';
import { validateWorkflow } from './validate-workflow.mjs';

const EXPECTED_INVARIANTS = [
  'SETTLEMENT-INV-001', 'MONEY-INV-001', 'DATA-AUTHORITY-INV-001',
  'FAILURE-INV-001', 'IDENTITY-INV-001', 'RECOVERY-INV-001',
  'PRIVACY-INV-001', 'PLATFORM-INV-001', 'MIGRATION-INV-001', 'UX-INV-001',
  'ACCESSIBILITY-INV-001', 'NETWORK-INV-001', 'PROVENANCE-INV-001',
  'CUSTODY-GUARD-001', 'EVIDENCE-INV-001',
];

function fileExists(root, relative) {
  return fs.existsSync(path.join(root, relative));
}

export function validateProviderIndependence(root, policy, packageJson) {
  const errors = [];
  const warnings = [];
  const dependencySections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const blockedPackages = (policy.blocked_packages ?? []).map((entry) => entry.toLowerCase());
  for (const sectionName of dependencySections) {
    for (const [declaredName, declaredVersion] of Object.entries(packageJson[sectionName] ?? {})) {
      const normalizedName = declaredName.toLowerCase();
      const normalizedVersion = String(declaredVersion).toLowerCase();
      for (const blocked of blockedPackages) {
        if (normalizedName === blocked || normalizedVersion.includes(blocked)) errors.push(`Provider policy: blocked package ${blocked} appears in ${sectionName} as ${declaredName}`);
      }
    }
  }

  const compact = (value) => value.toLowerCase().replace(/[\s'"`+()[\]{},;:=]/g, '');

  const excluded = policy.excluded_path_prefixes ?? [];
  for (const relative of new Set((policy.runtime_scan_roots ?? []).flatMap((entry) => walkTextFiles(root, entry)))) {
    if (isExcluded(relative, excluded)) continue;
    const contents = fs.readFileSync(path.join(root, relative), 'utf8');
    const normalized = contents.toLowerCase();
    const compacted = compact(contents);
    for (const pattern of policy.blocked_runtime_patterns ?? []) {
      if (normalized.includes(pattern.toLowerCase()) || compacted.includes(compact(pattern))) errors.push(`Provider policy: active runtime pattern ${pattern} appears in ${relative}`);
    }
  }

  for (const relative of new Set((policy.core_semantics_roots ?? []).flatMap((entry) => walkTextFiles(root, entry)))) {
    if (isExcluded(relative, excluded)) continue;
    const contents = fs.readFileSync(path.join(root, relative), 'utf8').toLowerCase();
    const compacted = compact(contents);
    for (const pattern of policy.core_provider_patterns ?? []) {
      if (contents.includes(pattern.toLowerCase()) || compacted.includes(compact(pattern))) {
        errors.push(`Provider policy: provider name ${pattern} leaks into core semantics at ${relative}`);
      }
    }
  }
  return { errors, warnings };
}

export function validateRepository(root, options = {}) {
  const errors = [];
  const warnings = [];
  let checks = 0;
  const invariantPath = path.join(root, 'scripts/agent-governance/catalog/invariants.v1.json');
  const providerPath = path.join(root, 'scripts/agent-governance/catalog/provider-policy.v1.json');
  const evidencePath = path.join(root, 'governance/agent-system/policies/evidence-levels.json');
  const adoptionPath = path.join(root, 'governance/agent-system/policies/adoption-boundary.v1.json');
  const packagePath = path.join(root, 'package.json');
  for (const file of [invariantPath, providerPath, evidencePath, adoptionPath, packagePath]) {
    checks += 1;
    if (!fs.existsSync(file)) errors.push(`Missing required governance source: ${path.relative(root, file)}`);
  }
  if (errors.length) return { ok: false, root, checks, errors, warnings, summary: {} };

  let catalog;
  let provider;
  let evidence;
  let adoption;
  let packageJson;
  try {
    catalog = readJson(invariantPath);
    provider = readJson(providerPath);
    evidence = readJson(evidencePath);
    adoption = readJson(adoptionPath);
    packageJson = readJson(packagePath);
  } catch (error) {
    return { ok: false, root, checks, errors: [`Invalid JSON: ${error.message}`], warnings, summary: {} };
  }
  const evidenceIds = new Set((evidence.ordered_levels ?? []).map((entry) => entry.id));
  const expected = new Set(EXPECTED_INVARIANTS);
  const seen = new Set();
  checks += 1;
  if (catalog.catalog_version !== '1.0.0') errors.push('Invariant catalog must use version 1.0.0');
  for (const invariant of catalog.invariants ?? []) {
    checks += 1;
    if (!expected.has(invariant.id)) errors.push(`Unknown invariant ID: ${invariant.id}`);
    if (seen.has(invariant.id)) errors.push(`Duplicate invariant ID: ${invariant.id}`);
    seen.add(invariant.id);
    if (!['critical', 'high', 'medium', 'low'].includes(invariant.severity)) errors.push(`${invariant.id}: invalid severity`);
    if (!fileExists(root, invariant.source ?? '')) errors.push(`${invariant.id}: missing current source ${invariant.source ?? '(unset)'}`);
    else if (!invariant.source_anchor || !fs.readFileSync(path.join(root, invariant.source), 'utf8').includes(invariant.source_anchor)) {
      errors.push(`${invariant.id}: source anchor is missing or stale in ${invariant.source}`);
    }
    if (!evidenceIds.has(invariant.minimum_evidence)) errors.push(`${invariant.id}: unknown evidence level ${invariant.minimum_evidence}`);
    for (const script of invariant.automated_checks ?? []) {
      if (!packageJson.scripts?.[script]) errors.push(`${invariant.id}: missing package script ${script}`);
    }
  }
  for (const id of expected) if (!seen.has(id)) errors.push(`Missing invariant ID: ${id}`);

  const contractDirectory = path.join(root, 'governance/agent-system/contracts');
  const schemaFiles = fs.existsSync(contractDirectory)
    ? fs.readdirSync(contractDirectory).filter((name) => name.endsWith('.schema.json')) : [];
  checks += schemaFiles.length;
  if (schemaFiles.length < 11) errors.push(`Canonical contract schema set is incomplete: found ${schemaFiles.length}, expected at least 11`);
  for (const name of schemaFiles) {
    try { readJson(path.join(contractDirectory, name)); } catch (error) { errors.push(`Invalid schema JSON ${name}: ${error.message}`); }
  }

  const providerResult = validateProviderIndependence(root, provider, packageJson);
  checks += 1;
  errors.push(...providerResult.errors);
  warnings.push(...providerResult.warnings);

  const steering = runSteeringMonitor(root, { requirePromoted: Boolean(options.expectedSha) });
  checks += steering.checks;
  if (steering.verdict === 'blocked') errors.push(...steering.drifts.map((entry) => `Steering surfaces: ${entry}`));
  else if (steering.verdict === 'degraded') warnings.push(`Steering surfaces: degraded; disabled=${steering.disabled_surface_ids.join(', ') || 'none'}`);

  checks += 1;
  errors.push(...adoptionPolicyFailures(adoption).map((entry) => `Adoption policy: ${entry}`));
  const requiredScripts = [
    'prepare', 'agent:context:receipt', 'agent:acceptance:guard',
    'agent:hooks:install', 'agent:hooks:check', 'test:agent:adoption',
  ];
  for (const script of requiredScripts) {
    checks += 1;
    if (!packageJson.scripts?.[script]) errors.push(`Missing adoption script ${script}`);
  }
  const hookPath = path.join(root, '.githooks/pre-push');
  checks += 1;
  if (!fs.existsSync(hookPath)) errors.push('Missing tracked .githooks/pre-push');
  else {
    const hook = fs.readFileSync(hookPath, 'utf8');
    if (!hook.includes('adoption-guard.mjs push')) errors.push('pre-push hook does not invoke the adoption guard');
    if (!(fs.statSync(hookPath).mode & 0o111)) errors.push('pre-push hook is not executable');
  }

  const workflowPath = path.join(root, '.github/workflows/agent-governance.yml');
  checks += 1;
  if (!fs.existsSync(workflowPath)) errors.push('Missing .github/workflows/agent-governance.yml');
  else {
    const workflow = validateWorkflow(fs.readFileSync(workflowPath, 'utf8'));
    checks += workflow.checks;
    errors.push(...workflow.errors.map((entry) => `Workflow: ${entry}`));
    warnings.push(...workflow.warnings.map((entry) => `Workflow: ${entry}`));
  }

  if (options.expectedSha) {
    checks += 1;
    const actual = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    if (!/^[0-9a-f]{40}$/.test(options.expectedSha)) errors.push('Expected candidate SHA is not a full 40-character SHA');
    else if (actual !== options.expectedSha) errors.push(`Wrong candidate identity: expected ${options.expectedSha}, checked out ${actual}`);
  }

  return {
    ok: errors.length === 0,
    root,
    checks,
    errors,
    warnings,
    summary: {
      invariant_count: seen.size,
      schema_count: schemaFiles.length,
      evidence_level_count: evidenceIds.size,
      adoption_rules: adoption.path_rules?.length ?? 0,
      steering_verdict: steering.verdict,
      steering_surface_count: steering.catalog.repository_file_count,
      steering_manifest_sha256: steering.catalog.repository_manifest_sha256,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const result = validateRepository(root, { expectedSha: options.expected_sha ?? process.env.EXPECTED_SHA });
  writeReport(options.json_out ? path.resolve(options.json_out) : null, result);
  writeMarkdownReport(options.md_out ? path.resolve(options.md_out) : null, 'ChopDot repository-governance report', result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
