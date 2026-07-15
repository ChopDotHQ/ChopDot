#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const generatedMarker = '<!-- GENERATED: run npm run wiki:generate. Do not edit by hand. -->';

const wikiDir = path.join(root, 'docs/wiki');
const adrDir = path.join(root, 'docs/adr');
const generatedTargets = new Set([
  'docs/wiki/index.generated.md',
  'docs/wiki/agent-context.generated.md',
]);

const sourceRefs = [
  'product/product-principles.md',
  'product/story-map.md',
  'product/journey-review-plan.md',
  'product/cards.md',
  'product/journey-reviews/J-001-normal-pot-add-and-track-expenses.md',
  'product/journey-reviews/J-010-savings-circle-round.md',
  'product/journey-reviews/J-011-emergency-pot-privacy-flow.md',
  'product/design-references/chopdot-batch-1-2-consolidated-principles-2026-07-01.md',
  '.cursor/rules/chopdot-dot-programme.mdc',
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

function parseFrontmatter(markdown, file) {
  if (!markdown.startsWith('---\n')) {
    throw new Error(`${file} is missing frontmatter`);
  }
  const end = markdown.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`${file} has unclosed frontmatter`);
  }
  const frontmatter = markdown.slice(4, end).split('\n');
  const data = {};
  let currentKey = null;

  for (const line of frontmatter) {
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

function firstHeading(markdown) {
  const heading = markdown.split('\n').find((line) => line.startsWith('# '));
  return heading ? heading.replace(/^#\s+/, '').trim() : '';
}

function collectPages() {
  return [...walk(wikiDir), ...walk(adrDir)]
    .map((filePath) => {
      const rel = relative(filePath);
      if (generatedTargets.has(rel)) return null;
      const markdown = readFileSync(filePath, 'utf8');
      const meta = parseFrontmatter(markdown, rel);
      return {
        rel,
        title: meta.title || firstHeading(markdown) || rel,
        status: meta.status || '',
        owner: meta.owner || '',
        lastReviewed: meta.last_reviewed || '',
        reviewFrequency: meta.review_frequency || '',
        sourceOfTruth: meta.source_of_truth === true,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        relatedDocs: Array.isArray(meta.related_docs) ? meta.related_docs : [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.rel.localeCompare(b.rel));
}

function renderIndex(pages) {
  const lines = [
    generatedMarker,
    '',
    '# ChopDot Wiki Index',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This index is a read model for humans and agents. Edit source pages, not this file.',
    '',
    '## Core Source References',
    '',
    ...sourceRefs.map((ref) => `- \`${ref}\``),
    '',
    '## Wiki And ADR Pages',
    '',
    '| Page | Status | Owner | Last reviewed | Tags | Related docs |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const page of pages) {
    const tags = page.tags.length ? page.tags.map((tag) => `\`${tag}\``).join(', ') : '';
    const related = page.relatedDocs.length ? page.relatedDocs.slice(0, 4).map((doc) => `\`${doc}\``).join('<br>') : '';
    lines.push(`| [${page.title}](../../${page.rel}) | ${page.status} | ${page.owner} | ${page.lastReviewed} | ${tags} | ${related} |`);
  }

  lines.push('');
  return lines.join('\n');
}

function renderAgentContext(pages) {
  const groups = [
    ['Start Here', 'docs/wiki/00-start-here/'],
    ['Product Truth', 'docs/wiki/01-product-truth/'],
    ['User Journeys', 'docs/wiki/02-user-journeys/'],
    ['State Models', 'docs/wiki/03-state-models/'],
    ['Design Quality', 'docs/wiki/04-design-quality/'],
    ['Polkadot Native', 'docs/wiki/05-polkadot-native/'],
    ['AgentOps', 'docs/wiki/06-agentops/'],
    ['Quality', 'docs/wiki/07-quality/'],
    ['Context Intake', 'docs/wiki/08-context-intake/'],
    ['ADRs', 'docs/adr/'],
  ];

  const lines = [
    generatedMarker,
    '',
    '# ChopDot Agent Context',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Use this as a routing map. Follow links to source truth before changing code or making claims.',
    '',
    '## Read First',
    '',
    '1. `docs/wiki/00-start-here/what-is-chopdot.md`',
    '2. `docs/wiki/00-start-here/current-product-state.md`',
    '3. `docs/wiki/00-start-here/how-agents-should-work.md`',
    '4. `product/story-map.md`',
    '5. `product/cards.md`',
    '6. `docs/wiki/08-context-intake/context-intake.md` when continuing work from another Codex thread or imported agent run',
    '',
    '## Routing',
    '',
  ];

  for (const [label, prefix] of groups) {
    const matching = pages.filter((page) => page.rel.startsWith(prefix));
    if (!matching.length) continue;
    lines.push(`### ${label}`, '');
    for (const page of matching) {
      lines.push(`- \`${page.rel}\` — ${page.title} (${page.status})`);
    }
    lines.push('');
  }

  lines.push('## Never Assume', '');
  lines.push('- Never assume generated files are source truth.');
  lines.push('- Never assume KG/search replaces repo docs.');
  lines.push('- Never expose Polkadot/native infrastructure in normal UI.');
  lines.push('- Never treat happy-path tests as enough for journey promotion.');
  lines.push('');

  return lines.join('\n');
}

const pages = collectPages();
mkdirSync(wikiDir, { recursive: true });
writeFileSync(path.join(wikiDir, 'index.generated.md'), renderIndex(pages));
writeFileSync(path.join(wikiDir, 'agent-context.generated.md'), renderAgentContext(pages));

console.log(`Generated ChopDot wiki indexes for ${pages.length} page(s).`);
