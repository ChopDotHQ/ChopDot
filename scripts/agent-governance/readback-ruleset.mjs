#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { authorityPolicyForSurface } from './authority-profile.mjs';
import { REQUIRED_CHECKS } from './build-ruleset-packet.mjs';
import { parseArgs, readJson, writeReport } from './lib.mjs';

function loadRulesets(repository, fixture) {
  if (fixture) {
    const value = readJson(path.resolve(fixture));
    return Array.isArray(value) ? value : [value];
  }
  const summaries = JSON.parse(execFileSync('gh', ['api', `repos/${repository}/rulesets?includes_parents=false`], { encoding: 'utf8' }));
  return summaries.map((entry) => JSON.parse(execFileSync('gh', ['api', `repos/${repository}/rulesets/${entry.id}`], { encoding: 'utf8' })));
}

export function validateRulesetReadback(rulesets, { branches, requiredChecks = REQUIRED_CHECKS }) {
  const errors = [];
  const warnings = [];
  const targetRefs = branches.map((branch) => `refs/heads/${branch}`);
  const active = rulesets.filter((ruleset) => ruleset.target === 'branch' && ruleset.enforcement === 'active');
  const matching = active.find((ruleset) => targetRefs.every((ref) => ruleset.conditions?.ref_name?.include?.includes(ref)));
  if (!matching) return { ok: false, checks: 1, errors: [`No active branch ruleset targets ${targetRefs.join(', ')}`], warnings, summary: { ruleset_ids: active.map((entry) => entry.id) } };
  const rules = new Map((matching.rules ?? []).map((rule) => [rule.type, rule]));
  const excludedRefs = matching.conditions?.ref_name?.exclude ?? [];
  if (excludedRefs.length) errors.push(`Ruleset has excluded refs and cannot prove complete governed-branch coverage: ${excludedRefs.join(', ')}`);
  for (const ref of targetRefs) {
    if (excludedRefs.includes(ref)) errors.push(`Ruleset excludes required target ref: ${ref}`);
  }
  if ((matching.bypass_actors ?? []).length) errors.push('Ruleset has bypass actors; governed branches must have no bypass path');
  if (!rules.has('deletion')) errors.push('Ruleset does not prevent branch deletion');
  if (!rules.has('non_fast_forward')) errors.push('Ruleset does not prevent force push');
  const pullRequest = rules.get('pull_request')?.parameters ?? {};
  const mergePolicy = authorityPolicyForSurface('branch_merge');
  if ((pullRequest.required_approving_review_count ?? 0) !== mergePolicy.required_approving_review_count) errors.push('Ruleset approving-review count differs from the project authority profile');
  if (pullRequest.require_code_owner_review !== mergePolicy.require_code_owner_review) errors.push('Ruleset CODEOWNERS-review setting differs from the project authority profile');
  if (pullRequest.require_last_push_approval !== mergePolicy.require_last_push_approval) errors.push('Ruleset last-push-approval setting differs from the project authority profile');
  if (pullRequest.require_extra_approval_for_unattributed_changes !== false) errors.push('Ruleset unexpectedly requires an unattributed-changes reviewer in delegated-owner mode');
  if (pullRequest.required_review_thread_resolution !== mergePolicy.required_review_thread_resolution) errors.push('Ruleset conversation-resolution setting differs from the project authority profile');
  const status = rules.get('required_status_checks')?.parameters ?? {};
  if (!status.strict_required_status_checks_policy) errors.push('Required status checks are not strict/up-to-date');
  const actualChecks = new Set((status.required_status_checks ?? []).map((entry) => entry.context));
  for (const context of requiredChecks) if (!actualChecks.has(context)) errors.push(`Missing required status check: ${context}`);
  return {
    ok: errors.length === 0,
    checks: 4 + requiredChecks.length,
    errors,
    warnings,
    summary: { ruleset_id: matching.id, ruleset_name: matching.name, enforcement: matching.enforcement, branches, required_checks: [...actualChecks] },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.repository && !options.fixture) throw new Error('--repository is required without --fixture');
  const branches = String(options.branches ?? 'main,codex/chopdot-v1-launch').split(',').map((entry) => entry.trim()).filter(Boolean);
  const rulesets = loadRulesets(options.repository, options.fixture);
  const result = validateRulesetReadback(rulesets, { branches });
  if (options.json_out) writeReport(path.resolve(options.json_out), result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
