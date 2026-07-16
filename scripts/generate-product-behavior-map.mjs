#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const sourcePath = resolve(repoRoot, 'product/path-model.yaml');
const generatedDir = resolve(repoRoot, 'product/generated');
const evidenceDir = resolve(repoRoot, 'product/evidence');
const command = process.argv[2] ?? 'refresh';
const validCommands = new Set(['refresh', 'validate']);

if (!validCommands.has(command)) {
  console.error(`Unknown product behavior map command: ${command}`);
  console.error(`Valid commands: ${[...validCommands].join(', ')}`);
  process.exit(1);
}

main();

function main() {
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
  const model = readModel();
  const enriched = enrichModel(model);
  const validation = validate(enriched);
  if (command === 'refresh') writeOutputs(enriched, validation);
  printSummary(enriched, validation);
  if (validation.summary.errors > 0) process.exitCode = 1;
}

function readModel() {
  if (!existsSync(sourcePath)) throw new Error('product/path-model.yaml is missing');
  const raw = readFileSync(sourcePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`product/path-model.yaml must remain JSON-compatible YAML: ${error.message}`);
  }
}

function enrichModel(model) {
  const journeys = model.journeys ?? [];
  const allPaths = journeys.flatMap((journey) => (journey.paths ?? []).map((path) => ({ ...path, journeyId: journey.id, journeyTitle: journey.title })));
  const deadEnds = model.deadEnds ?? [];
  const deadEndsByPath = new Map();
  for (const deadEnd of deadEnds) {
    for (const pathId of deadEnd.paths ?? []) {
      if (!deadEndsByPath.has(pathId)) deadEndsByPath.set(pathId, []);
      deadEndsByPath.get(pathId).push(deadEnd);
    }
  }
  const paths = allPaths.map((path) => ({
    ...path,
    deadEnds: (deadEndsByPath.get(path.id) ?? []).map((deadEnd) => deadEnd.id),
    risk: chooseRisk(deadEndsByPath.get(path.id) ?? []),
    laneStatus: path.laneStatus ?? 'unowned',
    recommendedForThisThread: path.recommendedForThisThread ?? path.laneStatus !== 'active_elsewhere',
  }));
  const summary = buildSummary(model, paths, deadEnds);
  return { ...model, generatedAt: new Date().toISOString(), paths, summary };
}


function buildSummary(model, paths, deadEnds) {
  const journeys = model.journeys ?? [];
  const futureJourneys = journeys.filter((journey) => (journey.paths ?? []).length === 0);
  const isRiskCandidate = (path) =>
    ['critical', 'high'].includes(path.risk)
    || ['known_gap', 'not_built', 'built_wrong_order', 'built_ambiguous', 'not_built_or_unproven'].includes(path.implementationStatus);
  const proven = paths.filter((path) => path.laneStatus === 'proven').sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const activeElsewhere = paths.filter((path) => path.laneStatus === 'active_elsewhere').sort(compareRecommendation);
  const blockedExternal = paths.filter((path) => path.laneStatus === 'blocked_external').sort(compareRecommendation);
  const highestRiskUnowned = paths
    .filter((path) => path.laneStatus === 'unowned')
    .filter((path) => path.recommendedForThisThread !== false)
    .filter(isRiskCandidate)
    .sort(compareRecommendation)
    .slice(0, 12);
  const queue = { proven, activeElsewhere, blockedExternal, highestRiskUnowned };
  return {
    journeys: journeys.length,
    futureJourneys: futureJourneys.length,
    paths: paths.length,
    deadEnds: deadEnds.length,
    implementation: countBy(paths, 'implementationStatus'),
    proof: countBy(paths, 'proofStatus'),
    risk: countBy(paths, 'risk'),
    byJourney: journeys.map((journey) => summarizeJourney(journey, paths, deadEnds)),
    bySurface: (model.surfaces ?? []).map((surface) => summarizeSurface(surface, paths)),
    byCard: summarizeCards(paths, deadEnds),
    byLane: countBy(paths, 'laneStatus'),
    highestRisk: paths
      .filter((path) => path.laneStatus !== 'deferred')
      .filter(isRiskCandidate)
      .sort(compareRecommendation)
      .slice(0, 20),
    queue,
    singleNextUnowned: highestRiskUnowned[0] ?? null,
    nextForThisThread: highestRiskUnowned,
    activeElsewhere,
    blockedExternal,
    proven,
  };
}


