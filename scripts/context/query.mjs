#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_BUDGET = 6000;
const MAX_FILE_BYTES = 220_000;

const STOP = new Set(`a an and are as at be by can could do does for from has have how i if in is it its of on or our should that the their them then this to use used using we what when where which who why with you your add make build current new one into please`.split(/\s+/));

const TOKEN_ALIASES = new Map([
  ['floating', 'float'], ['floats', 'float'], ['settled', 'settlement'], ['settle', 'settlement'],
  ['contradiction', 'conflict'], ['contradict', 'conflict'], ['contradicting', 'conflict'],
  ['deployed', 'deploy'], ['deployment', 'deploy'], ['generated', 'generate'], ['generation', 'generate'],
]);

function git(root, args, fallback = '') {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return fallback; }
}

export function gitContext(root) {
  return {
    root: git(root, ['rev-parse', '--show-toplevel'], path.resolve(root)),
    branch: git(root, ['branch', '--show-current'], 'unknown'),
    head: git(root, ['rev-parse', 'HEAD'], '0'.repeat(40)),
  };
}

function normalizeToken(token) {
  let t = TOKEN_ALIASES.get(token) ?? token;
  if (t.endsWith('ing') && t.length > 6) t = t.slice(0, -3);
  else if (t.endsWith('ed') && t.length > 5) t = t.slice(0, -2);
  else if (t.endsWith('s') && t.length > 4) t = t.slice(0, -1);
  return TOKEN_ALIASES.get(t) ?? t;
}

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9_-]+/g) ?? [])
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(normalizeToken);
}

