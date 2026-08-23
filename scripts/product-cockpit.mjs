import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const cardsPath = path.join(root, 'product/cards.md');
const resumePath = path.join(root, 'product/generated/product-resume.md');
const boardPath = path.join(root, 'product/board.html');
const historyPath = path.join(root, 'product/history/events');
const screenshotPath = path.join(root, 'artifacts/product/cockpit.png');

function parseArgs(values) {
  const parsed = { _: [] };
  for (const value of values) {
    if (!value.startsWith('--')) {
      parsed._.push(value);
      continue;
    }
    const [key, ...rest] = value.slice(2).split('=');
    parsed[key] = rest.length ? rest.join('=') : true;
  }
  return parsed;
}

function parseCards(markdown) {
  const sections = markdown.split(/^## /m).slice(1);
  return sections.map((section) => {
    const [heading, ...lines] = section.split('\n');
    const fields = {};
    const fenced = lines.join('\n').match(/```yaml\n([\s\S]*?)\n```/);
    if (fenced) {
      for (const line of fenced[1].split('\n')) {
        const separator = line.indexOf(':');
        if (separator < 0) continue;
        fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      }
    }
    const match = heading.match(/^(P-\d+)\s+-\s+(.+)$/);
    return {
      id: fields.id ?? match?.[1],
      title: match?.[2] ?? heading,
      ...fields,
    };
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function generatedViews(cards) {
  const active = cards.filter((card) => card.status === 'building');
  const ready = cards.filter((card) => card.status === 'ready');
  const done = cards.filter((card) => card.status === 'done');
  const resume = `# ChopDot Product Resume

Generated from \`product/cards.md\`; do not edit this read model directly.

- Active release: participant-held, local-first public beta.
- First action: **Scan a receipt**.
- Active cards: ${active.map((card) => card.id).join(', ') || 'none'}.
- Ready cards: ${ready.map((card) => card.id).join(', ') || 'none'}.
- Completed cards: ${done.map((card) => card.id).join(', ') || 'none'}.
- Current implementation: partial until production-entrypoint, release, and user evidence close every card.
- Next gate: ${active[0]?.id ?? ready[0]?.id ?? 'release acceptance'} — ${active[0]?.next_action ?? ready[0]?.next_action ?? 'Verify release'}.
- Falsifier: any second authority, raw group secret, fixture-only release proof, or different stage/public fingerprint stops promotion.
`;

  const cardHtml = cards.map((card) => `
      <article class="card" data-status="${escapeHtml(card.status)}">
        <div class="eyebrow">${escapeHtml(card.id)} · ${escapeHtml(card.pillar)}</div>
        <h2>${escapeHtml(card.title)}</h2>
        <p>${escapeHtml(card.journey)}</p>
        <div class="action">${escapeHtml(card.next_action)}</div>
        <footer><span>${escapeHtml(card.status)}</span><span>${escapeHtml(card.score)}</span></footer>
      </article>`).join('');

  const board = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChopDot product cockpit</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui;background:#f6f3ed;color:#211f1a}body{margin:0;padding:48px}main{max-width:1200px;margin:auto}.kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#745d3e}h1{font-size:clamp(36px,6vw,72px);line-height:.95;margin:12px 0 18px;max-width:900px}header p{font-size:18px;max-width:700px;color:#665f55}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin-top:36px}.card{background:#fff;border:1px solid #dfd8cd;border-radius:20px;padding:22px;box-shadow:0 10px 30px #503d1b10}.card[data-status=building]{border-top:5px solid #ff5f35}.card[data-status=done]{border-top:5px solid #1c9a70}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7c7162}.card h2{font-size:22px;margin:10px 0}.card p{min-height:72px;color:#5b544a;line-height:1.45}.action{background:#28251f;color:white;border-radius:12px;padding:12px 14px;font-weight:700}.card footer{display:flex;justify-content:space-between;margin-top:16px;font-size:12px;color:#776f63}@media(max-width:600px){body{padding:24px 16px}h1{font-size:42px}}
</style></head><body><main><header><div class="kicker">Private operator view · not a user route</div><h1>One release. One authority. Every money culture.</h1><p>Catch → Management → Payout → History. The release stops when evidence is weaker than the claim.</p></header><section class="grid">${cardHtml}</section></main></body></html>`;
  return { resume, board };
}

async function load() {
  const markdown = await readFile(cardsPath, 'utf8');
  return { markdown, cards: parseCards(markdown) };
}

function validateCards(cards) {
  const failures = [];
  const ids = new Set();
  for (const card of cards) {
    if (!card.id || ids.has(card.id)) failures.push(`duplicate or missing id: ${card.id ?? 'unknown'}`);
    ids.add(card.id);
    for (const field of ['status', 'pillar', 'journey', 'next_action', 'score', 'authority', 'scope', 'out']) {
      if (!card[field]) failures.push(`${card.id}: missing ${field}`);
    }
    const score = Number.parseInt(card.score, 10);
    if (!Number.isFinite(score) || score < 8 || score > 10) failures.push(`${card.id}: score must be 8/10..10/10`);
    if (!['ready', 'building', 'blocked', 'done'].includes(card.status)) failures.push(`${card.id}: invalid status ${card.status}`);
  }
  for (const required of ['P-034', 'P-032', 'P-035', 'P-012', 'P-022', 'P-005', 'P-006', 'P-007', 'P-008', 'P-030']) {
    if (!ids.has(required)) failures.push(`missing release card ${required}`);
  }
  return failures;
}

async function refresh() {
  const { cards } = await load();
  const failures = validateCards(cards);
  if (failures.length) throw new Error(failures.join('\n'));
  const views = generatedViews(cards);
  await mkdir(path.dirname(resumePath), { recursive: true });
  await writeFile(resumePath, views.resume);
  await writeFile(boardPath, views.board);
  console.log(`Product cockpit refreshed (${cards.length} cards).`);
}

async function validate() {
  const { cards } = await load();
  const failures = validateCards(cards);
  const expected = generatedViews(cards);
  for (const [target, content] of [[resumePath, expected.resume], [boardPath, expected.board]]) {
    try {
      if (await readFile(target, 'utf8') !== content) failures.push(`${path.relative(root, target)} is stale; run product:refresh`);
    } catch {
      failures.push(`${path.relative(root, target)} is missing; run product:refresh`);
    }
  }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Product cockpit valid (${cards.length} cards, all product scores >= 8/10).`);
}

async function query(args) {
  const { cards } = await load();
  const queryText = args._.join(' ').toLowerCase();
  const selected = queryText === 'next'
    ? cards.filter((card) => card.status === 'building').slice(0, 1)
    : cards.filter((card) => JSON.stringify(card).toLowerCase().includes(queryText));
  console.log(selected.map((card) => `${card.id} [${card.status}] ${card.title}\n  Next: ${card.next_action}`).join('\n'));
}

async function setStatus(command, args) {
  const id = args.id;
  if (!id) throw new Error(`${command} requires --id=P-XXX`);
  const { markdown, cards } = await load();
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Unknown card ${id}`);
  const expected = command === 'start' ? ['ready', 'blocked', 'building'] : ['building', 'blocked'];
  if (!expected.includes(card.status)) throw new Error(`${id} cannot ${command} from ${card.status}`);
  const next = command === 'start' ? 'building' : 'done';
  const sectionPattern = new RegExp(`(## ${id}[^\\n]*[\\s\\S]*?\\nstatus: )${card.status}(?=[\\s\\S]*?(?:\\n## P-|$))`);
  const updated = markdown.replace(sectionPattern, `$1${next}`);
  if (updated === markdown && card.status !== next) throw new Error(`Could not update ${id}`);
  await writeFile(cardsPath, updated);
  await checkpoint({ ...args, cards: id, summary: args.summary ?? `${id} ${next}` }, next);
  await refresh();
}

async function checkpoint(args, forcedState) {
  await mkdir(historyPath, { recursive: true });
  const files = await readdir(historyPath).catch(() => []);
  const sequence = String(files.filter((file) => file.endsWith('.json')).length + 1).padStart(4, '0');
  const cards = String(args.cards ?? args.id ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!args.summary) throw new Error('checkpoint requires --summary="..."');
  const evidence = args.evidence ? path.relative(root, path.resolve(root, String(args.evidence))) : undefined;
  const payload = {
    schema: 'chopdot.product.checkpoint.v1',
    sequence: Number(sequence),
    state: forcedState ?? 'checkpoint',
    cards,
    summary: String(args.summary),
    evidence,
    evidenceQuality: args['evidence-quality'] ?? undefined,
    source: 'product/cards.md',
    sourceSha256: createHash('sha256').update(await readFile(cardsPath)).digest('hex'),
  };
  const slug = cards.join('-').toLowerCase() || 'release';
  const target = path.join(historyPath, `${sequence}-${slug}.json`);
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, { flag: 'wx' });
  console.log(`Recorded ${path.relative(root, target)}.`);
}

async function screenshot() {
  await refresh();
  const { chromium } = await import('playwright');
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
    await page.goto(`file://${boardPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } finally {
    await browser.close();
  }
  console.log(`Captured ${path.relative(root, screenshotPath)}.`);
}

async function visualReview() {
  const info = await stat(screenshotPath).catch(() => null);
  if (!info || info.size < 10_000) throw new Error('Cockpit screenshot missing or implausibly small; run product:cockpit:screenshot');
  console.log(`Cockpit screenshot exists (${info.size} bytes). Human/agent visual judgment is still required; this command does not self-approve design.`);
}

const [command = 'resume', ...rawArgs] = process.argv.slice(2);
const args = parseArgs(rawArgs);

try {
  if (command === 'refresh') await refresh();
  else if (command === 'validate') await validate();
  else if (command === 'query') await query(args);
  else if (command === 'resume') console.log(await readFile(resumePath, 'utf8'));
  else if (command === 'start' || command === 'finish') await setStatus(command, args);
  else if (command === 'checkpoint') await checkpoint(args);
  else if (command === 'screenshot') await screenshot();
  else if (command === 'visual-review') await visualReview();
  else throw new Error(`Unknown product cockpit command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