function compareRecommendation(a, b) {
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, unreviewed: 4 };
  const statusOrder = { known_gap: 0, not_built: 1, built_wrong_order: 2, built_ambiguous: 3, lane_mismatch: 4, not_built_or_unproven: 5, unproven: 6, built: 7 };
  return (a.routePriority ?? 999) - (b.routePriority ?? 999)
    || (riskOrder[a.risk] ?? 9) - (riskOrder[b.risk] ?? 9)
    || (statusOrder[a.implementationStatus] ?? 9) - (statusOrder[b.implementationStatus] ?? 9)
    || String(a.id).localeCompare(String(b.id));
}

function summarizeJourney(journey, paths, deadEnds) {
  const journeyPaths = paths.filter((path) => path.journeyId === journey.id);
  const pathIds = new Set(journeyPaths.map((path) => path.id));
  const journeyDeadEnds = deadEnds.filter((deadEnd) => (deadEnd.paths ?? []).some((pathId) => pathIds.has(pathId)));
  return {
    id: journey.id,
    title: journey.title,
    status: journey.status ?? 'unknown',
    ownerCard: journey.ownerCard ?? '',
    paths: journeyPaths.length,
    deadEnds: journeyDeadEnds.length,
    implementation: countBy(journeyPaths, 'implementationStatus'),
    proof: countBy(journeyPaths, 'proofStatus'),
    risk: countBy(journeyPaths, 'risk'),
  };
}

function summarizeSurface(surface, paths) {
  const statuses = paths.map((path) => path.surfaces?.[surface.id] ?? 'unknown');
  return { id: surface.id, title: surface.title, role: surface.role, statuses: countValues(statuses) };
}

function summarizeCards(paths, deadEnds) {
  const cards = new Map();
  for (const path of paths) {
    for (const card of path.ownerCards ?? []) {
      if (!cards.has(card)) cards.set(card, { card, paths: 0, deadEnds: 0, missingProof: 0, criticalOrHigh: 0 });
      const entry = cards.get(card);
      entry.paths += 1;
      if (path.proofStatus === 'missing') entry.missingProof += 1;
      if (['critical', 'high'].includes(path.risk)) entry.criticalOrHigh += 1;
    }
  }
  for (const deadEnd of deadEnds) {
    if (!cards.has(deadEnd.ownerCard)) cards.set(deadEnd.ownerCard, { card: deadEnd.ownerCard, paths: 0, deadEnds: 0, missingProof: 0, criticalOrHigh: 0 });
    cards.get(deadEnd.ownerCard).deadEnds += 1;
  }
  return [...cards.values()].sort((a, b) => b.criticalOrHigh - a.criticalOrHigh || b.deadEnds - a.deadEnds || a.card.localeCompare(b.card));
}


