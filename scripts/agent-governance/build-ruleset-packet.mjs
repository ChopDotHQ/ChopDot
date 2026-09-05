#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { authorityPolicyForSurface } from './authority-profile.mjs';
import { digestObject, parseArgs } from './lib.mjs';

const BRANCH_MERGE_POLICY = authorityPolicyForSurface('branch_merge');
export const REQUIRED_CHECKS = Object.freeze([...BRANCH_MERGE_POLICY.required_status_checks]);

export function buildRulesetPacket({ repository, sourceHead, sourceTree, branches }) {
  const include = branches.map((branch) => `refs/heads/${branch}`);
  const payload = {
    name: 'ChopDot governed merge boundary',
    target: 'branch',
    enforcement: 'active',
    conditions: { ref_name: { include, exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: BRANCH_MERGE_POLICY.required_approving_review_count,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: BRANCH_MERGE_POLICY.require_code_owner_review,
          require_last_push_approval: BRANCH_MERGE_POLICY.require_last_push_approval,
          require_extra_approval_for_unattributed_changes: false,
          required_review_thread_resolution: BRANCH_MERGE_POLICY.required_review_thread_resolution,
          allowed_merge_methods: ['squash', 'merge', 'rebase'],
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({ context })),
        },
      },
    ],
    bypass_actors: [],
  };
  const packet = {
    packet_version: '1.0.0',
    effect_type: 'github_repository_ruleset',
    repository,
    endpoint: `repos/${repository}/rulesets`,
    method: 'POST',
    source_head: sourceHead,
    source_tree: sourceTree,
    approval_required: true,
    readback_required: true,
    rollback_or_forward_repair: 'Disable or update only the identified ruleset after API readback; never infer enforcement from this packet.',
    payload,
  };
  return { ...packet, packet_digest: digestObject(packet) };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const repository = options.repository;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('--repository must be OWNER/REPO');
  const branches = String(options.branches ?? 'main,codex/chopdot-v1-launch').split(',').map((entry) => entry.trim()).filter(Boolean);
  const packet = buildRulesetPacket({ repository, branches, sourceHead: git(['rev-parse', 'HEAD']), sourceTree: git(['rev-parse', 'HEAD^{tree}']) });
  if (options.output) {
    const output = path.resolve(options.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
