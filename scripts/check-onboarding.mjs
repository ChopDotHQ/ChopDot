import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const entryPoints = [
  'README.md', 'CONTRIBUTING.md', 'docs/README.md',
  'docs/CROSS_IDE_COLLABORATION.md', 'docs/setup/SUPABASE_SETUP.md',
  '.github/pull_request_template.md',
];

function headingIds(markdown) {
  const counts = new Map();
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, heading]) => {
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    return count ? `${slug}-${count}` : slug;
  }));
}

// Deliberately narrow: inline local Markdown links, headings, npm run commands
// and the public template in the six entry points above. Not a whole-repo or
// external-URL validator. Keep it dependency-free so it also works before npm ci.
export function checkOnboarding(root) {
  const failures = [];
  const read = relative => {
    try { return fs.readFileSync(path.join(root, relative), 'utf8'); }
    catch { failures.push(`Missing readable file: ${relative}`); return ''; }
  };
  let pkg;
  try { pkg = JSON.parse(read('package.json')); }
  catch { return ['package.json must contain valid JSON']; }
  const docs = new Map(entryPoints.map(file => [file, read(file)]));
  for (const [file, text] of docs) {
    if (/\/Users\/|\/home\/|file:\/\/|\.local-private\//.test(text)) failures.push(`${file}: private machine path in public entry point`);
    for (const [, command] of text.matchAll(/npm run\s+([\w:-]+)/g)) {
      if (!pkg.scripts?.[command]) failures.push(`${file}: missing npm script ${command}`);
    }
    for (const [, destination] of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^(?:https?:|mailto:)/i.test(destination)) continue;
      let decoded;
      try { decoded = decodeURIComponent(destination); }
      catch { failures.push(`${file}: invalid link encoding ${destination}`); continue; }
      const [relative, fragment] = decoded.split('#');
      const target = relative ? path.resolve(root, path.dirname(file), relative) : path.join(root, file);
      const inside = path.relative(root, target);
      if (path.isAbsolute(relative) || inside === '..' || inside.startsWith('..' + path.sep)) {
        failures.push(`${file}: link escapes repository ${destination}`);
      } else if (!fs.existsSync(target)) {
        failures.push(`${file}: broken local link ${destination}`);
      } else if (fragment && target.endsWith('.md')) {
        if (!headingIds(fs.readFileSync(target, 'utf8')).has(fragment)) failures.push(`${file}: missing heading ${destination}`);
      }
    }
  }
  for (const name of ['dev:frontend', 'docs:check', 'test:docs']) {
    const script = pkg.scripts?.[name] ?? '';
    const match = /^node (?:--test )?(scripts\/[\w.-]+\.mjs)$/.exec(script);
    if (!match || !fs.existsSync(path.join(root, match[1]))) failures.push(`Missing direct local script entry point: ${name}`);
  }
  if (!pkg.scripts?.['ci:fast']?.startsWith('npm run docs:check && npm run test:docs && ')) failures.push('Fast CI must run the onboarding checks without masking them');
  const readme = docs.get('README.md');
  if (!readme.includes(pkg.engines?.node ?? 'missing-node-engine')) failures.push('README must name the declared Node version');
  if (!readme.includes(pkg.packageManager?.replace(/^npm@/, '') ?? 'missing-package-manager')) failures.push('README must name the declared npm version');
  const template = Object.fromEntries(read('.env.example').split(/\r?\n/)
    .filter(line => line && !line.startsWith('#')).map(line => {
      const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)];
    }));
  const expected = {
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'replace_me',
    VITE_DATA_SOURCE: 'local', VITE_SUPABASE_STRICT: 'false',
    VITE_WALLETCONNECT_PROJECT_ID: '', VITE_ENABLE_PVM_CLOSEOUT: '0', VITE_SIMULATE_CHAIN: '0',
  };
  if (Object.keys(template).length !== Object.keys(expected).length
    || Object.entries(expected).some(([key, value]) => template[key] !== value)) failures.push('Environment template must contain only reviewed local placeholders');
  if (!read('.gitignore').split(/\r?\n/).includes('!/.env.example')) failures.push('Public .env.example must be exempted from the environment ignore rule');
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkOnboarding(fileURLToPath(new URL('..', import.meta.url)));
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`Public onboarding checks passed (${entryPoints.length} entry points; local links, headings, commands and template).`);
}
