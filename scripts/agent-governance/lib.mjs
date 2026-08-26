import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const separator = token.indexOf('=');
    const rawKey = token.slice(2, separator === -1 ? undefined : separator);
    const key = rawKey.replaceAll('-', '_');
    if (separator !== -1) options[key] = token.slice(separator + 1);
    else if (argv[index + 1] && !argv[index + 1].startsWith('--')) options[key] = argv[++index];
    else options[key] = true;
  }
  return options;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function canonicalize(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON rejects non-finite numbers');
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).filter((key) => value[key] !== undefined).sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  throw new TypeError(`Unsupported canonical value: ${typeof value}`);
}

export function digestObject(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function writeReport(file, value) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMarkdownReport(file, title, result) {
  if (!file) return;
  const lines = [
    `# ${title}`,
    '',
    `- Result: **${result.ok ? 'PASS' : 'FAIL'}**`,
    `- Checks: ${result.checks ?? 0}`,
    `- Errors: ${result.errors.length}`,
    `- Warnings: ${result.warnings.length}`,
  ];
  if (result.errors.length) lines.push('', '## Errors', '', ...result.errors.map((item) => `- ${item}`));
  if (result.warnings.length) lines.push('', '## Warnings', '', ...result.warnings.map((item) => `- ${item}`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.env', '.html', '.js', '.json', '.jsx', '.md', '.mjs',
  '.sol', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);

export function walkTextFiles(root, relative, output = []) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return output;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    const base = path.basename(relative);
    if (TEXT_EXTENSIONS.has(path.extname(relative)) || ['package.json', 'package-lock.json'].includes(base)) {
      output.push(relative.split(path.sep).join('/'));
    }
    return output;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'dist-dot-host', 'coverage', 'output'].includes(entry.name)) continue;
    walkTextFiles(root, path.join(relative, entry.name), output);
  }
  return output;
}

export function section(body, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^## ${escaped}\\s*$`, 'm').exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const next = /^##\s+/m.exec(body.slice(start));
  return body.slice(start, next ? start + next.index : body.length).trim();
}

export function labelValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.*?)\\s*$`, 'mi').exec(text)?.[1]?.trim() ?? null;
}

export function stripCode(value = '') {
  return value.trim().replace(/^`+|`+$/g, '');
}

export function tableRows(text, minimumCells) {
  return text.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= minimumCells)
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)))
    .filter((cells) => !/^(requirement|claim)/i.test(cells[0] ?? ''));
}

export function checkedCount(text) {
  return [...text.matchAll(/^- \[[xX]\]/gm)].length;
}

export function isExcluded(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix));
}
