import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const wikiRoot = path.join(root, 'docs/wiki');
const indexPath = path.join(wikiRoot, 'index.generated.md');
const contextPath = path.join(wikiRoot, 'agent-context.generated.md');

async function walk(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await walk(target));
    else results.push(target);
  }
  return results;
}

async function sourcePages() {
  return (await walk(wikiRoot))
    .filter((file) => file.endsWith('.md') && !file.endsWith('.generated.md'))
    .sort();
}

async function render() {
  const pages = await sourcePages();
  const truth = await readFile(path.join(root, 'PRODUCT_TRUTH.md'), 'utf8');
  const cards = await readFile(path.join(root, 'product/cards.md'), 'utf8');
  const decisions = await readFile(path.join(root, 'product/decisions.md'), 'utf8');
  const activeCards = [...cards.matchAll(/^id: (P-\d+)\nstatus: building$/gm)].map((match) => match[1]);
  const index = `# ChopDot Wiki Index

Generated from source pages. Update the linked source, then run \`npm run wiki:sync\`.

${pages.map((file) => `- [${path.relative(wikiRoot, file).replace(/\.md$/, '')}](${path.relative(wikiRoot, file)})`).join('\n')}
`;
  const context = `# ChopDot Agent Context

Generated read model. It is navigation, not product authority.

- Product truth SHA-256: \`${createHash('sha256').update(truth).digest('hex')}\`
- Product cards SHA-256: \`${createHash('sha256').update(cards).digest('hex')}\`
- Product decisions SHA-256: \`${createHash('sha256').update(decisions).digest('hex')}\`
- Active cards: ${activeCards.join(', ') || 'none'}
- Product loop: Catch -> Management -> Payout -> History
- First product action: Scan a receipt
- Authority: participant-held signed events
- Release boundary: DotNS, hosts, chains, caches, and KG are indexes or rails, never money or membership authority

Read in order:

1. [Product truth](../../PRODUCT_TRUTH.md)
2. [Current product state](00-start-here/current-product-state.md)
3. [Architecture](01-product-truth/participant-held-architecture.md)
4. [One Chop Core](03-state-models/one-chop-core.md)
5. [Release checklist](07-quality/release-checklist.md)
`;
  return { index, context, count: pages.length };
}

async function generate() {
  const rendered = await render();
  await mkdir(wikiRoot, { recursive: true });
  await writeFile(indexPath, rendered.index);
  await writeFile(contextPath, rendered.context);
  console.log(`Wiki generated from ${rendered.count} source pages.`);
}

async function validate() {
  const failures = [];
  const rendered = await render();
  for (const [target, expected] of [[indexPath, rendered.index], [contextPath, rendered.context]]) {
    const current = await readFile(target, 'utf8').catch(() => null);
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
    if (!await readFile(path.join(wikiRoot, relative), 'utf8').catch(() => null)) failures.push(`missing ${relative}`);
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