function validate(model) {
  const issues = [];
  const stateIds = new Set((model.states ?? []).map((state) => state.id));
  const actorIds = new Set((model.actors ?? []).map((actor) => actor.id));
  const pillarIds = new Set((model.pillars ?? []).map((pillar) => pillar.id));
  const surfaceIds = new Set((model.surfaces ?? []).map((surface) => surface.id));
  const validLaneStatuses = new Set(model.laneVocabulary?.status ?? []);
  const pathIds = new Set();
  const deadEndIds = new Set((model.deadEnds ?? []).map((deadEnd) => deadEnd.id));

  for (const path of model.paths) {
    if (pathIds.has(path.id)) addIssue('error', path.id, 'duplicate-path', `${path.id} is duplicated.`);
    pathIds.add(path.id);
    for (const field of ['id', 'title', 'journeyId', 'actor', 'pillar', 'entryState', 'action', 'resultState', 'implementationStatus', 'proofStatus', 'laneStatus']) {
      if (path[field] === undefined || path[field] === '') addIssue('error', path.id || 'path', `missing-${field}`, `${path.id || 'path'} is missing ${field}.`);
    }
    if (!actorIds.has(path.actor)) addIssue('error', path.id, 'unknown-actor', `${path.id} references unknown actor ${path.actor}.`);
    if (!pillarIds.has(path.pillar)) addIssue('error', path.id, 'unknown-pillar', `${path.id} references unknown pillar ${path.pillar}.`);
    if (!stateIds.has(path.entryState)) addIssue('error', path.id, 'unknown-entry-state', `${path.id} references unknown entry state ${path.entryState}.`);
    if (!stateIds.has(path.resultState)) addIssue('error', path.id, 'unknown-result-state', `${path.id} references unknown result state ${path.resultState}.`);
    for (const surfaceId of Object.keys(path.surfaces ?? {})) {
      if (!surfaceIds.has(surfaceId)) addIssue('error', path.id, 'unknown-surface', `${path.id} references unknown surface ${surfaceId}.`);
    }
    for (const surfaceId of surfaceIds) {
      if (!(surfaceId in (path.surfaces ?? {}))) addIssue('error', path.id, 'missing-surface-status', `${path.id} is missing surface status ${surfaceId}.`);
    }
    if (!validLaneStatuses.has(path.laneStatus)) addIssue('error', path.id, 'unknown-lane-status', `${path.id} uses unknown lane status ${path.laneStatus}.`);
    if (path.laneStatus !== 'unowned' && path.recommendedForThisThread !== false) addIssue('error', path.id, 'unsafe-recommendation', `${path.id} is ${path.laneStatus} but remains recommended.`);
    if (path.laneStatus === 'active_elsewhere' && !path.activeOwner?.lane) addIssue('error', path.id, 'missing-active-owner', `${path.id} is active elsewhere without an owner lane.`);
    if (path.laneStatus === 'blocked_external' && !path.blocker?.reason) addIssue('error', path.id, 'missing-external-blocker', `${path.id} is externally blocked without a reason.`);
    if (path.laneStatus === 'proven' && !(path.evidenceRefs ?? []).length) addIssue('error', path.id, 'missing-proven-evidence', `${path.id} is proven without evidence refs.`);
  }

  for (const deadEnd of model.deadEnds ?? []) {
    for (const pathId of deadEnd.paths ?? []) {
      if (!pathIds.has(pathId)) addIssue('error', deadEnd.id, 'unknown-dead-end-path', `${deadEnd.id} references unknown path ${pathId}.`);
    }
    for (const field of ['id', 'title', 'severity', 'status', 'ownerCard', 'problem', 'expected']) {
      if (!deadEnd[field]) addIssue('error', deadEnd.id || 'dead-end', `missing-${field}`, `${deadEnd.id || 'dead-end'} is missing ${field}.`);
    }
  }

  const assignedPaths = new Map();
  for (const lane of model.activeLanes ?? []) {
    if (!lane.id || !lane.status || !lane.card) addIssue('error', lane.id || 'lane', 'incomplete-active-lane', 'Active lane is missing id, status, or card.');
    for (const pathId of lane.paths ?? []) {
      if (!pathIds.has(pathId)) addIssue('error', lane.id, 'unknown-active-lane-path', `${lane.id} references unknown path ${pathId}.`);
      if (assignedPaths.has(pathId)) addIssue('error', lane.id, 'duplicate-active-lane-path', `${pathId} is assigned to both ${assignedPaths.get(pathId)} and ${lane.id}.`);
      assignedPaths.set(pathId, lane.id);
      const path = model.paths.find((candidate) => candidate.id === pathId);
      if (path && path.activeOwner?.lane !== lane.id) addIssue('error', lane.id, 'active-owner-mismatch', `${pathId} does not point back to ${lane.id}.`);
    }
    for (const deadEndId of lane.deadEnds ?? []) {
      if (!deadEndIds.has(deadEndId)) addIssue('error', lane.id, 'unknown-active-lane-dead-end', `${lane.id} references unknown dead end ${deadEndId}.`);
    }
  }

  if (model.summary.singleNextUnowned?.id !== model.routingContract?.singleNextUnownedPath) {
    addIssue('error', 'routing', 'single-next-mismatch', `Generated next ${model.summary.singleNextUnowned?.id ?? 'none'} does not match routing contract ${model.routingContract?.singleNextUnownedPath ?? 'none'}.`);
  }

  function addIssue(severity, subject, code, message) {
    issues.push({ severity, subject, code, message });
  }
  return {
    generatedAt: model.generatedAt,
    summary: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    issues,
  };
}