export function inferIntent(task) {
  const z = task.toLowerCase();
  const intents = new Set();
  if (/what should (we )?build next|next priority|what('?s| is) next|should we build it/.test(z)) intents.add('priority');
  if (/\b(mode|template|new feature|product type|new object)\b/.test(z) && /\b(add|build|create|introduce|make)\b/.test(z)) intents.add('feature_request');
  if (/home|receipt|ocr|first group|product account|personhood|user-visible|screen|ui\b/.test(z)) intents.add('product_ux');
  if (/paid|debt|amount|float|money|settle|currency/.test(z)) intents.add('money');
  if (/on-chain|ledger|source of truth|polkadot/.test(z)) intents.add('authority_architecture');
  if (/recovery|snapshot/.test(z)) intents.add('recovery');
  if (/repo graph|wrong checkout|another checkout|generated product|old execution plan|context/.test(z)) intents.add('context');
  if (/ship|deploy|public testnet|candidate|\brelease\b|pr #?\d+/.test(z)) intents.add('release');
  if (/conflict|contradict/.test(z)) intents.add('conflict');
  if (/pr #?13/.test(z) || (/\bpr\b/.test(z) && /rerun|red again|green/.test(z))) intents.add('pr_release_conflict');
  return [...intents];
}

function isIndexable(file) {
  if (/^(node_modules|dist|build|coverage|test-results|output|artifacts)\//.test(file)) return false;
  if (/\.(png|jpg|jpeg|gif|webp|ico|zip|gz|pdf|woff2?|ttf|lock)$/i.test(file)) return false;
  return /(^|\/)(AGENTS|CLAUDE|CHOPDOT|PRODUCT_TRUTH|DESIGN|README|PROJECT_DIRECTIVES)\.md$/i.test(file)
    || /\.(md|json|mjs|js|ts|tsx|yml|yaml)$/i.test(file);
}

export function classifyAuthority(file) {
  if (file === 'PRODUCT_TRUTH.md') return 'product_law';
  if (file === 'CHOPDOT.md') return 'founder_method';
  if (file === 'product/cards.md') return 'current_priority';
  if (file === 'product/decisions.md') return 'current_decision';
  if (file === 'product/context-authority.json') return 'context_policy';
  if (file === 'docs/release/current-release-state.json') return 'release_state';
  if (/^docs\/adr\//.test(file)) return 'architecture_decision';
  if (/^governance\/agent-system\/policies\//.test(file) || /^\.github\/workflows\//.test(file)) return 'governance_policy';
  if (/^governance\/agent-system\/instructions\//.test(file)) return 'method';
  if (/^product\/generated\//.test(file) || /\.generated\./.test(file)) return 'generated';
  if (/\/history\//.test(file) || /\/archive\//.test(file) || /^legacy\//.test(file)) return 'historical';
  if (/^docs\/superpowers\/plans\//.test(file)) return 'historical_plan';
  if (/^(src|tests|scripts)\//.test(file)) return 'implementation';
  return 'supporting';
}

const AUTHORITY_WEIGHT = {
  product_law: 1.42,
  founder_method: 1.38,
  current_decision: 1.30,
  current_priority: 1.28,
  context_policy: 1.24,
  release_state: 1.22,
  architecture_decision: 1.14,
  governance_policy: 1.10,
  method: 1.02,
  implementation: 1.0,
  supporting: 0.78,
  generated: 0.38,
  historical_plan: 0.24,
  historical: 0.18,
};

function headingChunks(file, text) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = [];
  let title = path.basename(file);
  const flush = () => {
    const body = current.join('\n').trim();
    if (body) chunks.push({ section: title, text: body });
    current = [];
  };
  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading && current.length) flush();
    if (heading) title = heading[2].trim();
    current.push(line);
    if (current.join('\n').length > 4500) flush();
  }
  flush();
  return chunks;
}

function fixedChunks(file, text, linesPerChunk = 70) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    const body = lines.slice(i, i + linesPerChunk).join('\n').trim();
    if (body) out.push({ section: `lines ${i + 1}-${Math.min(lines.length, i + linesPerChunk)}`, text: body });
  }
  return out;
}

export function chunkFile(file, text) {
  if (/\.md$/i.test(file)) return headingChunks(file, text);
  return fixedChunks(file, text);
}

export function buildIndex(root) {
  const tracked = git(root, ['ls-files'], '').split(/\r?\n/).filter(Boolean).filter(isIndexable);
  const chunks = [];
  for (const file of tracked) {
    const abs = path.join(root, file);
    if (!existsSync(abs)) continue;
    let text;
    try {
      const statSize = Buffer.byteLength(readFileSync(abs));
      if (statSize > MAX_FILE_BYTES) continue;
      text = readFileSync(abs, 'utf8');
    } catch { continue; }
    const authority = classifyAuthority(file);
    for (const [ordinal, c] of chunkFile(file, text).entries()) {
      chunks.push({ id: `${file}#${ordinal + 1}`, path: file, section: c.section, authority, text: c.text });
    }
  }
  return chunks;
}

function estimateTokens(text) { return Math.max(1, Math.ceil(text.length / 4)); }

function scoreIndex(task, chunks) {
  const q = tokenize(task);
  const docs = chunks.map((chunk) => ({ chunk, terms: tokenize(`${chunk.path} ${chunk.section} ${chunk.text}`) }));
  const df = new Map();
  for (const d of docs) for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = Math.max(1, docs.length);
  const avgdl = docs.reduce((s, d) => s + d.terms.length, 0) / N || 1;
  const intents = new Set(inferIntent(task));
  const scored = [];

  for (const d of docs) {
    const tf = new Map();
    for (const t of d.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const term of q) {
      const n = df.get(term) ?? 0;
      if (!n) continue;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const f = tf.get(term) ?? 0;
      if (!f) continue;
      const k1 = 1.4, b = 0.72, dl = d.terms.length || 1;
      score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgdl));
    }
    score *= AUTHORITY_WEIGHT[d.chunk.authority] ?? 1;

    if (intents.has('priority')) {
      if (d.chunk.authority === 'current_priority') score *= 1.65;
      if (['historical', 'historical_plan', 'generated'].includes(d.chunk.authority)) score *= 0.35;
    }
    if (intents.has('release')) {
      if (['release_state', 'architecture_decision', 'governance_policy'].includes(d.chunk.authority)) score *= 1.35;
      if (['generated', 'historical', 'historical_plan'].includes(d.chunk.authority)) score *= 0.4;
    }
    if (intents.has('authority_architecture') && ['product_law', 'current_decision', 'architecture_decision'].includes(d.chunk.authority)) score *= 1.35;
    if (intents.has('context') && ['context_policy', 'current_decision', 'implementation'].includes(d.chunk.authority)) score *= 1.28;
    if (intents.has('conflict') && /conflict|newest-looking|same-level/i.test(d.chunk.text)) score *= 2.0;
    if (score > 0) scored.push({ ...d.chunk, score });
  }
  return { intents: [...intents], scored: scored.sort((a, b) => b.score - a.score) };
}

function parseCards(text) {
  const chunks = headingChunks('product/cards.md', text);
  const rows = [];
  for (const c of chunks) {
    const id = c.text.match(/\bid:\s*(P-\d+)/)?.[1] ?? c.section.match(/(P-\d+)/)?.[1];
    const priority = Number(c.text.match(/\bpriority:\s*(\d+)/)?.[1] ?? NaN);
    const status = c.text.match(/\bstatus:\s*([^\n]+)/)?.[1]?.trim() ?? '';
    if (id && Number.isFinite(priority)) rows.push({ id, priority, status, section: c.section, text: c.text });
  }
  return rows;
}

function findChunk(chunks, predicate) { return chunks.find(predicate) ?? null; }

function force(chosen, chunk, reason) {
  if (!chunk || chosen.some((x) => x.path === chunk.path && x.section === chunk.section)) return;
  chosen.push({ ...chunk, reason, forced: true });
}

export function queryContext({ root = process.cwd(), task, budget = DEFAULT_BUDGET, expectedHead = null } = {}) {
  if (!task?.trim()) throw new Error('Context query requires a task');
  const ctx = gitContext(root);
  if (expectedHead && ctx.head !== expectedHead) throw new Error(`stale_head:${ctx.head}`);

  const chunks = buildIndex(root);
  const { intents, scored } = scoreIndex(task, chunks);
  const chosen = [];

  if (intents.includes('feature_request')) {
    force(chosen, findChunk(chunks, (x) => x.path === 'CHOPDOT.md' && /product decision lens/i.test(x.section)), 'materially-new feature request: apply product decision lens');
  }

  if (intents.includes('priority') && existsSync(path.join(root, 'product/cards.md'))) {
    const cards = parseCards(readFileSync(path.join(root, 'product/cards.md'), 'utf8'))
      .filter((x) => x.status !== 'blocked')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
    for (const card of cards) {
      force(chosen, findChunk(chunks, (x) => x.path === 'product/cards.md' && x.section.includes(card.id)), `structured current priority: ${card.id} priority ${card.priority}`);
    }
    force(chosen, findChunk(chunks, (x) => x.path === 'product/decisions.md' && /context authority/i.test(x.section)), 'priority authority boundary');
  }

  if (intents.includes('release') && !intents.includes('priority')) {
    force(chosen, findChunk(chunks, (x) => x.path === 'docs/release/current-release-state.json'), 'release task: read current release state first');
    force(chosen, findChunk(chunks, (x) => x.path === 'docs/adr/0003-immutable-testnet-promotion.md'), 'release task: immutable candidate decision');
  }

  if (intents.includes('conflict')) {
    force(chosen, findChunk(chunks, (x) => /chopdot-frontend-design\.md$/.test(x.path) && /exact-worktree preflight/i.test(x.section)), 'same-level conflict handling');
    force(chosen, findChunk(chunks, (x) => x.path === 'product/context-authority.json'), 'current authority map');
  }

  if (/repo graph/i.test(task)) {
    force(chosen, findChunk(chunks, (x) => x.path.endsWith('/repo-graph.mjs') && /read_context|lines/i.test(x.section)), 'requested Repo Graph context and freshness checks');
    force(chosen, findChunk(chunks, (x) => x.path.endsWith('/exact-source.mjs') && /read_context|lines/i.test(x.section)), 'exact-source fallback');
  }

  if (intents.includes('pr_release_conflict')) {
    force(chosen, findChunk(chunks, (x) => x.path === '.github/workflows/agent-governance.yml' && /PR outcome|Agent loop profile|pull_request|pr-outcome/i.test(x.text)), 'PR acceptance workflow');
    force(chosen, findChunk(chunks, (x) => x.path === '.github/workflows/agent-governance.yml' && /release[_ -]?enforcement|immutable accepted outcome|workflow_dispatch/i.test(x.text)), 'separate release enforcement');
    force(chosen, findChunk(chunks, (x) => /adoption-boundary/.test(x.path) && /release|profile|evidence/i.test(x.text)), 'path/profile adoption policy');
  }

  const perPath = new Map();
  let used = chosen.reduce((s, x) => s + estimateTokens(x.text), 0);
  for (const x of chosen) perPath.set(x.path, (perPath.get(x.path) ?? 0) + 1);

  for (const x of scored) {
    if (chosen.some((c) => c.path === x.path && c.section === x.section)) continue;
    const limit = x.path === 'product/cards.md' && intents.includes('priority') ? 4 : 2;
    if ((perPath.get(x.path) ?? 0) >= limit) continue;
    const cost = estimateTokens(x.text);
    if (chosen.length && used + cost > budget) continue;
    chosen.push({ ...x, reason: 'lexical + authority rank', forced: false });
    used += cost;
    perPath.set(x.path, (perPath.get(x.path) ?? 0) + 1);
    if (chosen.length >= 8) break;
  }

  const result = {
    context_version: 'shadow-v0.1',
    task,
    scope: ctx,
    intents,
    estimated_tokens: used,
    budget,
    needs_host_context: /\bpr\s*#?\d+/i.test(task),
    sources: chosen.map((x, i) => ({
      rank: i + 1,
      path: x.path,
      section: x.section,
      authority: x.authority,
      score: Number((x.score ?? 0).toFixed(3)),
      reason: x.reason,
      excerpt: x.text,
      estimated_tokens: estimateTokens(x.text),
    })),
  };
  return result;
}

function cli() {
  const args = process.argv.slice(2);
  const task = args.filter((x) => !x.startsWith('--')).join(' ').trim();
  const rootArg = args.find((x) => x.startsWith('--root='));
  const headArg = args.find((x) => x.startsWith('--expect-head='));
  const budgetArg = args.find((x) => x.startsWith('--budget='));
  const result = queryContext({
    root: rootArg ? rootArg.slice('--root='.length) : process.cwd(),
    task,
    expectedHead: headArg ? headArg.slice('--expect-head='.length) : null,
    budget: budgetArg ? Number(budgetArg.slice('--budget='.length)) : DEFAULT_BUDGET,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self)) cli();
