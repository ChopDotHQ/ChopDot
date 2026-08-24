import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const root = process.cwd();
const execFileAsync = promisify(execFile);
const cardsPath = path.join(root, 'product/cards.md');
const contextAuthorityPath = path.join(root, 'product/context-authority.json');
const resumePath = path.join(root, 'product/generated/product-resume.md');
const boardPath = path.join(root, 'product/board.html');
const tasksPath = path.join(root, '.knowns/tasks');
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

export function parseCards(markdown) {
  const sections = markdown.split(/^## /m).slice(1);
  return sections.map((section) => {
    const [heading, ...lines] = section.split('\n');
    const fields = {};
    const parseErrors = [];
    const fenced = lines.join('\n').match(/```yaml\n([\s\S]*?)\n```/);
    if (fenced) {
      for (const line of fenced[1].split('\n')) {
        const separator = line.indexOf(':');
        if (separator < 0) {
          parseErrors.push(`invalid field line: ${line}`);
          continue;
        }
        const key = line.slice(0, separator).trim();
        if (Object.hasOwn(fields, key)) parseErrors.push(`duplicate field: ${key}`);
        fields[key] = line.slice(separator + 1).trim();
      }
    } else parseErrors.push('missing yaml field block');
    const match = heading.match(/^(P-\d+)\s+-\s+(.+)$/);
    if (!match) parseErrors.push(`invalid heading: ${heading}`);
    if (fields.id && match?.[1] && fields.id !== match[1]) parseErrors.push(`heading id ${match[1]} differs from field id ${fields.id}`);
    return {
      id: fields.id ?? match?.[1],
      title: match?.[2] ?? heading,
      ...fields,
      _parse_errors: parseErrors,
    };
  });
}

function blockerSeverity(value) {
  const label = String(value);
  if (label === 'P0' || /^P0-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 3;
  if (label === 'P1' || /^P1-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 2;
  if (label === 'P2' || /^P2-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(label)) return 1;
  return 0;
}

const statusRank = Object.freeze({ building: 3, ready: 2, blocked: 1, done: 0 });

export function rankCards(cards) {
  return [...cards].sort((left, right) =>
    (statusRank[right.status] ?? -1) - (statusRank[left.status] ?? -1)
    || blockerSeverity(right.blocker) - blockerSeverity(left.blocker)
    || Number(right.priority) - Number(left.priority)
    || String(left.id).localeCompare(String(right.id))
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function statusDetail(card) {
  if (card.blocker && card.blocker !== 'none') return card.blocker;
  if (card.blocked_by && card.blocked_by !== 'none') return `blocked by ${card.blocked_by}`;
  return 'no blocker';
}

function generatedViews(cards) {
  const ranked = rankCards(cards);
  const active = ranked.filter((card) => card.status === 'building');
  const ready = ranked.filter((card) => card.status === 'ready');
  const blocked = ranked.filter((card) => card.status === 'blocked');
  const done = ranked.filter((card) => card.status === 'done');
  const next = active[0] ?? ready[0] ?? blocked[0];
  const resume = `# ChopDot Product Resume

Generated from \`product/cards.md\`; do not edit this read model directly.

- Active release: participant-held, local-first public beta.
- First action: **Scan a receipt**.
- Active cards: ${active.map((card) => card.id).join(', ') || 'none'}.
- Ready cards: ${ready.map((card) => card.id).join(', ') || 'none'}.
- Blocked cards: ${blocked.map((card) => card.id).join(', ') || 'none'}.
- Completed cards: ${done.map((card) => card.id).join(', ') || 'none'}.
- Current implementation: partial until production-entrypoint, release, and user evidence close every card.
- Next gate: ${next?.id ?? 'release acceptance'} — ${next?.next_action ?? 'Verify release'}.
- Next selection: explicit status, blocker severity, and priority from \`product/cards.md\`; never source-file order.
- Falsifier: any second authority, raw group secret, fixture-only release proof, or different stage/public fingerprint stops promotion.
`;

  const cardHtml = ranked.map((card) => `
      <article class="card" data-status="${escapeHtml(card.status)}">
        <div class="eyebrow">${escapeHtml(card.id)} · priority ${escapeHtml(card.priority)} · ${escapeHtml(card.pillar)}</div>
        <h2>${escapeHtml(card.title)}</h2>
        <p>${escapeHtml(card.journey)}</p>
        <div class="action">${escapeHtml(card.next_action)}</div>
        <footer><span>${escapeHtml(card.status)} · ${escapeHtml(statusDetail(card))}</span><span>${escapeHtml(card.score)}</span></footer>
      </article>`).join('');

  const board = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChopDot product cockpit</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui;background:#f6f3ed;color:#211f1a}body{margin:0;padding:48px}main{max-width:1200px;margin:auto}.kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#745d3e}h1{font-size:clamp(36px,6vw,72px);line-height:.95;margin:12px 0 18px;max-width:900px}header p{font-size:18px;max-width:700px;color:#665f55}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;margin-top:36px}.card{background:#fff;border:1px solid #dfd8cd;border-radius:20px;padding:22px;box-shadow:0 10px 30px #503d1b10}.card[data-status=building]{border-top:5px solid #ff5f35}.card[data-status=done]{border-top:5px solid #1c9a70}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#7c7162}.card h2{font-size:22px;margin:10px 0}.card p{min-height:72px;color:#5b544a;line-height:1.45}.action{background:#28251f;color:white;border-radius:12px;padding:12px 14px;font-weight:700}.card footer{display:flex;justify-content:space-between;margin-top:16px;font-size:12px;color:#776f63}@media(max-width:600px){body{padding:24px 16px}h1{font-size:42px}}
</style></head><body><main><header><div class="kicker">Private operator view · not a user route</div><h1>One release. One authority. Every money culture.</h1><p>Catch → Management → Payout → History. The release stops when evidence is weaker than the claim.</p></header><section class="grid">${cardHtml}</section></main></body></html>`;
  const tasks = `# Active ChopDot tasks

Generated operator handoff from \`product/cards.md\`; do not edit or use this
read model to reprioritize the Cockpit.

${ranked.filter((card) => card.status !== 'done').map((card) => `- [ ] ${card.id} [${card.status}] priority ${card.priority}: ${card.next_action}`).join('\n')}

Completion dimensions remain separate: implemented, tested, committed, pushed,
candidate_built, staged, promoted, reachable, user_owned, user_proven, kg_known.
`;
  return { resume, board, tasks };
}

async function load() {
  const markdown = await readFile(cardsPath, 'utf8');
  return { markdown, cards: parseCards(markdown) };
}

function daysSince(value, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - parsed.getTime()) / 86_400_000);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function insideRoot(target) {
  return target !== root && target.startsWith(`${root}${path.sep}`);
}

function normalizedMetadataValue(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll('`', '').replace(/[\s_-]+/gu, '-');
}

function markdownMetadata(content) {
  const metadata = {};
  const lines = content.split('\n');
  const labels = ['Kind', 'Status', 'Owner', 'Last reviewed', 'Applies to', 'Authority'];
  for (const [index, label] of labels.entries()) {
    metadata[label] = lines[index + 2]?.match(new RegExp(`^\\*\\*${label}:\\*\\* (.+)$`, 'u'))?.[1]?.trim();
  }
  return metadata;
}

export function markdownMetadataFailures(content) {
  const failures = [];
  const lines = content.split('\n');
  if (!/^# .+/u.test(lines[0] ?? '') || lines[1] !== '') failures.push('source metadata must begin immediately after one H1 and one blank line');
  for (const [index, label] of ['Kind', 'Status', 'Owner', 'Last reviewed', 'Applies to', 'Authority'].entries()) {
    const matches = content.match(new RegExp(`^\\*\\*${label}:\\*\\* .+$`, 'gmu')) ?? [];
    if (matches.length !== 1) failures.push(`source metadata must contain exactly one ${label} line`);
    if (!new RegExp(`^\\*\\*${label}:\\*\\* .+$`, 'u').test(lines[index + 2] ?? '')) failures.push(`source metadata ${label} is outside the canonical top block`);
  }
  return failures;
}

async function trackedRegularFileFailure(relative, tracked, label) {
  if (!relative || path.isAbsolute(relative)) return `${label}: path must be worktree-relative`;
  const lexical = path.resolve(root, relative);
  if (!insideRoot(lexical)) return `${label}: path must resolve inside the exact worktree`;
  if (!tracked.has(relative)) return `${label}: file is not tracked`;
  const info = await lstat(lexical).catch(() => null);
  if (!info) return `${label}: file is missing`;
  if (info.isSymbolicLink()) return `${label}: symlinks are not accepted`;
  if (!info.isFile()) return `${label}: path is not a regular file`;
  const physical = await realpath(lexical).catch(() => null);
  if (!physical || !insideRoot(physical)) return `${label}: real path escapes the exact worktree`;
  return null;
}

async function trackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: root });
  return new Set(stdout.split('\n').filter(Boolean));
}

export function releaseBlockerSetFailures(cards, blockers = []) {
  const failures = [];
  const expected = cards
    .filter((card) => card.status !== 'done' && /^(P0|P1)-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(card.blocker ?? '')))
    .map((card) => `${String(card.blocker).slice(0, 2)}:${card.id}`)
    .sort();
  const declared = blockers
    .filter((blocker) => ['P0', 'P1'].includes(blocker.severity))
    .map((blocker) => `${blocker.severity}:${blocker.card}`)
    .sort();
  if (new Set(declared).size !== declared.length) failures.push('current release blockers contain duplicate P0/P1 cards');
  if (expected.length !== declared.length || expected.some((value, index) => value !== declared[index])) {
    failures.push(`current release P0/P1 blockers must equal the unresolved Cockpit blocker set; expected ${JSON.stringify(expected)}, declared ${JSON.stringify(declared)}`);
  }
  return failures;
}

export function kgKnownShapeFailures(kgv2, expectedIdentity) {
  const failures = [];
  if (kgv2?.current_outcome_known !== true) failures.push('kg_known=true requires current_outcome_known=true');
  if (kgv2?.requested_read_path !== 'v2') failures.push('kg_known=true requires requested_read_path=v2');
  if (kgv2?.active_read_path !== 'context_graph_v2') failures.push('kg_known=true requires active_read_path=context_graph_v2');
  if (kgv2?.fallback_used !== false) failures.push('kg_known=true requires fallback_used=false');
  if (!Number.isInteger(kgv2?.fact_count) || kgv2.fact_count <= 0) failures.push('kg_known=true requires a positive fact_count');
  if (!Number.isInteger(kgv2?.citation_count) || kgv2.citation_count <= 0) failures.push('kg_known=true requires a positive citation_count');
  if (kgv2?.repo_root !== expectedIdentity.root) failures.push('kg_known=true requires the exact worktree root');
  if (kgv2?.branch !== expectedIdentity.branch) failures.push('kg_known=true requires the exact branch');
  if (kgv2?.latest_packet_commit !== expectedIdentity.head) failures.push('kg_known=true requires the Repo Graph packet at HEAD');
  if (!/^[0-9a-f]{64}$/u.test(String(kgv2?.packet_digest ?? ''))) failures.push('kg_known=true requires a lowercase Repo Graph packet digest');
  if (!kgv2?.runtime || typeof kgv2.runtime.kind !== 'string' || typeof kgv2.runtime.python !== 'string') failures.push('kg_known=true requires the active runtime identity');
  if (!Array.isArray(kgv2?.cited_source_paths) || kgv2.cited_source_paths.length === 0) failures.push('kg_known=true requires cited source paths');
  return failures;
}

export function releaseVerdictDependencyFailures(verdicts) {
  const failures = [];
  if (verdicts.promoted === true && verdicts.staged !== true) failures.push('promoted cannot be true while staged is false');
  if (verdicts.byte_reachable === true && verdicts.storage_uploaded !== true) failures.push('byte_reachable=true requires storage_uploaded=true');
  if (verdicts.staged === true && verdicts.candidate_built !== true) failures.push('staged=true requires candidate_built=true');
  if (verdicts.user_owned === true && (verdicts.staged !== true || verdicts.promoted !== true)) failures.push('user_owned=true requires staged=true and promoted=true for the same candidate');
  if (verdicts.user_proven === true && verdicts.user_journey_reachable !== true) failures.push('user_proven=true requires user_journey_reachable=true');
  if (verdicts.tested === 'failed' && (verdicts.user_journey_reachable === true || verdicts.user_proven === true)) failures.push('failed testing cannot coexist with user journey reachability or user proof');
  return failures;
}

export function conditionalRouteKeyFailures(routes = []) {
  const failures = [];
  const seen = new Set();
  for (const route of routes) {
    const key = typeof route?.when === 'string' ? route.when.trim() : '';
    if (!key) failures.push('conditional context route has an empty when key');
    else if (seen.has(key)) failures.push(`conditional context route when key is duplicated: ${key}`);
    else seen.add(key);
  }
  return failures;
}

export function validateCards(cards, now = new Date()) {
  const failures = [];
  const ids = new Set();
  const activePriorities = new Map();
  const requiredFields = ['status', 'priority', 'blocker', 'blocked_by', 'reviewed', 'applies_to', 'evidence_type', 'evidence', 'evidence_sha256', 'pillar', 'journey', 'next_action', 'score', 'authority', 'scope', 'out'];
  const allowedFields = new Set(['id', 'title', '_parse_errors', ...requiredFields]);
  for (const card of cards) {
    for (const failure of card._parse_errors ?? []) failures.push(`${card.id ?? 'unknown'}: ${failure}`);
    if (!card.id || ids.has(card.id)) failures.push(`duplicate or missing id: ${card.id ?? 'unknown'}`);
    ids.add(card.id);
    for (const field of requiredFields) {
      if (!card[field]) failures.push(`${card.id}: missing ${field}`);
    }
    for (const field of Object.keys(card)) if (!allowedFields.has(field)) failures.push(`${card.id}: unknown field ${field}`);
    const score = Number.parseInt(card.score, 10);
    if (!Number.isFinite(score) || score < 8 || score > 10) failures.push(`${card.id}: score must be 8/10..10/10`);
    if (!['ready', 'building', 'blocked', 'done'].includes(card.status)) failures.push(`${card.id}: invalid status ${card.status}`);
    if (card.blocker !== 'none' && !/^P[012]-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(String(card.blocker))) failures.push(`${card.id}: blocker must be none or a canonical P0/P1/P2 slug`);
    const priority = Number(card.priority);
    if (!Number.isInteger(priority) || priority < 0 || priority > 100) failures.push(`${card.id}: priority must be an integer from 0..100`);
    if (['ready', 'building', 'blocked'].includes(card.status) && Number.isInteger(priority)) {
      const prior = activePriorities.get(priority);
      if (prior) failures.push(`${card.id}: priority ${priority} is ambiguous with ${prior}`);
      activePriorities.set(priority, card.id);
    }
    if (card.applies_to !== 'chopdot-v1-launch') failures.push(`${card.id}: applies_to must be chopdot-v1-launch`);
    if (!['source', 'test', 'measurement', 'release'].includes(card.evidence_type)) failures.push(`${card.id}: invalid evidence_type ${card.evidence_type}`);
    if (!/^[0-9a-f]{64}$/u.test(card.evidence_sha256 ?? '')) failures.push(`${card.id}: evidence_sha256 must be a lowercase SHA-256`);
    if (card.evidence && (path.isAbsolute(card.evidence) || !card.evidence.split('/').length)) failures.push(`${card.id}: evidence must be a worktree-relative path`);
    const age = daysSince(card.reviewed, now);
    if (age < 0 || age > 14) failures.push(`${card.id}: reviewed date is missing, future, or older than 14 days`);
    if (card.status === 'blocked' && card.blocked_by === 'none') failures.push(`${card.id}: blocked card must name blocked_by`);
    if (card.status !== 'blocked' && card.blocked_by !== 'none') failures.push(`${card.id}: only blocked cards may name blocked_by`);
  }
  for (const required of ['P-034', 'P-032', 'P-035', 'P-012', 'P-022', 'P-005', 'P-006', 'P-007', 'P-008', 'P-030']) {
    if (!ids.has(required)) failures.push(`missing release card ${required}`);
  }
  for (const card of cards.filter((candidate) => candidate.blocked_by && candidate.blocked_by !== 'none')) {
    for (const blocker of card.blocked_by.split(',').map((value) => value.trim()).filter(Boolean)) {
      if (!ids.has(blocker)) failures.push(`${card.id}: blocked_by references unknown card ${blocker}`);
    }
  }
  const byId = new Map(cards.map((card) => [card.id, card]));
  function visit(card, ancestry = []) {
    if (ancestry.includes(card.id)) {
      failures.push(`${card.id}: blocked_by cycle ${[...ancestry, card.id].join(' -> ')}`);
      return;
    }
    for (const blocker of String(card.blocked_by ?? '').split(',').map((value) => value.trim()).filter((value) => value && value !== 'none')) {
      const target = byId.get(blocker);
      if (target) visit(target, [...ancestry, card.id]);
    }
  }
  for (const card of cards) visit(card);
  return failures;
}

async function cardEvidenceFailures(cards) {
  const failures = [];
  const tracked = await trackedFiles();
  for (const card of cards) {
    const relative = String(card.evidence ?? '');
    const failure = await trackedRegularFileFailure(relative, tracked, `${card.id}: evidence`);
    if (failure) failures.push(failure);
    else {
      const target = path.resolve(root, relative);
      const actual = sha256(await readFile(target));
      if (actual !== card.evidence_sha256) failures.push(`${card.id}: evidence SHA-256 is stale for ${card.evidence}`);
    }
  }
  return failures;
}

async function decisionFailures(now = new Date()) {
  const failures = [];
  const markdown = await readFile(path.join(root, 'product/decisions.md'), 'utf8').catch(() => '');
  const sections = markdown.split(/^## /m).slice(1).filter((section) => section.startsWith('DEC-'));
  const ids = new Set();
  for (const section of sections) {
    const [heading] = section.split('\n');
    const id = heading.match(/^(DEC-\d+)/u)?.[1];
    if (!id || ids.has(id)) failures.push(`decision id is duplicate or missing: ${id ?? heading}`);
    ids.add(id);
    for (const label of ['Date', 'Status', 'Scope', 'Supersedes', 'Decision', 'Reason', 'Falsifier']) {
      if (!new RegExp(`^- ${label}:`, 'mu').test(section)) failures.push(`${id ?? heading}: missing ${label}`);
    }
    const date = section.match(/^- Date: (\d{4}-\d{2}-\d{2})$/mu)?.[1];
    const age = daysSince(date, now);
    if (age < 0 || age > 90) failures.push(`${id ?? heading}: decision date is future or older than 90 days without review`);
  }
  for (const required of ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-004', 'DEC-005', 'DEC-006', 'DEC-007']) {
    if (!ids.has(required)) failures.push(`missing decision ${required}`);
  }
  return failures;
}

async function releaseStateFailures(cards, now = new Date()) {
  const failures = [];
  const tracked = await trackedFiles();
  let release;
  try {
    release = JSON.parse(await readFile(path.join(root, 'docs/release/current-release-state.json'), 'utf8'));
  } catch (error) {
    return [`current release state is missing or invalid: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (release.schema !== 'chopdot.release-state.v1') failures.push('current release state has the wrong schema');
  if (release.kind !== 'measurement' || release.status !== 'active') failures.push('current release state must be an active measurement');
  if (release.owner !== 'release-integrator' || release.applies_to !== 'chopdot-v1-launch') failures.push('current release state has the wrong owner or applies_to');
  if (typeof release.authority !== 'string' || !release.authority) failures.push('current release state must declare its authority boundary');
  const age = daysSince(release.observed_at, now);
  if (age < 0 || age > 7) failures.push('current release state is future or older than 7 days');
  const candidate = release.candidate ?? {};
  if (!/^[0-9a-f]{40}$/u.test(candidate.commit ?? '')) failures.push('current release candidate commit is invalid');
  if (!/^[0-9a-f]{40}$/u.test(candidate.tree ?? '')) failures.push('current release candidate tree is invalid');
  if (!/^[0-9a-f]{64}$/u.test(candidate.car_sha256 ?? '')) failures.push('current release CAR SHA-256 is invalid');
  if (!/^bafy[a-z2-7]{20,}$/u.test(String(candidate.outer_cid ?? ''))) failures.push('current release outer CID is invalid');
  if (!/^bafy[a-z2-7]{20,}$/u.test(String(candidate.inner_app_cid ?? ''))) failures.push('current release inner app CID is invalid');
  if (!/^chopdot-[a-z0-9-]+$/u.test(String(candidate.build_id ?? ''))) failures.push('current release build ID is invalid');
  if (!/^https:\/\//u.test(String(candidate.public_url ?? ''))) failures.push('current release public URL is invalid');
  if (/^[0-9a-f]{40}$/u.test(candidate.commit ?? '')) {
    await execFileAsync('git', ['cat-file', '-e', `${candidate.commit}^{commit}`], { cwd: root }).catch(() => failures.push('current release candidate commit does not exist'));
    const candidateTree = await execFileAsync('git', ['rev-parse', `${candidate.commit}^{tree}`], { cwd: root }).then(({ stdout }) => stdout.trim()).catch(() => null);
    if (candidateTree && candidateTree !== candidate.tree) failures.push('current release candidate tree does not match the candidate commit');
  }
  const verdicts = release.verdicts ?? {};
  failures.push(...releaseVerdictShapeFailures(verdicts, release.verdict_notes));

  const identityEvidence = candidate.identity_evidence ?? {};
  const identityFailure = await trackedRegularFileFailure(identityEvidence.path, tracked, 'candidate identity evidence');
  if (identityFailure) failures.push(identityFailure);
  else if (!/^[0-9a-f]{64}$/u.test(identityEvidence.sha256 ?? '')) failures.push('candidate identity evidence SHA-256 is invalid');
  else {
    const bytes = await readFile(path.resolve(root, identityEvidence.path));
    if (sha256(bytes) !== identityEvidence.sha256) failures.push('candidate identity evidence SHA-256 is stale');
    else {
      let evidence;
      try { evidence = JSON.parse(bytes.toString('utf8')); } catch { failures.push('candidate identity evidence is invalid JSON'); }
      if (evidence) {
        if (evidence.schema !== 'chopdot.frozen-candidate-evidence.v1') failures.push('candidate identity evidence has the wrong schema');
        for (const field of ['commit', 'tree', 'build_id', 'car_sha256', 'outer_cid', 'inner_app_cid']) {
          if (evidence[field] !== candidate[field]) failures.push(`candidate identity evidence disagrees on ${field}`);
        }
        if (verdicts.storage_uploaded === true && !(evidence.readbacks ?? []).some((item) => item.result === 'pass' && item.sha256 === candidate.car_sha256)) failures.push('storage_uploaded=true lacks matching immutable-byte readback evidence');
        for (const source of evidence.sources ?? []) {
          const sourceFailure = await trackedRegularFileFailure(source.path, tracked, `candidate source ${source.path ?? 'unknown'}`);
          if (sourceFailure) failures.push(sourceFailure);
          else if (sha256(await readFile(path.resolve(root, source.path))) !== source.sha256) failures.push(`candidate source SHA-256 is stale for ${source.path}`);
        }
        const carRelative = evidence.car_path;
        if (typeof carRelative !== 'string' || !carRelative || path.isAbsolute(carRelative)) {
          failures.push('candidate CAR path must be worktree-relative');
        } else {
          const carPath = path.resolve(root, carRelative);
          if (!insideRoot(carPath)) failures.push('candidate CAR path must resolve inside the exact worktree');
          else {
            const carInfo = await lstat(carPath).catch(() => null);
            if (carInfo?.isSymbolicLink()) failures.push('candidate CAR path may not be a symlink');
            else if (carInfo && !carInfo.isFile()) failures.push('candidate CAR path is not a regular file');
            else if (carInfo?.isFile()) {
              const physicalCar = await realpath(carPath).catch(() => null);
              if (!physicalCar || !insideRoot(physicalCar)) failures.push('candidate CAR real path escapes the exact worktree');
              else if (sha256(await readFile(physicalCar)) !== candidate.car_sha256) failures.push('available candidate CAR bytes do not match the recorded SHA-256');
            }
          }
        }
      }
    }
  }

  const severe = (release.blockers ?? []).filter((blocker) => ['P0', 'P1'].includes(blocker.severity));
  failures.push(...releaseBlockerSetFailures(cards, release.blockers));
  if (severe.length && verdicts.promoted === true) failures.push('a release with P0/P1 blockers cannot be promoted');
  if (verdicts.candidate_built === true && !identityEvidence.path) failures.push('candidate_built=true requires candidate identity evidence');
  failures.push(...releaseVerdictDependencyFailures(verdicts));

  const verdictEvidenceSchemas = {
    implemented: 'chopdot.implementation-acceptance.v1',
    tested: 'chopdot.test-acceptance.v1',
    committed: 'chopdot.frozen-candidate-evidence.v1',
    pushed: 'chopdot.frozen-candidate-evidence.v1',
    candidate_built: 'chopdot.frozen-candidate-evidence.v1',
    storage_uploaded: 'chopdot.frozen-candidate-evidence.v1',
    byte_reachable: 'chopdot.frozen-candidate-evidence.v1',
    staged: 'chopdot.release-stage-readback.v1',
    promoted: 'chopdot.release-promotion.v1',
    user_journey_reachable: 'chopdot.live-user-journey.v1',
    user_owned: 'chopdot.release-ownership.v1',
    user_proven: 'chopdot.real-participant-acceptance.v1',
    kg_known: 'chopdot.release-agentops-verification.v2',
  };
  for (const [field, expectedSchema] of Object.entries(verdictEvidenceSchemas)) {
    const completed = ['implemented', 'tested'].includes(field) ? verdicts[field] === 'complete' : verdicts[field] === true;
    if (!completed) continue;
    const reference = release.verdict_evidence?.[field];
    const evidenceFailure = await trackedRegularFileFailure(reference?.path, tracked, `current release ${field} verdict evidence`);
    if (evidenceFailure) {
      failures.push(evidenceFailure);
      continue;
    }
    if (!/^[0-9a-f]{64}$/u.test(String(reference?.sha256 ?? ''))) {
      failures.push(`current release ${field} verdict evidence SHA-256 is invalid`);
      continue;
    }
    const evidenceBytes = await readFile(path.resolve(root, reference.path));
    if (sha256(evidenceBytes) !== reference.sha256) {
      failures.push(`current release ${field} verdict evidence SHA-256 is stale`);
      continue;
    }
    let parsedEvidence;
    try { parsedEvidence = JSON.parse(evidenceBytes.toString('utf8')); } catch { failures.push(`current release ${field} verdict evidence is invalid JSON`); }
    if (!parsedEvidence) continue;
    const schema = parsedEvidence.schema ?? (parsedEvidence.schema_version === 2 && parsedEvidence.kind === 'chopdot_release_agentops_verification' ? 'chopdot.release-agentops-verification.v2' : null);
    if (schema !== expectedSchema) failures.push(`current release ${field} verdict evidence has the wrong schema`);
    if (field === 'kg_known') {
      if (parsedEvidence.kg_known !== true) failures.push('kg_known verdict evidence does not report kg_known=true');
      if (parsedEvidence.source_identity?.root !== root || parsedEvidence.source_identity?.branch !== release.branch || parsedEvidence.source_identity?.head !== release.kgv2?.latest_packet_commit) failures.push('kg_known verdict evidence has the wrong exact-worktree identity');
      if (parsedEvidence.repo_graph?.packet_digest !== release.kgv2?.packet_digest) failures.push('kg_known verdict evidence packet digest disagrees with current release state');
      if (parsedEvidence.fact_count !== release.kgv2?.fact_count || parsedEvidence.citation_count !== release.kgv2?.citation_count) failures.push('kg_known verdict evidence fact/citation counts disagree with current release state');
      const evidenceSources = [...new Set(parsedEvidence.citation_source_refs ?? [])].sort();
      const releaseSources = [...new Set(release.kgv2?.cited_source_paths ?? [])].sort();
      if (JSON.stringify(evidenceSources) !== JSON.stringify(releaseSources)) failures.push('kg_known verdict evidence cited paths disagree with current release state');
      const queryEvidence = Object.values(parsedEvidence.queries ?? {});
      if (!queryEvidence.length || !queryEvidence.every((query) => query.read_path?.requested_mode === release.kgv2?.requested_read_path && query.read_path?.active_path === release.kgv2?.active_read_path && query.read_path?.fallback_used === release.kgv2?.fallback_used)) failures.push('kg_known verdict evidence read path disagrees with current release state');
      if (!queryEvidence.length || !queryEvidence.every((query) => query.runtime?.kind === release.kgv2?.runtime?.kind && query.runtime?.python === release.kgv2?.runtime?.python)) failures.push('kg_known verdict evidence runtime disagrees with current release state');
      if (!Object.values(parsedEvidence.checks ?? {}).length || !Object.values(parsedEvidence.checks ?? {}).every((value) => value === true)) failures.push('kg_known verdict evidence contains a failed integration check');
      const queryChecks = Object.values(parsedEvidence.query_checks ?? {}).flatMap((query) => Object.values(query ?? {}));
      if (!queryChecks.length || !queryChecks.every((value) => value === true)) failures.push('kg_known verdict evidence contains a failed query check');
      if (parsedEvidence.kg_lineage?.public_recall_exposes_commit_lineage !== true || parsedEvidence.kg_lineage?.repo_graph_packet_digest !== release.kgv2?.packet_digest) failures.push('kg_known verdict evidence lacks public recall commit lineage');
    } else {
      for (const identityField of ['commit', 'tree', 'build_id', 'car_sha256', 'outer_cid', 'inner_app_cid']) {
        const evidenceValue = parsedEvidence[identityField] ?? parsedEvidence.candidate?.[identityField];
        if (evidenceValue !== candidate[identityField]) failures.push(`current release ${field} verdict evidence disagrees on ${identityField}`);
      }
    }
  }

  const byId = new Map(cards.map((card) => [card.id, card]));
  for (const blocker of release.blockers ?? []) {
    if (!['P0', 'P1', 'P2'].includes(blocker.severity)) failures.push(`release blocker has invalid severity: ${blocker.card ?? 'unknown'}`);
    const card = byId.get(blocker.card);
    if (!card) failures.push(`release blocker references unknown card: ${blocker.card ?? 'unknown'}`);
    else if (card.status !== 'building') failures.push(`release blocker card must be building: ${blocker.card}`);
    else if (!String(card.blocker).startsWith(blocker.severity)) failures.push(`release blocker severity disagrees with card ${blocker.card}`);
    const evidenceFailure = await trackedRegularFileFailure(blocker.evidence, tracked, `release blocker ${blocker.card ?? 'unknown'} evidence`);
    if (evidenceFailure) failures.push(evidenceFailure);
    else if (!/^[0-9a-f]{64}$/u.test(blocker.evidence_sha256 ?? '')) failures.push(`release blocker ${blocker.card ?? 'unknown'} evidence SHA-256 is invalid`);
    else if (sha256(await readFile(path.resolve(root, blocker.evidence))) !== blocker.evidence_sha256) failures.push(`release blocker ${blocker.card ?? 'unknown'} evidence SHA-256 is stale`);
  }
  if (severe.length) {
    const expectedNext = [...severe].sort((left, right) => blockerSeverity(right.severity) - blockerSeverity(left.severity) || Number(byId.get(right.card)?.priority ?? 0) - Number(byId.get(left.card)?.priority ?? 0))[0]?.card;
    const selectedNext = rankCards(cards).find((card) => card.status === 'building')?.id;
    if (expectedNext !== selectedNext) failures.push(`selected next card ${selectedNext ?? 'none'} does not match highest-severity release blocker ${expectedNext ?? 'none'}`);
  }
  const [{ stdout: head }, { stdout: actualBranch }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root }),
    execFileAsync('git', ['branch', '--show-current'], { cwd: root }),
  ]);
  if (release.branch !== actualBranch.trim()) failures.push(`current release branch ${release.branch ?? 'missing'} differs from the actual branch ${actualBranch.trim()}`);
  if (verdicts.pushed === true && /^[0-9a-f]{40}$/u.test(candidate.commit ?? '')) {
    await execFileAsync('git', ['merge-base', '--is-ancestor', candidate.commit, `origin/${release.branch}`], { cwd: root }).catch(() => failures.push('pushed=true but the candidate commit is not on the recorded origin branch'));
  }
  if (verdicts.kg_known === true) {
    failures.push(...kgKnownShapeFailures(release.kgv2, { root, branch: actualBranch.trim(), head: head.trim() }));
    for (const sourcePath of release.kgv2?.cited_source_paths ?? []) {
      const absoluteSource = path.resolve(String(sourcePath));
      if (!path.isAbsolute(String(sourcePath)) || !insideRoot(absoluteSource)) {
        failures.push(`kg_known cited source is outside the exact worktree: ${sourcePath}`);
        continue;
      }
      const relativeSource = path.relative(root, absoluteSource);
      const sourceFailure = await trackedRegularFileFailure(relativeSource, tracked, `kg_known cited source ${sourcePath}`);
      if (sourceFailure) failures.push(sourceFailure);
    }
  }
  if (verdicts.kg_known === false && !(release.kgv2?.stale_reasons?.length > 0)) failures.push('kg_known=false must name stale reasons');
  return failures;
}

async function historyFailures(cards) {
  const failures = [];
  const tracked = await trackedFiles();
  const ids = new Set(cards.map((card) => card.id));
  const files = (await readdir(historyPath).catch(() => [])).filter((file) => file.endsWith('.json')).sort();
  for (const [index, file] of files.entries()) {
    let event;
    try {
      event = JSON.parse(await readFile(path.join(historyPath, file), 'utf8'));
    } catch (error) {
      failures.push(`${file}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (event.sequence !== index + 1 || !file.startsWith(String(index + 1).padStart(4, '0'))) failures.push(`${file}: history sequence is not contiguous`);
    if (!['chopdot.product.checkpoint.v1', 'chopdot.product.checkpoint.v2'].includes(event.schema)) failures.push(`${file}: unsupported checkpoint schema ${event.schema}`);
    for (const id of event.cards ?? []) if (!ids.has(id)) failures.push(`${file}: unknown card ${id}`);
    if (!/^[0-9a-f]{64}$/u.test(event.sourceSha256 ?? '')) failures.push(`${file}: invalid source SHA-256`);
    if (event.evidence) {
      const evidenceFailure = await trackedRegularFileFailure(event.evidence, tracked, `${file}: evidence`);
      if (evidenceFailure) failures.push(evidenceFailure);
      if (!['partial', 'strong', 'live'].includes(event.evidenceQuality)) failures.push(`${file}: invalid evidence quality`);
      if (event.schema === 'chopdot.product.checkpoint.v2') {
        if (!/^[0-9a-f]{64}$/u.test(event.evidenceSha256 ?? '')) failures.push(`${file}: v2 evidence SHA-256 is invalid`);
        else if (!evidenceFailure && sha256(await readFile(path.resolve(root, event.evidence))) !== event.evidenceSha256) failures.push(`${file}: v2 evidence SHA-256 is stale`);
      }
    }
  }
  return failures;
}

async function loadContextAuthority() {
  return JSON.parse(await readFile(contextAuthorityPath, 'utf8'));
}

function sourceMetadata(relative, content) {
  if (relative.endsWith('.json')) {
    try {
      const value = JSON.parse(content);
      return {
        Kind: value.kind,
        Status: value.status,
        Owner: value.owner,
        'Last reviewed': value.last_reviewed ?? value.observed_at,
        'Applies to': value.applies_to,
        Authority: value.authority,
      };
    } catch {
      return {};
    }
  }
  return markdownMetadata(content);
}

function metadataFailures(entry, content) {
  const failures = entry.path.endsWith('.json') ? [] : markdownMetadataFailures(content).map((failure) => `${entry.path}: ${failure}`);
  const actual = sourceMetadata(entry.path, content);
  const mapping = {
    Kind: entry.kind,
    Status: entry.status,
    Owner: entry.owner,
    'Last reviewed': entry.last_reviewed,
    'Applies to': entry.applies_to,
    Authority: entry.authority,
  };
  for (const [label, expected] of Object.entries(mapping)) {
    if (!actual[label]) failures.push(`${entry.path}: source metadata is missing ${label}`);
    else if (normalizedMetadataValue(actual[label]) !== normalizedMetadataValue(expected)) failures.push(`${entry.path}: source metadata ${label} disagrees with the context manifest`);
  }
  return failures;
}

export function requiredReadOrderFailures(agents, expected) {
  const failures = [];
  const headingCount = agents.match(/^## Required read order$/gmu)?.length ?? 0;
  if (headingCount !== 1) failures.push(`AGENTS.md must contain exactly one Required read order heading; found ${headingCount}`);
  const readOrderStart = agents.indexOf('## Required read order');
  const readOrderTail = readOrderStart >= 0 ? agents.slice(readOrderStart + '## Required read order'.length) : '';
  const nextHeading = readOrderTail.search(/^## /mu);
  const readOrderSection = nextHeading >= 0 ? readOrderTail.slice(0, nextHeading) : readOrderTail;
  const declared = [];
  const numbers = [];
  for (const line of readOrderSection.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^(\d+)\. `([^`]+)`$/u);
    if (match) {
      numbers.push(Number(match[1]));
      declared.push(match[2]);
    } else failures.push(`AGENTS.md required read order contains non-list content: ${JSON.stringify(line)}`);
  }
  if (declared.length !== expected.length || declared.some((value, index) => value !== expected[index])) failures.push(`AGENTS.md read order must equal the manifest exactly; declared ${JSON.stringify(declared)}`);
  if (numbers.some((value, index) => value !== index + 1)) failures.push('AGENTS.md read order numbering must be contiguous from 1');
  if (declared.some((value) => path.isAbsolute(value))) failures.push('AGENTS.md read order may not contain absolute paths');
  return failures;
}

export function releaseVerdictShapeFailures(verdicts, verdictNotes = {}) {
  const failures = [];
  const verdictFields = ['implemented', 'tested', 'committed', 'pushed', 'candidate_built', 'storage_uploaded', 'staged', 'promoted', 'byte_reachable', 'user_journey_reachable', 'user_owned', 'user_proven', 'kg_known'];
  for (const field of verdictFields) if (verdicts[field] === undefined) failures.push(`current release verdict is missing ${field}`);
  for (const field of Object.keys(verdicts)) if (!verdictFields.includes(field)) failures.push(`current release verdict has unknown field ${field}`);
  for (const field of ['implemented', 'tested']) {
    if (!['not-started', 'partial', 'complete', 'failed'].includes(verdicts[field])) failures.push(`current release verdict ${field} must use the declared status enum`);
  }
  for (const field of verdictFields.filter((field) => !['implemented', 'tested'].includes(field))) {
    if (typeof verdicts[field] !== 'boolean') failures.push(`current release verdict ${field} must be boolean`);
  }
  for (const field of verdictFields) {
    if (typeof verdictNotes[field] !== 'string' || !verdictNotes[field]) failures.push(`current release verdict ${field} must have a non-empty verdict note`);
  }
  return failures;
}

async function contextFailures(now = new Date()) {
  const failures = [];
  let manifest;
  try {
    manifest = await loadContextAuthority();
  } catch (error) {
    return [`product/context-authority.json is missing or invalid: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (manifest.schema !== 'chopdot.context-authority.v1') failures.push('context authority schema must be chopdot.context-authority.v1');
  if (manifest.status !== 'active') failures.push('context authority manifest is not active');
  for (const field of ['owner', 'last_reviewed', 'exact_root', 'branch']) if (!manifest[field]) failures.push(`context authority manifest is missing ${field}`);
  if (daysSince(manifest.last_reviewed, now) < 0 || daysSince(manifest.last_reviewed, now) > 14) failures.push('context authority manifest review is future or older than 14 days');
  const [{ stdout: actualRoot }, { stdout: actualBranch }, { stdout: trackedOutput }] = await Promise.all([
    execFileAsync('git', ['rev-parse', '--show-toplevel'], { cwd: root }),
    execFileAsync('git', ['branch', '--show-current'], { cwd: root }),
    execFileAsync('git', ['ls-files'], { cwd: root }),
  ]);
  if (path.resolve(actualRoot.trim()) !== path.resolve(manifest.exact_root)) failures.push(`context root mismatch: ${actualRoot.trim()} != ${manifest.exact_root}`);
  if (actualBranch.trim() !== manifest.branch) failures.push(`context branch mismatch: ${actualBranch.trim()} != ${manifest.branch}`);

  const validKinds = new Set(['law', 'decision', 'measurement', 'guardrail', 'exploration', 'read-model']);
  const validStatuses = new Set(['active', 'accepted', 'superseded', 'historical', 'generated']);
  const seen = new Set();
  const tracked = new Set(trackedOutput.split('\n').filter(Boolean));
  for (const required of ['AGENTS.md', 'PROJECT_DIRECTIVES.md', 'product/context-authority.json']) {
    if (!tracked.has(required)) failures.push(`${required}: operative context file is not tracked`);
  }
  for (const entry of manifest.default_read_order ?? []) {
    if (!entry.path || seen.has(entry.path)) failures.push(`context path is duplicate or missing: ${entry.path ?? 'unknown'}`);
    seen.add(entry.path);
    for (const field of ['kind', 'status', 'owner', 'last_reviewed', 'freshness_days', 'applies_to', 'authority']) {
      if (entry[field] === undefined || entry[field] === '') failures.push(`${entry.path ?? 'unknown'}: missing ${field}`);
    }
    if (!validKinds.has(entry.kind)) failures.push(`${entry.path}: invalid kind ${entry.kind}`);
    if (!validStatuses.has(entry.status)) failures.push(`${entry.path}: invalid status ${entry.status}`);
    if (!Number.isInteger(entry.freshness_days) || entry.freshness_days <= 0) failures.push(`${entry.path}: freshness_days must be a positive integer`);
    const sourceFailure = await trackedRegularFileFailure(entry.path, tracked, `${entry.path}: default context`);
    if (sourceFailure) failures.push(sourceFailure);
    else {
      const content = await readFile(path.resolve(root, entry.path), 'utf8');
      failures.push(...metadataFailures(entry, content));
      if (!/^[0-9a-f]{64}$/u.test(entry.sha256 ?? '')) failures.push(`${entry.path}: manifest SHA-256 is missing or invalid`);
      else if (sha256(content) !== entry.sha256) failures.push(`${entry.path}: manifest SHA-256 is stale`);
    }
    const age = daysSince(entry.last_reviewed, now);
    if (age < 0 || age > Number(entry.freshness_days)) failures.push(`${entry.path}: review date is future or exceeds ${entry.freshness_days} days`);
    if (entry.kind === 'read-model' && !/read model|read-model|navigation/iu.test(entry.authority)) failures.push(`${entry.path}: read-model authority boundary is unclear`);
  }
  const lawEntries = (manifest.default_read_order ?? []).filter((entry) => entry.kind === 'law');
  if (lawEntries.length !== 1 || lawEntries[0]?.path !== 'PRODUCT_TRUTH.md') failures.push('PRODUCT_TRUTH.md must be the sole product-law entry');

  failures.push(...conditionalRouteKeyFailures(manifest.conditional_routes));
  for (const route of manifest.conditional_routes ?? []) {
    if (!route.when || !route.authority || !Array.isArray(route.sources) || route.sources.length === 0) failures.push('conditional context route is missing when, authority, or sources');
    for (const entry of route.sources ?? []) {
      for (const field of ['path', 'kind', 'status', 'owner', 'last_reviewed', 'freshness_days', 'applies_to', 'authority', 'sha256']) {
        if (entry[field] === undefined || entry[field] === '') failures.push(`${entry.path ?? 'unknown'}: conditional context source is missing ${field}`);
      }
      if (!validKinds.has(entry.kind)) failures.push(`${entry.path}: invalid conditional kind ${entry.kind}`);
      if (!validStatuses.has(entry.status)) failures.push(`${entry.path}: invalid conditional status ${entry.status}`);
      if (!Number.isInteger(entry.freshness_days) || entry.freshness_days <= 0) failures.push(`${entry.path}: conditional freshness_days must be a positive integer`);
      const sourceFailure = await trackedRegularFileFailure(entry.path, tracked, `${entry.path}: conditional context`);
      if (sourceFailure) failures.push(sourceFailure);
      else {
        const content = await readFile(path.resolve(root, entry.path), 'utf8');
        failures.push(...metadataFailures(entry, content));
        if (!/^[0-9a-f]{64}$/u.test(entry.sha256 ?? '') || sha256(content) !== entry.sha256) failures.push(`${entry.path}: conditional manifest SHA-256 is missing, invalid, or stale`);
      }
      const age = daysSince(entry.last_reviewed, now);
      if (age < 0 || age > Number(entry.freshness_days)) failures.push(`${entry.path}: conditional review date is future or stale`);
    }
  }
  for (const surface of manifest.derived_surfaces ?? []) {
    if (!surface.path || !surface.source || surface.authority === undefined) failures.push('derived surface is missing path, source, or authority');
    else {
      const surfaceFailure = await trackedRegularFileFailure(surface.path, tracked, `${surface.path}: derived surface`);
      if (surfaceFailure) failures.push(surfaceFailure);
    }
  }

  const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8').catch(() => '');
  const expected = ['product/context-authority.json', ...(manifest.default_read_order ?? []).map((entry) => entry.path)];
  failures.push(...requiredReadOrderFailures(agents, expected));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8').catch(() => '');
  for (const obsolete of ['This repository is a portable-shell trial', 'This is not production', 'Payments are out of scope', 'Receipt capture is out of scope']) {
    if (readme.includes(obsolete)) failures.push(`README.md contains obsolete launch claim: ${obsolete}`);
  }
  return failures;
}

async function governanceFailures(cards) {
  return [
    ...await contextFailures(),
    ...validateCards(cards),
    ...await cardEvidenceFailures(cards),
    ...await decisionFailures(),
    ...await releaseStateFailures(cards),
    ...await historyFailures(cards),
  ];
}

async function validateContext() {
  const { cards } = await load();
  const failures = await governanceFailures(cards);
  const expectedViews = generatedViews(cards);
  for (const [target, content] of [[resumePath, expectedViews.resume], [boardPath, expectedViews.board], [tasksPath, expectedViews.tasks]]) {
    if (await readFile(target, 'utf8').catch(() => null) !== content) failures.push(`${path.relative(root, target)} is missing or stale`);
  }
  await execFileAsync(process.execPath, ['scripts/chopdot-wiki.mjs', 'validate'], { cwd: root }).catch((error) => failures.push(`wiki derived surfaces are invalid: ${error.stderr?.trim?.() || error.message}`));
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
    return false;
  }
  const manifest = await loadContextAuthority();
  const [{stdout: head}, {stdout: tree}, {stdout: branch}, {stdout: status}] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], {cwd: root}),
    execFileAsync('git', ['rev-parse', 'HEAD^{tree}'], {cwd: root}),
    execFileAsync('git', ['branch', '--show-current'], {cwd: root}),
    execFileAsync('git', ['status', '--short', '--branch'], {cwd: root}),
  ]);
  console.log(`Context authority valid (${manifest.default_read_order.length} default sources).`);
  console.log(`Root: ${root}`);
  console.log(`Branch: ${branch.trim()}`);
  console.log(`HEAD: ${head.trim()}`);
  console.log(`Tree: ${tree.trim()}`);
  console.log(`Git status:\n${status.trim() || 'clean'}`);
  return true;
}

