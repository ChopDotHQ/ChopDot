#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const fixturePath = 'docs/examples/auth-provider-invalid-visible-pass.md';
const validatorPath = path.join(repoRoot, 'scripts/validate-auth-provider-proof.mjs');

const result = spawnSync(process.execPath, [validatorPath], {
  cwd: repoRoot,
  env: {
    ...process.env,
    AUTH_PROVIDER_PROOF_LEDGER_PATH: fixturePath,
  },
  encoding: 'utf8',
});

const output = `${result.stdout}\n${result.stderr}`;

if (result.status === 0) {
  console.error('❌ Auth provider proof selftest FAILED');
  console.error('Expected invalid visible-provider fixture to fail validation.');
  process.exit(1);
}

if (!output.includes('evidence only proves visibility/setup/mock behavior')) {
  console.error('❌ Auth provider proof selftest FAILED');
  console.error('Validator failed, but not for the visible-provider promotion guard.');
  console.error(output);
  process.exit(1);
}

console.log('✅ Auth provider proof selftest OK — visible/setup-only provider passes are rejected');