function writeOutputs(model, validation) {
  const cleanGeneratedText = (value) => String(value).replace(/[ \t]+$/gm, '');
  const payload = JSON.stringify({ ...model, validation }, null, 2) + '\n';
  const routingPayload = JSON.stringify({
    generatedAt: model.generatedAt,
    singleNextUnowned: model.summary.singleNextUnowned,
    queue: model.summary.queue,
    activeLanes: model.activeLanes,
    proofBaselines: model.proofBaselines,
    validation,
  }, null, 2) + '\n';
  writeFileSync(resolve(generatedDir, 'product-behavior-map.json'), payload);
  writeFileSync(resolve(evidenceDir, 'product-behavior-map-latest.json'), payload);
  writeFileSync(resolve(generatedDir, 'product-behavior-map.md'), cleanGeneratedText(renderBehaviorMarkdown(model, validation)));
  writeFileSync(resolve(generatedDir, 'product-routing-queue.json'), routingPayload);
  writeFileSync(resolve(generatedDir, 'product-routing-queue.md'), cleanGeneratedText(renderRoutingQueueMarkdown(model, validation)));
  writeFileSync(resolve(generatedDir, 'product-journey-map.html'), cleanGeneratedText(renderJourneyHtml(model, validation)));
  writeFileSync(resolve(generatedDir, 'product-service-blueprint.html'), cleanGeneratedText(renderBlueprintHtml(model, validation)));
  writeFileSync(resolve(generatedDir, 'product-state-transition-map.mmd'), cleanGeneratedText(renderStateMermaid(model)));
  writeFileSync(resolve(generatedDir, 'product-traceability-matrix.md'), cleanGeneratedText(renderTraceabilityMarkdown(model)));
  writeFileSync(resolve(generatedDir, 'product-behavior-dashboard.html'), cleanGeneratedText(renderDashboardHtml(model, validation)));
  writeFileSync(resolve(generatedDir, 'user-path-coverage.json'), payload);
  writeFileSync(resolve(generatedDir, 'user-path-coverage.md'), cleanGeneratedText(renderBehaviorMarkdown(model, validation)));
  writeFileSync(resolve(generatedDir, 'user-path-coverage.mmd'), cleanGeneratedText(renderStateMermaid(model)));
  writeFileSync(resolve(generatedDir, 'user-path-coverage.html'), cleanGeneratedText(renderDashboardHtml(model, validation)));
  writeFileSync(resolve(evidenceDir, 'user-path-coverage-latest.json'), payload);
}

function renderRoutingQueueMarkdown(model, validation) {
  const lines = header('ChopDot Product Proof And Routing Queue');
  const next = model.summary.singleNextUnowned;
  lines.push('## Routing result', '');
  lines.push(`- Single next unowned journey: ${next ? `${next.id} ${next.title}` : 'none'}`);
  lines.push(`- Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s)`);
  lines.push('- Stop condition: map and route only; do not implement the selected journey.');
  for (const [label, key] of [
    ['Proven', 'proven'],
    ['Active elsewhere - do not duplicate', 'activeElsewhere'],
    ['Blocked external', 'blockedExternal'],
    ['Highest-risk unowned', 'highestRiskUnowned'],
  ]) {
    lines.push('', `## ${label}`, '');
    lines.push('| Path | Journey | Implementation | Proof | Risk | Lane | Evidence/owner |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const path of model.summary.queue[key]) {
      const evidenceOrOwner = path.laneStatus === 'active_elsewhere'
        ? `${path.activeOwner?.lane ?? ''} ${(path.activeOwner?.threads ?? []).join(', ')}`
        : path.laneStatus === 'blocked_external'
          ? path.blocker?.reason ?? ''
          : (path.evidenceRefs ?? []).join(', ');
      lines.push(`| ${path.id} ${pipe(path.title)} | ${path.journeyId} | ${path.implementationStatus} | ${path.proofStatus} | ${path.risk} | ${path.laneStatus} | ${pipe(evidenceOrOwner)} |`);
    }
  }
  lines.push('', '## Proof baselines', '');
  for (const baseline of model.proofBaselines ?? []) lines.push(`- ${baseline.id}: ${baseline.type} ${baseline.commit ?? baseline.location ?? ''}`);
  return `${lines.join('\n')}\n`;
}


