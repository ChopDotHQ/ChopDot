#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const fixturePath = 'docs/examples/friend-pilot-invalid-coached-pass.md';
const validatorPath = path.join(repoRoot, 'scripts/validate-friend-pilot-results.mjs');

const result = spawnSync(process.execPath, [validatorPath], {
  cwd: repoRoot,
  env: {
    ...process.env,
    FRIEND_PILOT_RESULTS_PATH: fixturePath,
  },
  encoding: 'utf8',
});

const output = `${result.stdout}\n${result.stderr}`;

if (result.status === 0) {
  console.error('❌ Friend-pilot results selftest FAILED');
  console.error('Expected invalid coached-pass fixture to fail validation.');
  process.exit(1);
}

if (!output.includes('did not record "Coaching needed" as none')) {
  console.error('❌ Friend-pilot results selftest FAILED');
  console.error('Validator failed, but not for the coached-pass guard.');
  console.error(output);
  process.exit(1);
}

console.log('✅ Friend-pilot results selftest OK — coached passes are rejected');
