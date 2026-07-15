#!/usr/bin/env node
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const generatedMarker = '<!-- GENERATED: run npm run wiki:generate. Do not edit by hand. -->';
const validStatuses = new Set(['current', 'draft', 'stale', 'blocked', 'archived']);
const validReviewFrequencies = new Set(['weekly', 'monthly', 'quarterly', 'on_change']);
const requiredFields = [
  'title',
  'status',
  'owner',
  'last_reviewed',
  'review_frequency',
  'source_of_truth',
  'related_code',
  'related_docs',
  'tags',
];
const generatedFiles = [
  'docs/wiki/index.generated.md',
  'docs/wiki/agent-context.generated.md',
];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function relative(filePath) {
  return toPosix(path.relative(root, filePath));
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith('.md')) return [full];
    return [];
  });
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '[]') return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''));
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

export function parseFrontmatter(markdown, file = '<inline>') {
  if (!markdown.startsWith('---\n')) {
    throw new Error(`${file} is missing frontmatter`);
  }
  const end = markdown.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${file} has unclosed frontmatter`);
  }
  const raw = markdown.slice(4, end).split('\n');
  const data = {};
  let currentKey = null;

  for (const line of raw) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      data[currentKey] = Array.isArray(data[currentKey]) ? data[currentKey] : [];
      data[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    currentKey = match[1];
    data[currentKey] = parseValue(match[2] ?? '');
  }

  return data;
}

function requireArray(meta, key, file, errors) {
  if (!Array.isArray(meta[key])) {
    errors.push(`${file}: ${key} must be an array`);
  }
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxAgeDays(frequency) {
  if (frequency === 'weekly') return 7;
  if (frequency === 'monthly') return 31;
  if (frequency === 'quarterly') return 92;
  return Infinity;
}

export function validatePage(markdown, file, options = {}) {
  const errors = [];
  let meta;
  try {
    meta = parseFrontmatter(markdown, file);
  } catch (error) {
    return [error.message];
  }

  for (const field of requiredFields) {
    if (!(field in meta)) errors.push(`${file}: missing ${field}`);
  }

  if (!validStatuses.has(meta.status)) errors.push(`${file}: invalid status "${meta.status}"`);
  if (!validReviewFrequencies.has(meta.review_frequency)) {
    errors.push(`${file}: invalid review_frequency "${meta.review_frequency}"`);
  }
  if (typeof meta.source_of_truth !== 'boolean') {
    errors.push(`${file}: source_of_truth must be true or false`);
  }
  if (!meta.owner) errors.push(`${file}: owner is required`);

  requireArray(meta, 'related_code', file, errors);
  requireArray(meta, 'related_docs', file, errors);
  requireArray(meta, 'tags', file, errors);

  const reviewed = parseDate(meta.last_reviewed);
  if (!reviewed) {
    errors.push(`${file}: last_reviewed must be YYYY-MM-DD`);
  } else if (meta.review_frequency !== 'on_change') {
    const now = options.now ?? new Date();
    const ageDays = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - reviewed.getTime()) / 86_400_000);
    if (ageDays > maxAgeDays(meta.review_frequency)) {
      errors.push(`${file}: stale last_reviewed ${meta.last_reviewed} for ${meta.review_frequency} review`);
    }
  }

  if (meta.source_of_truth === true && (!meta.owner || !reviewed)) {
    errors.push(`${file}: source_of_truth pages require owner and last_reviewed`);
  }

  const pathBase = options.pathBase ?? root;
  for (const key of ['related_code', 'related_docs']) {
    for (const ref of Array.isArray(meta[key]) ? meta[key] : []) {
      if (!ref) continue;
      const target = path.resolve(pathBase, ref);
      if (!existsSync(target)) errors.push(`${file}: missing ${key} path ${ref}`);
    }
  }

  return errors;
}

function validateGenerated(errors) {
  for (const rel of generatedFiles) {
    const file = path.join(root, rel);
    if (!existsSync(file)) {
      errors.push(`${rel}: generated file missing`);
      continue;
    }
    const content = readFileSync(file, 'utf8');
    if (!content.startsWith(generatedMarker)) {
      errors.push(`${rel}: missing generated marker`);
    }
  }
}

function runSelfTests() {
  const temp = mkdtempSync(path.join(tmpdir(), 'chopdot-wiki-'));
  try {
    writeFileSync(path.join(temp, 'exists.md'), '# exists\n');
    const valid = `---\ntitle: Valid\nstatus: current\nowner: Dev\nlast_reviewed: 2026-07-05\nreview_frequency: weekly\nsource_of_truth: false\nrelated_code: []\nrelated_docs:\n  - exists.md\ntags:\n  - test\n---\n# Valid\n`;
    const invalidStatus = valid.replace('status: current', 'status: maybe');
    const missingPath = valid.replace('exists.md', 'missing.md');
    const stale = valid.replace('last_reviewed: 2026-07-05', 'last_reviewed: 2026-06-01');

    const now = new Date('2026-07-05T00:00:00Z');
    const cases = [
      ['missing frontmatter', '# Missing\n', /missing frontmatter/],
      ['invalid status', invalidStatus, /invalid status/],
      ['missing related path', missingPath, /missing related_docs path missing.md/],
      ['stale page', stale, /stale last_reviewed/],
    ];

    const validErrors = validatePage(valid, 'valid.md', { now, pathBase: temp });
    if (validErrors.length) throw new Error(`selftest valid page failed: ${validErrors.join('; ')}`);

    for (const [name, markdown, expected] of cases) {
      const errors = validatePage(markdown, `${name}.md`, { now, pathBase: temp });
      if (!errors.some((error) => expected.test(error))) {
        throw new Error(`selftest ${name} did not produce expected error. Got: ${errors.join('; ')}`);
      }
    }

    const generatedErrors = [];
    const generatedTemp = path.join(temp, 'generated.md');
    writeFileSync(generatedTemp, '# Missing marker\n');
    const content = readFileSync(generatedTemp, 'utf8');
    if (!content.startsWith(generatedMarker)) generatedErrors.push('generated marker missing');
    if (!generatedErrors.length) throw new Error('selftest generated marker did not fail');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

runSelfTests();

const errors = [];
validateGenerated(errors);

const pages = [
  ...walk(path.join(root, 'docs/wiki')),
  ...walk(path.join(root, 'docs/adr')),
].filter((file) => !generatedFiles.includes(relative(file)));

for (const file of pages) {
  errors.push(...validatePage(readFileSync(file, 'utf8'), relative(file)));
}

if (errors.length) {
  console.error('ChopDot wiki validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ChopDot wiki valid: ${pages.length} source page(s), ${generatedFiles.length} generated file(s).`);