function renderBehaviorMarkdown(model, validation) {
  const lines = header('ChopDot Product Behavior Map');
  lines.push('## Summary', '');
  lines.push(`- Journeys: ${model.summary.journeys}`);
  lines.push(`- Future journeys needing maps: ${model.summary.futureJourneys}`);
  lines.push(`- Paths: ${model.summary.paths}`);
  lines.push(`- Dead ends: ${model.summary.deadEnds}`);
  lines.push(`- Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s)`);
  lines.push(`- Single next unowned: ${model.summary.singleNextUnowned ? `${model.summary.singleNextUnowned.id} ${model.summary.singleNextUnowned.title}` : 'none'}`);
  lines.push('', '## Journey rollup', '');
  lines.push('| Journey | Status | Paths | Dead ends | Missing proof | Owner |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const journey of model.summary.byJourney) lines.push(`| ${journey.id} ${pipe(journey.title)} | ${journey.status} | ${journey.paths} | ${journey.deadEnds} | ${journey.proof.missing ?? 0} | ${journey.ownerCard} |`);
  for (const [label, key] of [
    ['Proven', 'proven'],
    ['Active elsewhere - do not duplicate', 'activeElsewhere'],
    ['Blocked external', 'blockedExternal'],
    ['Highest-risk unowned', 'highestRiskUnowned'],
  ]) {
    lines.push('', `## ${label}`, '');
    lines.push('| Path | Journey | Actor | Implementation | Proof | Risk | Lane |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const path of model.summary.queue[key]) lines.push(`| ${path.id} ${pipe(path.title)} | ${path.journeyId} | ${path.actor} | ${path.implementationStatus} | ${path.proofStatus} | ${path.risk} | ${path.laneStatus} |`);
  }
  lines.push('', '## Surface rollup', '');
  lines.push('| Surface | Role | Status counts |');
  lines.push('| --- | --- | --- |');
  for (const surface of model.summary.bySurface) lines.push(`| ${surface.id} ${pipe(surface.title)} | ${pipe(surface.role)} | ${pipe(formatCounts(surface.statuses))} |`);
  lines.push('', '## Card rollup', '');
  lines.push('| Card | Paths | Dead ends | Missing proof | Critical/high paths |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const card of model.summary.byCard) lines.push(`| ${card.card} | ${card.paths} | ${card.deadEnds} | ${card.missingProof} | ${card.criticalOrHigh} |`);
  return `${lines.join('\n')}\n`;
}

function renderTraceabilityMarkdown(model) {
  const lines = header('ChopDot Product Behavior Traceability Matrix');
  lines.push('| Path | Pillar | Journey | Actor | State transition | Owner cards | Implementation | Proof | Surfaces | Dead ends |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const path of model.paths) {
    lines.push(`| ${path.id} ${pipe(path.title)} | ${path.pillar} | ${path.journeyId} | ${path.actor} | ${path.entryState} -> ${path.resultState} | ${(path.ownerCards ?? []).join(', ')} | ${path.implementationStatus} | ${path.proofStatus} | ${pipe(formatSurfaces(path.surfaces))} | ${(path.deadEnds ?? []).join(', ') || 'none'} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderStateMermaid(model) {
  const lines = ['flowchart TD'];
  for (const path of model.paths) {
    const from = nodeId(path.entryState);
    const to = nodeId(path.resultState);
    lines.push(`  ${from}["${labelForState(model, path.entryState)}"] -->|"${path.id}: ${escapeMermaid(path.action)}"| ${to}["${labelForState(model, path.resultState)}"]`);
  }
  for (const deadEnd of model.deadEnds ?? []) {
    const deadNode = nodeId(deadEnd.id);
    lines.push(`  ${deadNode}["${deadEnd.id}: ${escapeMermaid(deadEnd.title)}"]`);
    for (const pathId of deadEnd.paths ?? []) {
      const path = model.paths.find((candidate) => candidate.id === pathId);
      if (path) lines.push(`  ${nodeId(path.resultState)} -. ${escapeMermaid(deadEnd.status)} .-> ${deadNode}`);
    }
  }
  lines.push('  classDef good fill:#e8f7ef,stroke:#1f7a45,color:#10291a;');
  lines.push('  classDef warn fill:#fff3d6,stroke:#b7791f,stroke-width:2px,color:#3a2600;');
  lines.push('  classDef bad fill:#ffe2e2,stroke:#b91c1c,stroke-width:2px,color:#3b0a0a;');
  lines.push(`  class ${(model.states ?? []).map((state) => nodeId(state.id)).join(',')} warn;`);
  lines.push(`  class ${(model.deadEnds ?? []).map((deadEnd) => nodeId(deadEnd.id)).join(',')} bad;`);
  return `${lines.join('\n')}\n`;
}

function renderJourneyHtml(model, validation) {
  return renderHtmlShell('Product journey map', model, validation, `
    <h2>Journey rollup</h2>
    ${table(model.summary.byJourney, ['id', 'title', 'status', 'paths', 'deadEnds', 'ownerCard'])}
    <h2>Paths</h2>
    ${table(model.paths.map((path) => ({ path: `${path.id} ${path.title}`, pillar: path.pillar, actor: path.actor, action: path.action, result: path.resultState, implementation: path.implementationStatus, proof: path.proofStatus, risk: path.risk })), ['path', 'pillar', 'actor', 'action', 'result', 'implementation', 'proof', 'risk'])}
  `);
}

function renderBlueprintHtml(model, validation) {
  return renderHtmlShell('Product service blueprint', model, validation, `
    <h2>Surface dependencies</h2>
    ${table(model.summary.bySurface.map((surface) => ({ surface: `${surface.id} ${surface.title}`, role: surface.role, statuses: formatCounts(surface.statuses) })), ['surface', 'role', 'statuses'])}
    <h2>Backstage owner cards</h2>
    ${table(model.summary.byCard, ['card', 'paths', 'deadEnds', 'missingProof', 'criticalOrHigh'])}
    <h2>Dead ends</h2>
    ${table((model.deadEnds ?? []).map((deadEnd) => ({ deadEnd: `${deadEnd.id} ${deadEnd.title}`, severity: deadEnd.severity, status: deadEnd.status, owner: deadEnd.ownerCard, paths: (deadEnd.paths ?? []).join(', '), problem: deadEnd.problem })), ['deadEnd', 'severity', 'status', 'owner', 'paths', 'problem'])}
  `);
}


function renderDashboardHtml(model, validation) {
  return renderHtmlShell('Product behavior dashboard', model, validation, `
    <section class="metrics">
      ${metric('Journeys', model.summary.journeys)}
      ${metric('Paths', model.summary.paths)}
      ${metric('Dead ends', model.summary.deadEnds)}
      ${metric('Errors', validation.summary.errors)}
    </section>
    <h2>Single next unowned journey</h2>
    ${table(model.summary.singleNextUnowned ? [{ path: `${model.summary.singleNextUnowned.id} ${model.summary.singleNextUnowned.title}`, risk: model.summary.singleNextUnowned.risk, reason: model.summary.singleNextUnowned.routingNote ?? 'highest-risk unowned after routing exclusions' }] : [], ['path', 'risk', 'reason'])}
    <h2>Proven</h2>
    ${table(model.summary.queue.proven.map((path) => ({ path: `${path.id} ${path.title}`, journey: path.journeyId, proof: path.proofStatus, scope: path.proofScope, evidence: (path.evidenceRefs ?? []).join(', ') })), ['path', 'journey', 'proof', 'scope', 'evidence'])}
    <h2>Active elsewhere - do not duplicate</h2>
    ${table(model.summary.queue.activeElsewhere.map((path) => ({ path: `${path.id} ${path.title}`, journey: path.journeyId, lane: path.activeOwner?.lane, ownerCard: path.activeOwner?.card, threads: (path.activeOwner?.threads ?? []).join(', ') })), ['path', 'journey', 'lane', 'ownerCard', 'threads'])}
    <h2>Blocked external</h2>
    ${table(model.summary.queue.blockedExternal.map((path) => ({ path: `${path.id} ${path.title}`, journey: path.journeyId, blocker: path.blocker?.reason, evidence: (path.evidenceRefs ?? []).join(', ') })), ['path', 'journey', 'blocker', 'evidence'])}
    <h2>Highest-risk unowned</h2>
    ${table(model.summary.queue.highestRiskUnowned.map((path) => ({ path: `${path.id} ${path.title}`, journey: path.journeyId, actor: path.actor, implementation: path.implementationStatus, proof: path.proofStatus, risk: path.risk, owners: (path.ownerCards ?? []).join(', ') })), ['path', 'journey', 'actor', 'implementation', 'proof', 'risk', 'owners'])}
    <h2>Rollups</h2>
    ${table(model.summary.byJourney, ['id', 'title', 'status', 'paths', 'deadEnds', 'ownerCard'])}
  `);
}

function renderHtmlShell(title, model, validation, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ChopDot ${escapeHtml(title)}</title>
<style>
:root{--ink:#111827;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--card:#fff;--good:#dcfce7;--warn:#fef3c7;--bad:#fee2e2}body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1180px;margin:0 auto;padding:32px 20px 52px}h1{font-size:clamp(34px,5vw,58px);line-height:.95;letter-spacing:-.05em;margin:0 0 8px}.eyebrow{text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-size:12px;font-weight:800}.links{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.links a{background:#0f766e;color:white;border-radius:999px;padding:9px 13px;text-decoration:none;font-weight:800;font-size:13px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:22px 0}.metric{background:white;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:0 12px 30px rgba(15,23,42,.06)}.metric strong{font-size:30px;display:block}table{width:100%;border-collapse:separate;border-spacing:0;background:white;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.06);margin-bottom:28px}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#475569;background:#f8fafc}tr:last-child td{border-bottom:0}.pill{display:inline-flex;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:800}.good{background:var(--good);color:#166534}.warn{background:var(--warn);color:#92400e}.bad{background:var(--bad);color:#991b1b}.neutral{background:#f1f5f9;color:#334155}
</style>
</head>
<body><main>
<p class="eyebrow">ChopDot product behavior map</p><h1>${escapeHtml(title)}</h1>
<p>Generated ${escapeHtml(model.generatedAt)}. Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s).</p>
<div class="links"><a href="./product-behavior-map.md">Behavior map</a><a href="./product-journey-map.html">Journey map</a><a href="./product-service-blueprint.html">Service blueprint</a><a href="./product-state-transition-map.mmd">State map</a><a href="./product-traceability-matrix.md">Traceability</a></div>
${body}
</main></body></html>\n`;
}

function table(rows, columns) {
  if (!rows.length) return '<p>No rows.</p>';
  return `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${cell(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function cell(value) {
  const text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  const cls = ['built', 'works', 'strong', 'reviewed'].includes(text) ? 'good' : ['not_built', 'known_gap', 'built_wrong_order', 'critical', 'missing'].includes(text) ? 'bad' : ['high', 'built_ambiguous', 'partial', 'unproven', 'lane_mismatch', 'not_built_or_unproven'].includes(text) ? 'warn' : 'neutral';
  if (/^[a-z_]+$/.test(text) && text.length < 40) return `<span class="pill ${cls}">${escapeHtml(text)}</span>`;
  return escapeHtml(text);
}

function metric(label, value) { return `<div class="metric"><span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`; }
function header(title) { return [`# ${title}`, '', '<!-- Generated by scripts/generate-product-behavior-map.mjs. Edit product/path-model.yaml instead. -->', '']; }
function labelForState(model, stateId) { return (model.states ?? []).find((state) => state.id === stateId)?.title ?? stateId; }
function chooseRisk(deadEnds) { const order = ['critical', 'high', 'medium', 'low', 'unreviewed']; return (deadEnds.map((deadEnd) => deadEnd.severity).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0]) ?? 'unreviewed'; }
function countBy(items, key) { return countValues(items.map((item) => item[key] ?? 'unknown')); }
function countValues(values) { const out = {}; for (const value of values) out[value] = (out[value] ?? 0) + 1; return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))); }
function formatCounts(counts) { return Object.entries(counts).map(([key, value]) => `${key}:${value}`).join(', '); }
function formatSurfaces(surfaces = {}) { return Object.entries(surfaces).map(([key, value]) => `${key}:${value}`).join(', '); }
function pipe(value) { return String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim(); }
function nodeId(value) { return String(value).replace(/[^A-Za-z0-9_]/g, '_'); }
function escapeMermaid(value) { return String(value ?? '').replaceAll('"', "'"); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

function printSummary(model, validation) {
  console.log('ChopDot product behavior map');
  console.log(`journeys: ${model.summary.journeys}`);
  console.log(`paths: ${model.summary.paths}`);
  console.log(`dead ends: ${model.summary.deadEnds}`);
  console.log(`proven: ${model.summary.queue.proven.length}`);
  console.log(`active elsewhere: ${model.summary.queue.activeElsewhere.length}`);
  console.log(`blocked external: ${model.summary.queue.blockedExternal.length}`);
  console.log(`highest-risk unowned: ${model.summary.queue.highestRiskUnowned.length}`);
  console.log(`single next unowned: ${model.summary.singleNextUnowned?.id ?? 'none'}`);
  console.log(`errors: ${validation.summary.errors}`);
  console.log(`warnings: ${validation.summary.warnings}`);
  console.log('dashboard: product/generated/product-behavior-dashboard.html');
  console.log('routing queue: product/generated/product-routing-queue.md');
  for (const issue of validation.issues) console.log(`${issue.severity.toUpperCase()} ${issue.subject}/${issue.code}: ${issue.message}`);
}
