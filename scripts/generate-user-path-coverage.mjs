#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const sourcePath = resolve(repoRoot, 'product/user-path-map.md');
const visualSourcePath = resolve(repoRoot, 'product/user-path-map.mmd');
const generatedDir = resolve(repoRoot, 'product/generated');
const evidenceDir = resolve(repoRoot, 'product/evidence');
const command = process.argv[2] ?? 'refresh';

const validCommands = new Set(['refresh', 'validate']);
if (!validCommands.has(command)) {
  console.error(`Unknown user path coverage command: ${command}`);
  console.error(`Valid commands: ${[...validCommands].join(', ')}`);
  process.exit(1);
}

main();

function main() {
  if (command === 'refresh') ensureDirs();
  const model = buildCoverageModel();
  const validation = validateCoverage(model);
  const outputs = buildOutputs(model, validation);

  if (command === 'refresh') writeOutputs(outputs);
  if (command === 'validate') validateOutputs(outputs, validation);
  printSummary(model, validation);

  if (validation.summary.errors > 0) {
    process.exitCode = 1;
  }
}

function buildCoverageModel() {
  const source = readFile(sourcePath);
  const visualSource = existsSync(visualSourcePath) ? readFile(visualSourcePath) : '';
  const paths = parseSections(source, /^###\s+(N-\d+):\s+(.+)$/gm).map((section) => {
    const data = parseYamlBlock(section.body);
    return normalizePath({
      id: data.id ?? section.id,
      title: section.title,
      next_actions: parseBulletSection(section.body, 'Next available actions'),
      terminal_reason: parseBulletSection(section.body, 'Valid terminal condition'),
      ...data,
    });
  });
  const deadEnds = parseSections(source, /^###\s+(D-\d+):\s+(.+)$/gm).map((section) => {
    const data = parseYamlBlock(section.body);
    return normalizeDeadEnd({
      id: data.id ?? section.id,
      title: section.title,
      ...data,
    });
  });
  const deadEndsByPath = mapDeadEndsByPath(deadEnds);
  const enrichedPaths = paths.map((path) => {
    const linkedDeadEnds = deadEndsByPath.get(path.id) ?? [];
    return {
      ...path,
      implementation_status: chooseImplementationStatus(linkedDeadEnds),
      risk: chooseRisk(linkedDeadEnds),
      dead_ends: linkedDeadEnds.map((deadEnd) => deadEnd.id),
    };
  });
  const surfaces = collectSurfaces(enrichedPaths);
  const summary = buildSummary(enrichedPaths, deadEnds, surfaces);

  return {
    sourceHash: createHash('sha256').update(source).update('\0').update(visualSource).digest('hex'),
    sources: {
      map: 'product/user-path-map.md',
      visual: 'product/user-path-map.mmd',
    },
    summary,
    surfaces,
    paths: enrichedPaths,
    deadEnds,
    visualSource,
  };
}

function normalizePath(path) {
  const surfaces = isPlainObject(path.surfaces) ? path.surfaces : {};
  const proof = isPlainObject(path.proof) ? path.proof : {};
  return {
    id: String(path.id ?? ''),
    title: String(path.title ?? ''),
    journey: String(path.journey ?? ''),
    actor: String(path.actor ?? ''),
    entry_state: String(path.entry_state ?? ''),
    action: String(path.action ?? ''),
    result_state: String(path.result_state ?? ''),
    terminal: Boolean(path.terminal),
    owner_cards: toList(path.owner_cards),
    surfaces,
    proof: {
      status: String(proof.status ?? 'missing'),
      screenshot: String(proof.screenshot ?? 'missing'),
      e2e: String(proof.e2e ?? 'missing'),
    },
    dead_end_risk: String(path.dead_end_risk ?? ''),
    next_actions: toList(path.next_actions),
    terminal_reason: toList(path.terminal_reason),
  };
}

