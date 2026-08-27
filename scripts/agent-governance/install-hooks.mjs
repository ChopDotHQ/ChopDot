#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = fs.realpathSync(process.cwd());
const hook = path.join(root, '.githooks/pre-push');
if (!fs.existsSync(path.join(root, '.git')) && !process.env.GITHUB_WORKSPACE) {
  process.stdout.write('Git metadata is unavailable; hook installation skipped.\n');
} else if (!fs.existsSync(hook)) {
  throw new Error('Cannot install ChopDot hooks: .githooks/pre-push is missing');
} else {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'inherit' });
  process.stdout.write('ChopDot governed pre-push hook is active.\n');
}
