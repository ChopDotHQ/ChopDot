#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, readJson, writeReport } from './lib.mjs';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

export function resolveExpectedSha(options = {}) {
  if (options.expectedSha) return options.expectedSha;
  if (options.eventPath && fs.existsSync(options.eventPath)) {
    const event = readJson(options.eventPath);
    return event.pull_request?.head?.sha ?? options.githubSha ?? null;
  }
  return options.githubSha ?? null;
}

export function assertExactHead(root, expectedSha) {
  const actualSha = git(root, ['rev-parse', 'HEAD']);
  const actualTree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const branch = git(root, ['branch', '--show-current']);
  const errors = [];
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '')) errors.push('Expected SHA must be a full 40-character Git SHA');
  else if (actualSha !== expectedSha) errors.push(`Wrong checkout: expected ${expectedSha}, found ${actualSha}`);
  return { ok: errors.length === 0, checks: 1, errors, warnings: [], expected_sha: expectedSha, actual_sha: actualSha, actual_tree: actualTree, branch };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root ?? process.cwd());
  const expectedSha = resolveExpectedSha({
    expectedSha: options.expected_sha ?? process.env.EXPECTED_SHA,
    eventPath: options.event_path ?? process.env.GITHUB_EVENT_PATH,
    githubSha: process.env.GITHUB_SHA,
  });
  const result = assertExactHead(root, expectedSha);
  writeReport(options.json_out ? path.resolve(options.json_out) : null, result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