function normalizeDeadEnd(deadEnd) {
  return {
    id: String(deadEnd.id ?? ''),
    title: String(deadEnd.title ?? ''),
    path: deadEnd.path ? String(deadEnd.path) : '',
    paths: toList(deadEnd.paths),
    severity: String(deadEnd.severity ?? 'unknown'),
    status: String(deadEnd.status ?? 'unreviewed_risk'),
    owner_card: String(deadEnd.owner_card ?? ''),
    observed_on: toList(deadEnd.observed_on),
    problem: String(deadEnd.problem ?? ''),
    expected: String(deadEnd.expected ?? ''),
    evidence: toList(deadEnd.evidence),
  };
}

function parseSections(source, regex) {
  const matches = [...source.matchAll(regex)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    return {
      id: match[1],
      title: match[2].trim(),
      body: source.slice(start, end),
    };
  });
}

function parseYamlBlock(markdown) {
  const match = markdown.match(/```yaml\n([\s\S]*?)\n```/);
  if (!match) return {};
  return parseLooseYaml(match[1]);
}

function parseBulletSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`${escaped}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][^\\n]+:\\s*\\n|\\n###|$)`));
  if (!match) return [];
  return [...match[1].matchAll(/^\s*-\s+(.+)$/gm)].map((item) => item[1].trim());
}

function parseLooseYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (/^\s/.test(raw)) continue;
    const match = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim();
    if (value === '') {
      const list = [];
      for (let nested = index + 1; nested < lines.length; nested += 1) {
        const nestedLine = lines[nested];
        if (!nestedLine.trim()) continue;
        if (!/^\s/.test(nestedLine)) break;
        const listMatch = nestedLine.match(/^\s*-\s*(.*)$/);
        if (listMatch) {
          list.push(parseScalar(listMatch[1].trim()));
          index = nested;
        }
      }
      result[key] = list;
    } else {
      result[key] = parseScalar(value);
    }
  }
  return result;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '[]') return [];
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return parseInlineArray(trimmed);
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return parseInlineMap(trimmed);
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseInlineArray(value) {
  const inner = value.slice(1, -1).trim();
  if (!inner) return [];
  return splitTopLevel(inner).map((item) => parseScalar(item.trim()));
}

