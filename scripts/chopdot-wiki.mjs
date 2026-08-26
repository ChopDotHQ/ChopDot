import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import {parseCards, rankCards} from './product-cockpit.mjs';
import {validateCards} from './product-cockpit.mjs';

const root = process.cwd();
const wikiRoot = path.join(root, 'docs/wiki');
const indexPath = path.join(wikiRoot, 'index.generated.md');
const contextPath = path.join(wikiRoot, 'agent-context.generated.md');
const execFileAsync = promisify(execFile);

function insideRoot(target) {
  return target !== root && target.startsWith(`${root}${path.sep}`);
}

async function safeRepoFile(relative, label, {allowMissing = false} = {}) {
  if (!relative || path.isAbsolute(relative)) throw new Error(`${label}: path must be repository-relative`);
  const lexical = path.resolve(root, relative);
  if (!insideRoot(lexical)) throw new Error(`${label}: path escapes the exact worktree`);
  const info = await lstat(lexical).catch(() => null);
  if (!info) {
    if (allowMissing) return lexical;
    throw new Error(`${label}: file is missing`);
  }
  if (info.isSymbolicLink()) throw new Error(`${label}: symlinks are not accepted`);
  if (!info.isFile()) throw new Error(`${label}: path is not a regular file`);
  const physical = await realpath(lexical).catch(() => null);
  if (!physical || !insideRoot(physical)) throw new Error(`${label}: real path escapes the exact worktree`);
  return physical;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

async function sourcePages() {
  const {stdout} = await execFileAsync('git', ['ls-files', 'docs/wiki'], {cwd: root});
  const tracked = stdout.split('\n').filter(Boolean)
    .filter((file) => file.endsWith('.md') && !file.endsWith('.generated.md'))
    .sort();
  return Promise.all(tracked.map((file) => safeRepoFile(file, `wiki source ${file}`)));
}

async function render() {
  const pages = await sourcePages();
  const truth = await readFile(path.join(root, 'PRODUCT_TRUTH.md'), 'utf8');
  const cards = await readFile(path.join(root, 'product/cards.md'), 'utf8');
  const decisions = await readFile(path.join(root, 'product/decisions.md'), 'utf8');
  const releaseState = await readFile(path.join(root, 'docs/release/current-release-state.json'), 'utf8');
  const parsedCards = parseCards(cards);
  const activeCards = rankCards(parsedCards).filter((card) => card.status === 'building');
  const nextCard = activeCards[0];
  const index = `# ChopDot Wiki Index

**Kind:** read-model
**Status:** generated
**Owner:** wiki-generator
**Last reviewed:** 2026-08-26
**Applies to:** chopdot-v1-launch
**Authority:** navigation only; source wiki pages own their claims

Generated from source pages. Update the linked source, then run \`npm run wiki:sync\`.

${pages.map((file) => `- [${path.relative(wikiRoot, file).replace(/\.md$/, '')}](${path.relative(wikiRoot, file)})`).join('\n')}
`;
  const context = `# ChopDot Agent Context

**Kind:** read-model
**Status:** generated
**Owner:** wiki-generator
**Last reviewed:** 2026-08-26
**Applies to:** chopdot-v1-launch
**Authority:** navigation only; it cannot override law, Cockpit source, exact source evidence, release readback, or cited recall

Generated read model. It is navigation, not product authority.

- Product truth SHA-256: \`${createHash('sha256').update(truth).digest('hex')}\`
- Product cards SHA-256: \`${createHash('sha256').update(cards).digest('hex')}\`
- Product decisions SHA-256: \`${createHash('sha256').update(decisions).digest('hex')}\`
- Current release state SHA-256: \`${createHash('sha256').update(releaseState).digest('hex')}\`
- Active cards: ${activeCards.map((card) => card.id).join(', ') || 'none'}
- Explicit next card: ${nextCard ? `${nextCard.id} — ${nextCard.next_action}` : 'none'}
- Product loop: Catch -> Management -> Payout -> History
- First product action: Scan a receipt
- Authority: participant-held signed events
- Release boundary: DotNS, hosts, chains, caches, and knowledge backends are indexes or rails, never money or membership authority

Read in order:

1. [Context authority](../../product/context-authority.json)
2. [Product truth](../../PRODUCT_TRUTH.md)
3. [Product cards](../../product/cards.md)
4. [Current release state](../release/current-release-state.json)
5. [Current product state](00-start-here/current-product-state.md)
6. [Architecture](01-product-truth/participant-held-architecture.md)
7. [One Chop Core](03-state-models/one-chop-core.md)
8. [Release checklist](07-quality/release-checklist.md)
9. [Portable agent outcomes](07-quality/portable-agent-outcomes.md)
`;
  return { index, context, count: pages.length };
}

async function generate() {
  const rendered = await render();
  await mkdir(wikiRoot, { recursive: true });
  const safeIndex = await safeRepoFile(path.relative(root, indexPath), 'generated wiki index', {allowMissing: true});
  const safeContext = await safeRepoFile(path.relative(root, contextPath), 'generated wiki context', {allowMissing: true});
  await writeFile(safeIndex, rendered.index);
  await writeFile(safeContext, rendered.context);
  console.log(`Wiki generated from ${rendered.count} source pages.`);
}

async function validate() {
  const failures = [];
  const rendered = await render();
  const parsedCards = parseCards(await readFile(path.join(root, 'product/cards.md'), 'utf8'));
  failures.push(...validateCards(parsedCards));
  for (const [target, expected] of [[indexPath, rendered.index], [contextPath, rendered.context]]) {
    const safeTarget = await safeRepoFile(path.relative(root, target), `generated wiki ${path.basename(target)}`).catch((error) => {
      failures.push(error instanceof Error ? error.message : String(error));
      return null;
    });
    const current = safeTarget ? await readFile(safeTarget, 'utf8').catch(() => null) : null;
    if (current !== expected) failures.push(`${path.relative(root, target)} is missing or stale`);
  }
  const required = [
    '00-start-here/current-product-state.md',
    '01-product-truth/participant-held-architecture.md',
    '02-user-journeys/normal-pot.md',
    '02-user-journeys/spend-card.md',
    '02-user-journeys/savings-circle.md',
    '02-user-journeys/emergency-pot.md',
    '02-user-journeys/community-fund.md',
    '03-state-models/one-chop-core.md',
    '05-polkadot-native/native-boundaries.md',
    '07-quality/release-checklist.md',
  ];
  for (const relative of required) {
    const safeSource = await safeRepoFile(path.join('docs/wiki', relative), `required wiki page ${relative}`).catch((error) => {
      failures.push(error instanceof Error ? error.message : String(error));
      return null;
    });
    const content = safeSource ? await readFile(safeSource, 'utf8').catch(() => null) : null;
    if (!content) {
      failures.push(`missing ${relative}`);
      continue;
    }
    for (const field of ['Kind', 'Status', 'Owner', 'Last reviewed', 'Applies to']) {
      if (!new RegExp(`^\\*\\*${field}:\\*\\* .+$`, 'mu').test(content)) failures.push(`${relative}: missing ${field} metadata`);
    }
    const reviewed = content.match(/^\*\*Last reviewed:\*\* (\d{4}-\d{2}-\d{2})$/mu)?.[1];
    const reviewedAt = validDate(reviewed);
    const age = reviewedAt ? Math.floor((Date.now() - reviewedAt.getTime()) / 86_400_000) : Number.POSITIVE_INFINITY;
    if (age < 0 || age > 30) failures.push(`${relative}: review date is future or older than 30 days`);
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Wiki valid (${rendered.count} source pages, generated views current).`);
}

const command = process.argv[2] ?? 'validate';
if (command === 'generate') await generate();
else if (command === 'validate') await validate();
else throw new Error(`Unknown wiki command ${command}`);