async function refresh() {
  const { cards } = await load();
  const failures = [...await contextFailures(), ...validateCards(cards), ...await cardEvidenceFailures(cards), ...await decisionFailures(), ...await releaseStateFailures(cards), ...await historyFailures(cards)];
  if (failures.length) throw new Error(failures.join('\n'));
  const views = generatedViews(cards);
  await mkdir(path.dirname(resumePath), { recursive: true });
  await writeFile(resumePath, views.resume);
  await writeFile(boardPath, views.board);
  await mkdir(path.dirname(tasksPath), { recursive: true });
  await writeFile(tasksPath, views.tasks);
  console.log(`Product cockpit refreshed (${cards.length} cards).`);
}

async function validate() {
  const { cards } = await load();
  const failures = await governanceFailures(cards);
  const expected = generatedViews(cards);
  for (const [target, content] of [[resumePath, expected.resume], [boardPath, expected.board], [tasksPath, expected.tasks]]) {
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
  const failures = await governanceFailures(cards);
  if (failures.length) throw new Error(failures.join('\n'));
  const queryText = args._.join(' ').toLowerCase();
  const selected = queryText === 'next'
    ? rankCards(cards).filter((card) => card.status === 'building').slice(0, 1)
    : cards.filter((card) => JSON.stringify(card).toLowerCase().includes(queryText));
  console.log(selected.map((card) => `${card.id} [${card.status}] ${card.title}\n  Next: ${card.next_action}`).join('\n'));
}

async function setStatus(command, args) {
  const id = args.id;
  if (!id) throw new Error(`${command} requires --id=P-XXX`);
  const { markdown, cards } = await load();
  const governance = await governanceFailures(cards);
  if (governance.length) throw new Error(governance.join('\n'));
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`Unknown card ${id}`);
  const expected = command === 'start' ? ['ready', 'blocked', 'building'] : ['building', 'blocked'];
  if (!expected.includes(card.status)) throw new Error(`${id} cannot ${command} from ${card.status}`);
  if (command === 'finish' && !args.evidence) throw new Error(`${id} finish requires --evidence=PATH`);
  if (command === 'start' && card.status === 'blocked') {
    const blockerIds = String(card.blocked_by).split(',').map((value) => value.trim()).filter((value) => value && value !== 'none');
    const unresolved = blockerIds.filter((blockerId) => cards.find((candidate) => candidate.id === blockerId)?.status !== 'done');
    if (unresolved.length) throw new Error(`${id} remains blocked by ${unresolved.join(', ')}`);
  }
  const next = command === 'start' ? 'building' : 'done';
  const sectionPattern = new RegExp(`(## ${id}[^\\n]*[\\s\\S]*?\\nstatus: )${card.status}(?=[\\s\\S]*?(?:\\n## P-|$))`);
  let updated = markdown.replace(sectionPattern, `$1${next}`);
  const sectionBoundary = new RegExp(`(## ${id}[^\\n]*[\\s\\S]*?)(?=\\n## P-|$)`);
  updated = updated.replace(sectionBoundary, (section) => section
    .replace(/^reviewed: .*$/mu, `reviewed: ${new Date().toISOString().slice(0, 10)}`)
    .replace(/^blocked_by: .*$/mu, 'blocked_by: none')
    .replace(/^blocker: .*$/mu, 'blocker: none'));
  if (updated === markdown && card.status !== next) throw new Error(`Could not update ${id}`);
  await writeFile(cardsPath, updated);
  await checkpoint({ ...args, cards: id, summary: args.summary ?? `${id} ${next}` }, next);
  await refresh();
}