function parseInlineMap(value) {
  const inner = value.slice(1, -1).trim();
  if (!inner) return {};
  const out = {};
  for (const part of splitTopLevel(inner)) {
    const index = part.indexOf(':');
    if (index === -1) continue;
    const key = part.slice(0, index).trim().replace(/^["']|["']$/g, '');
    const raw = part.slice(index + 1).trim();
    out[key] = parseScalar(raw);
  }
  return out;
}

function splitTopLevel(value) {
  const parts = [];
  let current = '';
  let quote = null;
  let depth = 0;
  for (const char of value) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function mapDeadEndsByPath(deadEnds) {
  const map = new Map();
  for (const deadEnd of deadEnds) {
    const pathIds = unique([deadEnd.path, ...deadEnd.paths].filter(Boolean));
    for (const pathId of pathIds) {
      if (!map.has(pathId)) map.set(pathId, []);
      map.get(pathId).push(deadEnd);
    }
  }
  return map;
}

function chooseImplementationStatus(deadEnds) {
  if (deadEnds.length === 0) return 'unproven';
  const order = [
    'not_built',
    'built_wrong_order',
    'known_gap',
    'built_ambiguous',
    'lane_mismatch',
    'not_built_or_unproven',
    'partly_mitigated_backend_unproven_ui',
    'unreviewed_risk',
    'unproven',
    'built',
  ];
  const statuses = deadEnds.map((deadEnd) => deadEnd.status);
  return statuses.sort((a, b) => statusRank(a, order) - statusRank(b, order))[0] ?? 'unproven';
}

function statusRank(status, order) {
  const index = order.indexOf(status);
  return index === -1 ? order.length : index;
}

function chooseRisk(deadEnds) {
  if (deadEnds.length === 0) return 'unreviewed';
  const order = ['critical', 'high', 'medium', 'low', 'unknown'];
  const severities = deadEnds.map((deadEnd) => deadEnd.severity);
  return severities.sort((a, b) => statusRank(a, order) - statusRank(b, order))[0] ?? 'unknown';
}

function collectSurfaces(paths) {
  const names = unique(paths.flatMap((path) => Object.keys(path.surfaces))).sort();
  return names.map((name) => {
    const counts = countValues(paths.map((path) => path.surfaces[name] ?? 'unknown'));
    return { name, counts };
  });
}

function buildSummary(paths, deadEnds, surfaces) {
  const riskOrder = ['critical', 'high', 'medium', 'low', 'unreviewed'];
  const implementationOrder = ['not_built', 'built_wrong_order', 'known_gap', 'built_ambiguous', 'lane_mismatch', 'not_built_or_unproven', 'partly_mitigated_backend_unproven_ui', 'unproven', 'built'];
  return {
    paths: paths.length,
    deadEnds: deadEnds.length,
    implementation: countValues(paths.map((path) => path.implementation_status)),
    proof: countValues(paths.map((path) => path.proof.status)),
    risk: countValues(paths.map((path) => path.risk)),
    surfaces: Object.fromEntries(surfaces.map((surface) => [surface.name, surface.counts])),
    highestRisk: paths
      .filter((path) => ['critical', 'high'].includes(path.risk) || ['not_built', 'built_wrong_order', 'known_gap'].includes(path.implementation_status))
      .sort((a, b) =>
        statusRank(a.risk, riskOrder) - statusRank(b.risk, riskOrder)
        || statusRank(a.implementation_status, implementationOrder) - statusRank(b.implementation_status, implementationOrder)
        || statusRank(a.proof.status, ['missing', 'partial', 'reviewed', 'automated', 'strong']) - statusRank(b.proof.status, ['missing', 'partial', 'reviewed', 'automated', 'strong'])
        || a.id.localeCompare(b.id))
      .slice(0, 12)
      .map((path) => ({
        id: path.id,
        title: path.title,
        implementation_status: path.implementation_status,
        proof_status: path.proof.status,
        risk: path.risk,
        dead_ends: path.dead_ends,
        owner_cards: path.owner_cards,
      })),
  };
}

function validateCoverage(model) {
  const issues = [];
  if (!existsSync(sourcePath)) addIssue(issues, 'error', 'source', 'missing-source', 'product/user-path-map.md is missing.');
  if (!existsSync(visualSourcePath)) addIssue(issues, 'error', 'source', 'missing-visual-source', 'product/user-path-map.mmd is missing.');
  if (model.paths.length === 0) addIssue(issues, 'error', 'paths', 'no-paths', 'No N-* paths were parsed.');
  if (model.deadEnds.length === 0) addIssue(issues, 'warning', 'dead-ends', 'no-dead-ends', 'No D-* dead ends were parsed.');

  const validSurfaceStatuses = new Set(['works', 'partial', 'known_gap', 'unknown', 'not_started', 'not_applicable']);
  const requiredSurfaces = ['web', 'telegram', 'dot_paseo', 'circles_gnosis'];
  const validProofStatuses = new Set(['missing', 'partial', 'reviewed', 'automated', 'strong']);
  const pathIds = new Set();
  const cardIds = new Set([...readFile(resolve(repoRoot, 'product/cards.md')).matchAll(/^id:\s*"(P-\d+)"/gm)].map((match) => match[1]));

  for (const path of model.paths) {
    if (pathIds.has(path.id)) addIssue(issues, 'error', path.id, 'duplicate-path', `${path.id} is declared more than once.`);
    pathIds.add(path.id);
    for (const field of ['id', 'title', 'journey', 'actor', 'entry_state', 'action', 'result_state']) {
      if (!path[field]) addIssue(issues, 'error', path.id || 'path', `missing-${field}`, `${path.id || 'path'} is missing ${field}.`);
    }
    if (path.owner_cards.length === 0) addIssue(issues, 'error', path.id, 'missing-owner-card', `${path.id} has no owner_cards.`);
    for (const ownerCard of path.owner_cards) {
      if (!cardIds.has(ownerCard)) addIssue(issues, 'error', path.id, 'unknown-owner-card', `${path.id} references unknown owner card ${ownerCard}.`);
    }
    if (Object.keys(path.surfaces).length === 0) addIssue(issues, 'error', path.id, 'missing-surfaces', `${path.id} has no surfaces.`);
    for (const surface of requiredSurfaces) {
      if (!(surface in path.surfaces)) addIssue(issues, 'error', path.id, 'missing-surface', `${path.id} is missing surface status for ${surface}.`);
      else if (!validSurfaceStatuses.has(path.surfaces[surface])) addIssue(issues, 'error', path.id, 'invalid-surface-status', `${path.id} has invalid ${surface} status ${path.surfaces[surface]}.`);
    }
    if (!validProofStatuses.has(path.proof.status)) addIssue(issues, 'error', path.id, 'invalid-proof-status', `${path.id} has invalid proof.status ${path.proof.status}.`);
    if (path.terminal && path.terminal_reason.length === 0) addIssue(issues, 'error', path.id, 'missing-terminal-reason', `${path.id} is terminal but has no valid terminal condition.`);
    if (!path.terminal && path.next_actions.length === 0) addIssue(issues, 'error', path.id, 'missing-next-actions', `${path.id} is non-terminal but has no next available actions.`);
    if (!model.visualSource.includes(path.id)) addIssue(issues, 'error', path.id, 'missing-from-visual', `${path.id} is missing from product/user-path-map.mmd.`);
  }

  const deadEndIds = new Set();
  for (const deadEnd of model.deadEnds) {
    if (deadEndIds.has(deadEnd.id)) addIssue(issues, 'error', deadEnd.id, 'duplicate-dead-end', `${deadEnd.id} is declared more than once.`);
    deadEndIds.add(deadEnd.id);
    if (!deadEnd.severity) addIssue(issues, 'error', deadEnd.id, 'missing-severity', `${deadEnd.id} has no severity.`);
    if (!deadEnd.status) addIssue(issues, 'error', deadEnd.id, 'missing-status', `${deadEnd.id} has no status.`);
    if (!deadEnd.owner_card) addIssue(issues, 'error', deadEnd.id, 'missing-owner-card', `${deadEnd.id} has no owner_card.`);
    else if (!cardIds.has(deadEnd.owner_card)) addIssue(issues, 'error', deadEnd.id, 'unknown-owner-card', `${deadEnd.id} references unknown owner card ${deadEnd.owner_card}.`);
    if (!deadEnd.problem) addIssue(issues, 'error', deadEnd.id, 'missing-problem', `${deadEnd.id} has no problem.`);
    if (!deadEnd.expected) addIssue(issues, 'error', deadEnd.id, 'missing-expected', `${deadEnd.id} has no expected behavior.`);
    for (const pathId of [deadEnd.path, ...deadEnd.paths].filter(Boolean)) {
      if (!pathIds.has(pathId)) addIssue(issues, 'error', deadEnd.id, 'unknown-path', `${deadEnd.id} references unknown path ${pathId}.`);
    }
    if (!model.visualSource.includes(deadEnd.id)) addIssue(issues, 'error', deadEnd.id, 'missing-from-visual', `${deadEnd.id} is missing from product/user-path-map.mmd.`);
  }

  if (!model.deadEnds.some((deadEnd) => deadEnd.owner_card === 'P-022')) addIssue(issues, 'error', 'dead-ends', 'missing-p022-owner', 'No dead end is mapped to P-022.');
  for (const actorHeading of ['### Mina: organizer / receiver', '### Leo: payer', '### Nina: second payer', '### Guest: no-app payer']) {
    if (!readFile(sourcePath).includes(actorHeading)) addIssue(issues, 'error', 'actor-maps', 'missing-actor-map', `Missing actor map heading: ${actorHeading}.`);
  }

  return {
    sourceHash: model.sourceHash,
    summary: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    issues,
  };
}

function buildOutputs(model, validation) {
  const json = JSON.stringify({ ...model, validation }, null, 2) + '\n';
  return new Map([
    [resolve(generatedDir, 'user-path-coverage.json'), json],
    [resolve(evidenceDir, 'user-path-coverage-latest.json'), json],
    [resolve(generatedDir, 'user-path-coverage.md'), renderMarkdown(model, validation)],
    [resolve(generatedDir, 'user-path-coverage.mmd'), renderCoverageMermaid(model)],
    [resolve(generatedDir, 'user-path-coverage.html'), renderHtml(model, validation)],
  ]);
}

function writeOutputs(outputs) {
  for (const [path, content] of outputs) writeFileSync(path, content);
}

function validateOutputs(outputs, validation) {
  for (const [path, expected] of outputs) {
    const relativePath = path.replace(`${repoRoot}/`, '');
    if (!existsSync(path)) addIssue(validation.issues, 'error', 'generated', 'missing-output', `${relativePath} is missing; run npm run product:refresh.`);
    else if (readFile(path) !== expected) addIssue(validation.issues, 'error', 'generated', 'stale-output', `${relativePath} is stale; run npm run product:refresh.`);
  }
  validation.summary.errors = validation.issues.filter((issue) => issue.severity === 'error').length;
  validation.summary.warnings = validation.issues.filter((issue) => issue.severity === 'warning').length;
}

function renderMarkdown(model, validation) {
  const lines = generatedHeader('ChopDot User Path Coverage');
  lines.push('## Summary', '');
  lines.push(`- Paths: ${model.summary.paths}`);
  lines.push(`- Dead ends: ${model.summary.deadEnds}`);
  lines.push(`- Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s)`);
  lines.push('', '## Implementation status', '');
  for (const [status, count] of Object.entries(model.summary.implementation)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('', '## Proof status', '');
  for (const [status, count] of Object.entries(model.summary.proof)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('', '## Highest-risk next paths', '');
  lines.push('| Path | Title | Implementation | Proof | Risk | Dead ends | Owner cards |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const path of model.summary.highestRisk) {
    lines.push(`| ${path.id} | ${pipe(path.title)} | ${path.implementation_status} | ${path.proof_status} | ${path.risk} | ${path.dead_ends.join(', ')} | ${path.owner_cards.join(', ')} |`);
  }
  lines.push('', '## Full path coverage', '');
  lines.push('| Path | Actor | Action | Result state | Implementation | Proof | Risk | Surfaces | Dead ends |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const path of model.paths) {
    lines.push(`| ${path.id} ${pipe(path.title)} | ${pipe(path.actor)} | ${pipe(path.action)} | ${pipe(path.result_state)} | ${path.implementation_status} | ${path.proof.status} | ${path.risk} | ${pipe(formatSurfaces(path.surfaces))} | ${path.dead_ends.join(', ') || 'none'} |`);
  }
  lines.push('', '## Dead-end register', '');
  lines.push('| Dead end | Severity | Status | Paths | Owner | Problem |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const deadEnd of model.deadEnds) {
    lines.push(`| ${deadEnd.id} ${pipe(deadEnd.title)} | ${deadEnd.severity} | ${deadEnd.status} | ${[deadEnd.path, ...deadEnd.paths].filter(Boolean).join(', ')} | ${deadEnd.owner_card} | ${pipe(deadEnd.problem)} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderCoverageMermaid(model) {
  const lines = ['flowchart TD'];
  lines.push(`  Summary["${model.summary.paths} paths / ${model.summary.deadEnds} dead ends"]`);
  for (const [status, count] of Object.entries(model.summary.implementation)) {
    const id = safeNodeId(status);
    lines.push(`  Summary --> ${id}["${status}: ${count}"]`);
  }
  for (const path of model.summary.highestRisk.slice(0, 8)) {
    const statusId = safeNodeId(path.implementation_status);
    const pathId = safeNodeId(path.id);
    lines.push(`  ${statusId} --> ${pathId}["${path.id}: ${escapeMermaid(path.title)}"]`);
  }
  lines.push('  classDef good fill:#e8f7ef,stroke:#1f7a45,color:#10291a;');
  lines.push('  classDef warn fill:#fff3d6,stroke:#b7791f,stroke-width:2px,color:#3a2600;');
  lines.push('  classDef bad fill:#ffe2e2,stroke:#b91c1c,stroke-width:2px,color:#3b0a0a;');
  lines.push('  classDef neutral fill:#f1f5f9,stroke:#64748b,color:#0f172a;');
  lines.push('  class Summary neutral;');
  for (const status of Object.keys(model.summary.implementation)) {
    const className = ['built', 'works', 'strong'].includes(status) ? 'good' : ['unproven', 'partial', 'built_ambiguous', 'lane_mismatch', 'not_built_or_unproven'].includes(status) ? 'warn' : 'bad';
    lines.push(`  class ${safeNodeId(status)} ${className};`);
  }
  for (const path of model.summary.highestRisk.slice(0, 8)) {
    lines.push(`  class ${safeNodeId(path.id)} ${path.risk === 'critical' ? 'bad' : 'warn'};`);
  }
  return `${lines.join('\n')}\n`;
}

function renderHtml(model, validation) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChopDot User Path Coverage</title>
  <style>
    :root { color-scheme: light; --ink:#111827; --muted:#64748b; --line:#e2e8f0; --good:#dcfce7; --warn:#fef3c7; --bad:#fee2e2; --neutral:#f1f5f9; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f8fafc; color:var(--ink); }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
    header { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:24px; }
    h1 { font-size: clamp(32px, 5vw, 56px); line-height:.95; margin:0; letter-spacing:0; }
    h2 { margin: 28px 0 12px; }
    .eyebrow { text-transform: uppercase; letter-spacing:.14em; font-size:12px; color:var(--muted); font-weight:700; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin: 18px 0 26px; }
    .metric { background:white; border:1px solid var(--line); border-radius:8px; padding:16px; box-shadow: 0 12px 30px rgba(15,23,42,.06); }
    .metric .eyebrow { display:block; overflow-wrap:anywhere; }
    .metric strong { display:block; font-size:28px; letter-spacing:0; }
    table { width:100%; border-collapse:separate; border-spacing:0; background:white; border:1px solid var(--line); border-radius:8px; overflow:hidden; box-shadow: 0 12px 30px rgba(15,23,42,.06); }
    th, td { text-align:left; padding:12px 14px; border-bottom:1px solid var(--line); vertical-align:top; font-size:14px; }
    th { background:#f8fafc; color:#475569; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
    tr:last-child td { border-bottom:0; }
    .pill { display:inline-flex; border-radius:999px; padding:4px 9px; font-size:12px; font-weight:700; white-space:nowrap; }
    .good { background:var(--good); color:#166534; }
    .warn { background:var(--warn); color:#92400e; }
    .bad { background:var(--bad); color:#991b1b; }
    .neutral { background:var(--neutral); color:#334155; }
    .links { display:flex; flex-wrap:wrap; gap:8px; }
    a { color:#0f766e; font-weight:700; text-decoration:none; }
    code { background:#e2e8f0; border-radius:8px; padding:2px 6px; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <p class="eyebrow">ChopDot product cockpit</p>
        <h1>User path coverage</h1>
      </div>
      <div class="links">
        <a href="./user-path-coverage.md">Markdown</a>
        <a href="./user-path-coverage.json">JSON</a>
        <a href="./user-path-coverage.mmd">Mermaid</a>
      </div>
    </header>
    <section class="grid">
      ${metric('Paths', model.summary.paths)}
      ${metric('Dead ends', model.summary.deadEnds)}
      ${metric('Errors', validation.summary.errors)}
      ${metric('Warnings', validation.summary.warnings)}
    </section>
    <section class="grid">
      ${Object.entries(model.summary.implementation).map(([status, count]) => metric(displayLabel(status), count)).join('')}
    </section>
    <h2>Highest-risk next paths</h2>
    ${renderHtmlTable(model.summary.highestRisk, ['id', 'title', 'implementation_status', 'proof_status', 'risk', 'dead_ends', 'owner_cards'])}
    <h2>Full path coverage</h2>
    ${renderHtmlTable(model.paths.map((path) => ({
      path: `${path.id} ${path.title}`,
      actor: path.actor,
      action: path.action,
      result_state: path.result_state,
      implementation: path.implementation_status,
      proof: path.proof.status,
      risk: path.risk,
      surfaces: formatSurfaces(path.surfaces),
      dead_ends: path.dead_ends.join(', ') || 'none',
    })), ['path', 'actor', 'action', 'result_state', 'implementation', 'proof', 'risk', 'surfaces', 'dead_ends'])}
    <h2>Dead-end register</h2>
    ${renderHtmlTable(model.deadEnds.map((deadEnd) => ({
      dead_end: `${deadEnd.id} ${deadEnd.title}`,
      severity: deadEnd.severity,
      status: deadEnd.status,
      paths: [deadEnd.path, ...deadEnd.paths].filter(Boolean).join(', '),
      owner: deadEnd.owner_card,
      problem: deadEnd.problem,
    })), ['dead_end', 'severity', 'status', 'paths', 'owner', 'problem'])}
    <p class="eyebrow">Source ${escapeHtml(model.sourceHash.slice(0, 12))}</p>
  </main>
</body>
</html>
`;
}

function renderHtmlTable(rows, columns) {
  if (rows.length === 0) return '<p>No rows.</p>';
  return `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(displayLabel(column))}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${formatHtmlCell(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function formatHtmlCell(value) {
  if (Array.isArray(value)) return escapeHtml(value.join(', '));
  const text = String(value ?? '');
  if (['built', 'works', 'strong', 'reviewed', 'automated'].includes(text)) return `<span class="pill good">${escapeHtml(displayLabel(text))}</span>`;
  if (['unproven', 'partial', 'built_ambiguous', 'lane_mismatch', 'not_built_or_unproven', 'medium', 'high'].includes(text)) return `<span class="pill warn">${escapeHtml(displayLabel(text))}</span>`;
  if (['not_built', 'built_wrong_order', 'known_gap', 'critical', 'missing'].includes(text)) return `<span class="pill bad">${escapeHtml(displayLabel(text))}</span>`;
  return escapeHtml(text);
}

function metric(label, value) {
  return `<div class="metric"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function displayLabel(value) {
  return String(value ?? '').replaceAll('_', ' ');
}

function generatedHeader(title) {
  return [
    `# ${title}`,
    '',
    '<!-- Generated by scripts/generate-user-path-coverage.mjs. Edit product/user-path-map.md instead. -->',
    '',
  ];
}

function printSummary(model, validation) {
  console.log('ChopDot user path coverage');
  console.log(`paths: ${model.summary.paths}`);
  console.log(`dead ends: ${model.summary.deadEnds}`);
  console.log(`errors: ${validation.summary.errors}`);
  console.log(`warnings: ${validation.summary.warnings}`);
  console.log('coverage: product/generated/user-path-coverage.html');
  for (const issue of validation.issues) {
    console.log(`${issue.severity.toUpperCase()} ${issue.area}/${issue.code}: ${issue.message}`);
  }
}

function addIssue(issues, severity, area, code, message) {
  issues.push({ severity, area, code, message });
}

function countValues(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function formatSurfaces(surfaces) {
  return Object.entries(surfaces).map(([key, value]) => `${key}:${value}`).join(', ');
}

function toList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && item !== '').map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function unique(values) {
  return [...new Set(values)];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readFile(path) {
  return readFileSync(path, 'utf8');
}

function ensureDirs() {
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
}

function pipe(value) {
  return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeMermaid(value) {
  return String(value ?? '').replaceAll('"', "'");
}

function safeNodeId(value) {
  return String(value).replace(/[^A-Za-z0-9_]/g, '_');
}
