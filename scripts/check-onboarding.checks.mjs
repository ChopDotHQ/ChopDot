import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkOnboarding, entryPoints} from './check-onboarding.mjs';

const source = fileURLToPath(new URL('..', import.meta.url));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chopdot-onboarding-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  fs.writeFileSync(path.join(root, '.gitignore'), '.env\n.env.*\n!/.env.example\n');
  fs.copyFileSync(path.join(source, '.env.example'), path.join(root, '.env.example'));
  for (const file of entryPoints) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), '# Guide\n');
  }
  fs.writeFileSync(path.join(root, 'README.md'), `# Start here\nNode ${pkg.engines.node}; npm ${pkg.packageManager.slice(4)}.\n[Contribute](CONTRIBUTING.md#guide)\n`);
  fs.mkdirSync(path.join(root, 'scripts'));
  for (const file of ['dev-frontend.mjs', 'check-onboarding.mjs', 'check-onboarding.checks.mjs']) fs.writeFileSync(path.join(root, 'scripts', file), '');
  return root;
}

test('reviewed public entry points are consistent', () => assert.deepEqual(checkOnboarding(source), []));
test('portable fixture passes without Git or installed dependencies', t => assert.deepEqual(checkOnboarding(fixture(t)), []));
test('missing local links and heading fragments fail', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'README.md'), '[Missing](absent.md)\n[Heading](CONTRIBUTING.md#absent)\n');
  const errors = checkOnboarding(root);
  assert(errors.some(e => e.includes('broken local link')));
  assert(errors.some(e => e.includes('missing heading')));
});
test('private machine paths and escaping links fail', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'README.md'), '/Users/example/private\n[Outside](../private.md)\n');
  const errors = checkOnboarding(root);
  assert(errors.some(e => e.includes('private machine path')));
  assert(errors.some(e => e.includes('escapes repository')));
});
test('unknown npm commands and missing executable files fail', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, 'README.md'), '`npm run nonexistent`\n');
  fs.unlinkSync(path.join(root, 'scripts', 'dev-frontend.mjs'));
  const errors = checkOnboarding(root);
  assert(errors.some(e => e.includes('missing npm script nonexistent')));
  assert(errors.some(e => e.includes('script entry point: dev:frontend')));
});
test('non-placeholder environment configuration fails', t => {
  const root = fixture(t);
  fs.appendFileSync(path.join(root, '.env.example'), '\nUNREVIEWED_OPTION=fixture\n');
  assert(checkOnboarding(root).some(e => e.includes('reviewed local placeholders')));
});
test('ignoring the template or dropping the CI gate fails', t => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, '.gitignore'), '.env\n.env.*\n');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  pkg.scripts['ci:fast'] = 'npm run lint';
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  const errors = checkOnboarding(root);
  assert(errors.some(e => e.includes('exempted')));
  assert(errors.some(e => e.includes('Fast CI')));
});

test('frontend launcher overrides inherited backend settings and binds only loopback', t => {
  const root = fixture(t);
  fs.copyFileSync(path.join(source, 'scripts/dev-frontend.mjs'), path.join(root, 'scripts/dev-frontend.mjs'));
  const vite = path.join(root, 'node_modules/vite');
  fs.mkdirSync(vite, {recursive: true});
  fs.writeFileSync(path.join(vite, 'package.json'), JSON.stringify({type: 'module', exports: './index.js'}));
  const expected = {
    VITE_DATA_SOURCE: 'local', VITE_SUPABASE_STRICT: 'false',
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'replace_me',
    VITE_WALLETCONNECT_PROJECT_ID: '', VITE_ENABLE_PVM_CLOSEOUT: '0', VITE_SIMULATE_CHAIN: '0',
  };
  // Stub Vite: inspect the launcher contract without opening ports or a database.
  fs.writeFileSync(path.join(vite, 'index.js'), `
    export async function createServer(options) {
      const events = [];
      const env = Object.fromEntries(${JSON.stringify(Object.keys(expected))}.map(key => [key, process.env[key]]));
      return {
        async listen() { events.push('listen'); },
        printUrls() { events.push('printUrls'); console.log(JSON.stringify({options, env, events})); }
      };
    }
  `);
  const output = execFileSync(process.execPath, [path.join(root, 'scripts/dev-frontend.mjs')], {
    cwd: os.tmpdir(), encoding: 'utf8',
    env: {...process.env, ...Object.fromEntries(Object.keys(expected).map(key => [key, 'inherited-fixture-value']))},
  });
  const actual = JSON.parse(output.split('\n')[0]);
  assert.deepEqual(actual.env, expected);
  assert.equal(fs.realpathSync(actual.options.root), fs.realpathSync(root));
  assert.deepEqual(actual.options.server, {host: '127.0.0.1', port: 5173, strictPort: true, open: false});
  assert.deepEqual(actual.events, ['listen', 'printUrls']);
  assert.match(output, /auth, shared sync, uploads and payments are not configured/);
});
