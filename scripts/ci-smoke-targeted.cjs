#!/usr/bin/env node
const { spawnSync } = require('child_process');

const suite = process.env.SMOKE_SUITE || 'none';

if (!['none', 'core', 'guest', 'all'].includes(suite)) {
  console.error(`Invalid SMOKE_SUITE="${suite}". Expected none|core|guest|all.`);
  process.exit(1);
}

if (suite === 'none') {
  console.log('No targeted smoke suite requested. Skipping.');
  process.exit(0);
}

const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
if (build.status !== 0) {
  process.exit(build.status || 1);
}

const smoke = spawnSync('node', ['scripts/run-smoke-suite.cjs', '--suite', suite], {
  stdio: 'inherit',
  env: process.env,
});
if (smoke.status !== 0) {
  process.exit(smoke.status || 1);
}