async function checkpoint(args, forcedState) {
  await mkdir(historyPath, { recursive: true });
  const files = (await readdir(historyPath).catch(() => [])).filter((file) => file.endsWith('.json'));
  const highest = files.reduce((maximum, file) => Math.max(maximum, Number.parseInt(file.slice(0, 4), 10) || 0), 0);
  const sequence = String(highest + 1).padStart(4, '0');
  const cards = String(args.cards ?? args.id ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!args.summary) throw new Error('checkpoint requires --summary="..."');
  const knownCards = new Set((await load()).cards.map((card) => card.id));
  for (const id of cards) if (!knownCards.has(id)) throw new Error(`checkpoint references unknown card ${id}`);
  const evidenceTarget = args.evidence ? path.resolve(root, String(args.evidence)) : undefined;
  if (evidenceTarget) {
    const evidenceFailure = await trackedRegularFileFailure(String(args.evidence), await trackedFiles(), 'checkpoint evidence');
    if (evidenceFailure) throw new Error(evidenceFailure);
  }
  const evidence = evidenceTarget ? path.relative(root, evidenceTarget) : undefined;
  const evidenceQuality = args['evidence-quality'];
  if (evidence && !['partial', 'strong', 'live'].includes(evidenceQuality)) throw new Error('checkpoint evidence requires --evidence-quality=partial|strong|live');
  const [{ stdout: head }, { stdout: tree }, { stdout: branch }, { stdout: status }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: root }),
    execFileAsync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root }),
    execFileAsync('git', ['branch', '--show-current'], { cwd: root }),
    execFileAsync('git', ['status', '--short'], { cwd: root }),
  ]);
  const payload = {
    schema: 'chopdot.product.checkpoint.v2',
    sequence: Number(sequence),
    state: forcedState ?? 'checkpoint',
    cards,
    summary: String(args.summary),
    evidence,
    evidenceQuality,
    evidenceSha256: evidenceTarget ? createHash('sha256').update(await readFile(evidenceTarget)).digest('hex') : undefined,
    source: 'product/cards.md',
    sourceSha256: createHash('sha256').update(await readFile(cardsPath)).digest('hex'),
    git: {
      root,
      branch: branch.trim(),
      head: head.trim(),
      tree: tree.trim(),
      dirtyPaths: status.split('\n').filter(Boolean),
    },
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

async function resume() {
  const {cards} = await load();
  const failures = await governanceFailures(cards);
  const expected = generatedViews(cards).resume;
  const current = await readFile(resumePath, 'utf8').catch(() => null);
  if (current !== expected) failures.push('product/generated/product-resume.md is missing or stale; run product:refresh');
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(current);
}

async function main() {
  const [command = 'resume', ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  try {
    if (command === 'context-validate') await validateContext();
    else if (command === 'refresh') await refresh();
    else if (command === 'validate') await validate();
    else if (command === 'query') await query(args);
    else if (command === 'resume') await resume();
    else if (command === 'start' || command === 'finish') await setStatus(command, args);
    else if (command === 'checkpoint') await checkpoint(args);
    else if (command === 'screenshot') await screenshot();
    else if (command === 'visual-review') await visualReview();
    else throw new Error(`Unknown product cockpit command: ${command}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
