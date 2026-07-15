#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const productDir = resolve(repoRoot, 'product');
const cardsPath = resolve(productDir, 'cards.md');
const decisionsPath = resolve(productDir, 'decisions.md');
const decisionContractsPath = resolve(productDir, 'decision-contracts.md');
const roadmapPath = resolve(productDir, 'roadmap.md');
const outcomesPath = resolve(productDir, 'outcomes.md');
const boardPolicyPath = resolve(productDir, 'board-policy.md');
const taxonomyPath = resolve(productDir, 'taxonomy.md');
const generatedDir = resolve(productDir, 'generated');
const evidenceDir = resolve(productDir, 'evidence');
const historyDir = resolve(productDir, 'history/events');
const screenshotDir = resolve(evidenceDir, 'screenshots');
const command = process.argv[2] ?? 'refresh';
const commandArgs = process.argv.slice(3);

const validCommands = new Set([
  'refresh',
  'validate',
  'traceability',
  'readiness',
  'cockpit',
  'start',
  'finish',
  'checkpoint',
  'history',
  'resume',
  'query',
  'screenshot',
  'visual-review'
]);

if (!validCommands.has(command)) {
  console.error(`Unknown product cockpit command: ${command}`);
  console.error(`Valid commands: ${[...validCommands].join(', ')}`);
  process.exit(1);
}

const statuses = ['backlog', 'discovery', 'ready', 'building', 'validation', 'measuring', 'blocked', 'done', 'deferred'];
const scopes = ['Catch', 'Management', 'Payout', 'History', 'Native Stack', 'Quality'];
const evidenceQualities = ['none', 'thin', 'partial', 'strong', 'live'];
const userFacingTypes = new Set(['journey', 'feature', 'component', 'experiment', 'cleanup', 'quality']);
const gatedStatuses = new Set(['ready', 'building', 'validation', 'measuring', 'done']);
const hardForbiddenUserWords = [
  'evidence',
  'rail',
  'claim',
  'kernel',
  'adapter',
  'obligation',
  'chapter',
  'test-token',
  'raw JSON',
  'protocol',
  'settlement',
  'native',
  'host',
  'state machine'
];

const knownRoutePaths = {
  '/': 'pots-home',
  '/pots': 'pots-home',
  '/activity': 'activity-home',
  '/people': 'people-home',
  '/you': 'you-tab',
  '/spend?t=TOKEN': 'spend-card',
  '/pay?t=TOKEN': 'capture-handoff',
  '/confirm?t=TOKEN': 'capture-confirm',
  '?cid=INVITE': 'import-pot'
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  ensureDirs();
  if (command === 'start') {
    lifecycle('start', readOptions(commandArgs));
    return;
  }
  if (command === 'finish') {
    lifecycle('finish', readOptions(commandArgs));
    return;
  }
  if (command === 'checkpoint') {
    writeCheckpoint(readOptions(commandArgs));
    refreshAndPrint();
    return;
  }
  if (command === 'screenshot') {
    await captureCockpitScreenshot();
    refreshAndPrint();
    return;
  }
  if (command === 'visual-review') {
    writeVisualReview();
    refreshAndPrint();
    return;
  }

  const model = readModel();
  const validation = validateModel(model, command === 'validate');

  if (command === 'refresh') {
    writeAll(model, validation);
    printSummary(model, validation);
    process.exitCode = validation.summary.errors > 0 ? 1 : 0;
  } else if (command === 'validate') {
    writeEvidence(model, validation);
    printSummary(model, validation);
    process.exitCode = validation.summary.errors > 0 ? 1 : 0;
  } else if (command === 'traceability') {
    writeTraceabilityEvidence(model, validation);
    console.log('Product traceability');
    console.log(`links: ${buildTraceability(model).links.length}`);
    console.log('evidence: product/evidence/product-traceability-latest.json');
    process.exitCode = validation.issues.some((issue) => issue.severity === 'error' && issue.area === 'traceability') ? 1 : 0;
  } else if (command === 'readiness') {
    writeReadinessEvidence(model, validation);
    const readiness = buildReadiness(model, validation);
    console.log('Product readiness');
    console.log(`cards: ${readiness.summary.cards}`);
    console.log(`ready/building/validation/done: ${readiness.summary.activeOrReady}`);
    console.log(`blocked: ${readiness.summary.blocked}`);
    console.log('evidence: product/evidence/product-readiness-latest.json');
    process.exitCode = validation.issues.some((issue) => issue.severity === 'error' && issue.area === 'readiness') ? 1 : 0;
  } else if (command === 'cockpit') {
    writeGeneratedViews(model, validation);
    console.log('Product cockpit generated');
    console.log('view: product/board.html');
    console.log('legacy mirror: product/generated/product-cockpit.html');
    process.exitCode = validation.summary.errors > 0 ? 1 : 0;
  } else if (command === 'history') {
    console.log(renderHistoryCli(model));
  } else if (command === 'resume') {
    writeGeneratedViews(model, validation);
    console.log('Product resume generated');
    console.log('view: product/generated/product-resume.md');
  } else if (command === 'query') {
    console.log(queryModel(model, commandArgs.join(' ')));
  }
}

function readModel() {
  const source = readFile(cardsPath);
  const cards = parseSections(source, /^##\s+(P-\d+)\s+-\s+(.+)$/gm).map((section) => {
    const data = parseYamlBlock(section.body, section.id);
    return normalizeCard({
      ...data,
      id: data.id ?? section.id,
      title: data.title ?? section.title,
      body: stripYaml(section.body).trim()
    });
  });
  const decisions = existsSync(decisionsPath)
    ? parseSections(readFile(decisionsPath), /^##\s+(DEC-\d+)\s+-\s+(.+)$/gm).map((section) => ({
        ...parseYamlBlock(section.body, section.id),
        id: section.id,
        title: section.title,
        body: stripYaml(section.body).trim()
      }))
    : [];
  const decisionContracts = existsSync(decisionContractsPath)
    ? parseSections(readFile(decisionContractsPath), /^##\s+(DC-\d+)\s+-\s+(.+)$/gm).map((section) => ({
        id: section.id,
        title: section.title,
        body: section.body.trim()
      }))
    : [];
  const history = readHistoryEvents();
  const appInventory = buildAppInventory(cards);
  return {
    generatedAt: new Date().toISOString(),
    sources: {
      cards: relative(cardsPath),
      decisions: relative(decisionsPath),
      decisionContracts: relative(decisionContractsPath),
      roadmap: relative(roadmapPath),
      outcomes: relative(outcomesPath),
      boardPolicy: relative(boardPolicyPath),
      taxonomy: relative(taxonomyPath)
    },
    cards,
    decisions,
    decisionContracts,
    history,
    appInventory,
    roadmapText: existsSync(roadmapPath) ? readFile(roadmapPath) : '',
    outcomesText: existsSync(outcomesPath) ? readFile(outcomesPath) : ''
  };
}

function normalizeCard(card) {
  return {
    ...card,
    depends_on: toList(card.depends_on),
    tests: toList(card.tests),
    screens: toList(card.screens),
    evidence: toList(card.evidence),
    friction_score: toNumber(card.friction_score),
    trust_score: toNumber(card.trust_score),
    clarity_score: toNumber(card.clarity_score),
    language_score: toNumber(card.language_score),
    total_score: toNumber(card.total_score),
    screenshot_required: String(card.screenshot_required ?? 'yes')
  };
}

function buildAppInventory(cards) {
  const routerPath = resolve(repoRoot, 'src/components/AppRouter.tsx');
  const navPath = resolve(repoRoot, 'src/nav.ts');
  const screenPropsDir = resolve(repoRoot, 'src/routing/screen-props');
  const screenDir = resolve(repoRoot, 'src/components/screens');
  const testsDir = resolve(repoRoot, 'tests');
  const srcDir = resolve(repoRoot, 'src');

  const routerSource = existsSync(routerPath) ? readFile(routerPath) : '';
  const navSource = existsSync(navPath) ? readFile(navPath) : '';
  const screenTypes = [...navSource.matchAll(/\|\s*\{\s*type:\s*"([^"]+)"/g)].map((match) => match[1]);
  const routerEntries = [...routerSource.matchAll(/"([^"]+)":\s*(render[A-Za-z0-9_]+)/g)].map((match) => ({
    screenType: match[1],
    renderer: match[2],
    path: relative(routerPath)
  }));
  const rendererMap = new Map(routerEntries.map((entry) => [entry.renderer, entry.screenType]));
  const renderFunctions = [];
  for (const file of listFiles(screenPropsDir, (path) => path.endsWith('.tsx'))) {
    const source = readFile(file);
    for (const match of source.matchAll(/export function\s+(render[A-Za-z0-9_]+)[\s\S]*?\{\n([\s\S]*?)(?=\nexport function|\nfunction\s|$)/g)) {
      const renderer = match[1];
      const body = match[2];
      renderFunctions.push({
        renderer,
        screenType: rendererMap.get(renderer) ?? null,
        file: relative(file),
        renderedComponents: [...body.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((componentMatch) => componentMatch[1]).filter((value, index, list) => list.indexOf(value) === index)
      });
    }
  }
  const screenFiles = listFiles(screenDir, (path) => path.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(path)).map((file) => ({
    component: basename(file, '.tsx'),
    file: relative(file)
  }));
  const tests = [
    ...listFiles(resolve(repoRoot, 'tests'), (path) => /\.(spec|test)\.(ts|tsx|js|mjs)$/.test(path)),
    ...listFiles(srcDir, (path) => /\.(spec|test)\.(ts|tsx|js|mjs)$/.test(path))
  ].map((file) => relative(file)).sort();

  const cardScreenNames = new Set(cards.flatMap((card) => card.screens));
  const cardTestNames = new Set(cards.flatMap((card) => card.tests));
  const screenCoverage = screenFiles.map((screen) => {
    const directCards = cards.filter((card) => card.screens.includes(screen.component));
    const indirectCards = cards.filter((card) => {
      const render = renderFunctions.find((fn) => fn.renderedComponents.includes(screen.component));
      return render ? card.screens.includes(render.screenType) || card.screens.includes(render.renderer) : false;
    });
    return {
      ...screen,
      screenTypes: renderFunctions.filter((fn) => fn.renderedComponents.includes(screen.component)).map((fn) => fn.screenType).filter(Boolean),
      productCards: unique([...directCards, ...indirectCards].map((card) => card.id)),
      mapped: directCards.length > 0 || indirectCards.length > 0
    };
  });
  const routeCoverage = Object.entries(knownRoutePaths).map(([route, screenType]) => {
    const routerEntry = routerEntries.find((entry) => entry.screenType === screenType);
    const routeScreens = screenCoverage.filter((screen) => screen.screenTypes.includes(screenType));
    return {
      route,
      screenType,
      renderer: routerEntry?.renderer ?? null,
      productCards: unique([
        ...cards.filter((card) => card.screens.includes(screenType) || card.screens.includes(routerEntry?.renderer ?? '')).map((card) => card.id),
        ...routeScreens.flatMap((screen) => screen.productCards)
      ])
    };
  });
  const referencedScreensMissing = [...cardScreenNames]
    .filter((name) => !name.startsWith('product/'))
    .filter((name) => !screenFiles.some((screen) => screen.component === name) && !routerEntries.some((entry) => entry.screenType === name || entry.renderer === name) && name !== 'AllNormalUserScreens' && name !== 'DeveloperChecks' && name !== 'CompetitorReview')
    .sort();
  const referencedTestsMissing = [...cardTestNames]
    .filter((name) => !name.startsWith('npm run ') && !name.startsWith('manual-') && !existsSync(resolve(repoRoot, name)))
    .sort();
  const orphanScreens = screenCoverage.filter((screen) => !screen.mapped).map((screen) => screen.component).sort();

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      screenTypes: screenTypes.length,
      routerEntries: routerEntries.length,
      renderFunctions: renderFunctions.length,
      screenFiles: screenFiles.length,
      tests: tests.length,
      mappedScreens: screenCoverage.filter((screen) => screen.mapped).length,
      orphanScreens: orphanScreens.length,
      referencedScreensMissing: referencedScreensMissing.length,
      referencedTestsMissing: referencedTestsMissing.length
    },
    routes: routeCoverage,
    screenTypes,
    routerEntries,
    renderFunctions,
    screenFiles,
    screenCoverage,
    tests,
    orphanScreens,
    referencedScreensMissing,
    referencedTestsMissing
  };
}

function validateModel(model, requireGenerated = false) {
  const issues = [];
  const cardIds = new Set();
  const decisionContractIds = new Set(model.decisionContracts.map((contract) => contract.id));

  for (const sourcePath of [cardsPath, decisionsPath, decisionContractsPath, roadmapPath, outcomesPath, boardPolicyPath, taxonomyPath]) {
    if (!existsSync(sourcePath)) {
      addIssue(issues, 'error', 'sources', 'missing-source', relative(sourcePath), `${relative(sourcePath)} is missing.`);
    }
  }

  for (const card of model.cards) {
    if (cardIds.has(card.id)) {
      addIssue(issues, 'error', 'sources', 'duplicate-card', card.id, `${card.id} is duplicated.`);
    }
    cardIds.add(card.id);

    for (const key of [
      'id',
      'type',
      'title',
      'status',
      'scope',
      'module',
      'journey',
      'pillar',
      'priority',
      'evidence_quality',
      'owner',
      'blocker',
      'decision_contract',
      'next_action',
      'user_story',
      'one_next_action',
      'why',
      'challenge',
      'acceptance'
    ]) {
      if (card[key] === undefined || card[key] === '') {
        addIssue(issues, 'error', 'card', 'missing-field', card.id, `${card.id} is missing ${key}.`);
      }
    }

    if (!statuses.includes(card.status)) {
      addIssue(issues, 'error', 'card', 'invalid-status', card.id, `${card.id} has invalid status ${card.status}.`);
    }
    if (!scopes.includes(card.scope)) {
      addIssue(issues, 'error', 'card', 'invalid-scope', card.id, `${card.id} has invalid scope ${card.scope}.`);
    }
    if (!evidenceQualities.includes(card.evidence_quality)) {
      addIssue(issues, 'error', 'card', 'invalid-evidence-quality', card.id, `${card.id} has invalid evidence quality ${card.evidence_quality}.`);
    }
    if (!decisionContractIds.has(card.decision_contract)) {
      addIssue(issues, 'error', 'traceability', 'missing-decision-contract', card.id, `${card.id} references missing ${card.decision_contract}.`);
    }
    for (const dep of card.depends_on) {
      if (!model.cards.some((candidate) => candidate.id === dep)) {
        addIssue(issues, 'error', 'traceability', 'missing-dependency', card.id, `${card.id} depends on missing ${dep}.`);
      }
    }

    if (card.status === 'blocked' && (!card.blocker || card.blocker === 'none')) {
      addIssue(issues, 'error', 'readiness', 'blocked-without-blocker', card.id, `${card.id} is blocked without a blocker.`);
    }

    if (userFacingTypes.has(card.type) && gatedStatuses.has(card.status)) {
      validateProductGate(card, issues);
    }

    if (card.status === 'done') {
      if (card.evidence.length === 0 || card.evidence_quality === 'none') {
        addIssue(issues, 'error', 'readiness', 'done-without-evidence', card.id, `${card.id} is done without evidence.`);
      }
      if (card.screenshot_required !== 'no' && !hasScreenshotEvidence(card)) {
        addIssue(issues, 'error', 'readiness', 'done-without-screenshot', card.id, `${card.id} is done but has no screenshot evidence.`);
      }
    }

    validateNormalCopy(card, issues);
  }

  for (const decision of model.decisions) {
    for (const key of ['id', 'status', 'scope', 'decision', 'chosen_path', 'why', 'risk', 'follow_up']) {
      if (decision[key] === undefined || decision[key] === '') {
        addIssue(issues, 'error', 'decision', 'missing-field', decision.id, `${decision.id} is missing ${key}.`);
      }
    }
    for (const cardId of toList(decision.cards)) {
      if (!cardIds.has(cardId)) {
        addIssue(issues, 'error', 'traceability', 'decision-missing-card', decision.id, `${decision.id} references missing ${cardId}.`);
      }
    }
  }

  if (countByStatus(model.cards, 'building') > 3) {
    addIssue(issues, 'warning', 'board-policy', 'building-wip-limit', 'building', 'More than three cards are building.');
  }
  if (countByStatus(model.cards, 'validation') > 5) {
    addIssue(issues, 'warning', 'board-policy', 'validation-wip-limit', 'validation', 'More than five cards are in validation.');
  }
  for (const screen of model.appInventory.referencedScreensMissing) {
    addIssue(issues, 'warning', 'app-map', 'referenced-screen-missing', screen, `${screen} is referenced by a product card but was not found in router or screen files.`);
  }
  for (const test of model.appInventory.referencedTestsMissing) {
    addIssue(issues, 'warning', 'app-map', 'referenced-test-missing', test, `${test} is referenced by a product card but was not found.`);
  }

  if (requireGenerated) {
    for (const output of [
      'product/board.html',
      'product/generated/product-resume.md',
      'product/evidence/product-status-latest.json',
      'product/evidence/product-readiness-latest.json',
      'product/evidence/product-traceability-latest.json',
      'product/evidence/product-integrity-latest.json',
      'product/evidence/product-history-latest.json'
    ]) {
      if (!existsSync(resolve(repoRoot, output))) {
        addIssue(issues, 'error', 'generated', 'missing-generated-output', output, `${output} has not been generated.`);
      }
    }
  }

  return {
    generatedAt: model.generatedAt,
    source: 'product/cards.md',
    sourceHash: sha256(readFile(cardsPath)),
    summary: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
      cards: model.cards.length,
      decisions: model.decisions.length,
      decisionContracts: model.decisionContracts.length,
      history: model.history.length,
      readyOrActive: model.cards.filter((card) => gatedStatuses.has(card.status)).length,
      blocked: model.cards.filter((card) => card.status === 'blocked').length
    },
    issues
  };
}

function validateProductGate(card, issues) {
  const total = card.total_score;
  const expected = card.friction_score + card.trust_score + card.clarity_score + card.language_score;
  if (card.friction_score < 0 || card.friction_score > 3) {
    addIssue(issues, 'error', 'product-gate', 'bad-friction-score', card.id, `${card.id} has invalid friction score.`);
  }
  if (card.trust_score < 0 || card.trust_score > 3) {
    addIssue(issues, 'error', 'product-gate', 'bad-trust-score', card.id, `${card.id} has invalid trust score.`);
  }
  if (card.clarity_score < 0 || card.clarity_score > 3) {
    addIssue(issues, 'error', 'product-gate', 'bad-clarity-score', card.id, `${card.id} has invalid clarity score.`);
  }
  if (card.language_score < 0 || card.language_score > 1) {
    addIssue(issues, 'error', 'product-gate', 'bad-language-score', card.id, `${card.id} has invalid language score.`);
  }
  if (total !== expected) {
    addIssue(issues, 'error', 'product-gate', 'score-mismatch', card.id, `${card.id} total score ${total} does not equal component sum ${expected}.`);
  }
  if (total < 8 && card.status !== 'blocked') {
    addIssue(issues, 'error', 'product-gate', 'score-too-low', card.id, `${card.id} is ${card.status} with score ${total}/10.`);
  }
  if (card.language_score < 1) {
    addIssue(issues, 'error', 'product-gate', 'language-failed', card.id, `${card.id} language score is below 1.`);
  }
}

function validateNormalCopy(card, issues) {
  const normalFields = [card.user_story, card.one_next_action, card.next_action, card.acceptance].join(' ');
  for (const word of hardForbiddenUserWords) {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (pattern.test(normalFields) && card.module !== 'polkadot-native') {
      addIssue(issues, 'error', 'language', 'forbidden-normal-copy', card.id, `${card.id} normal copy contains "${word}".`);
    }
  }
  if (/manual item/i.test(`${card.user_story} ${card.one_next_action} ${card.next_action}`)) {
    addIssue(issues, 'error', 'language', 'manual-item-default', card.id, `${card.id} appears to default to manual item entry.`);
  }
}

function writeAll(model, validation) {
  writeGeneratedViews(model, validation);
  writeEvidence(model, validation);
}

function writeGeneratedViews(model, validation) {
  ensureDirs();
  const board = renderBoard(model, validation);
  writeFile('product/board.html', board);
  writeFile('product/generated/product-cockpit.html', board);
  writeFile('product/generated/current-app-map.md', renderCurrentAppMap(model));
  writeFile('product/generated/current-product-map.md', renderCurrentProductMap(model, validation));
  writeFile('product/generated/journey-to-component-map.md', renderJourneyComponentMap(model));
  writeFile('product/generated/feature-to-test-coverage.md', renderFeatureCoverage(model));
  writeFile('product/generated/friction-register.md', renderFrictionRegister(model));
  writeFile('product/generated/agent-routing-board.md', renderAgentRouting(model));
  writeFile('product/generated/readiness-scorecard.md', renderReadinessScorecard(model, validation));
  writeFile('product/generated/product-resume.md', renderProductResume(model, validation));
}

function writeEvidence(model, validation) {
  writeFile('product/evidence/product-status-latest.json', JSON.stringify(buildStatus(model, validation), null, 2) + '\n');
  writeFile('product/evidence/current-app-inventory-latest.json', JSON.stringify(model.appInventory, null, 2) + '\n');
  writeTraceabilityEvidence(model, validation);
  writeReadinessEvidence(model, validation);
  writeFile('product/evidence/product-integrity-latest.json', JSON.stringify(validation, null, 2) + '\n');
  writeFile('product/evidence/product-history-latest.json', JSON.stringify(buildHistory(model), null, 2) + '\n');
}

function writeTraceabilityEvidence(model, validation) {
  writeFile('product/evidence/product-traceability-latest.json', JSON.stringify(buildTraceability(model, validation), null, 2) + '\n');
}

function writeReadinessEvidence(model, validation) {
  writeFile('product/evidence/product-readiness-latest.json', JSON.stringify(buildReadiness(model, validation), null, 2) + '\n');
}

function renderBoard(model, validation) {
  const groups = groupCards(model.cards);
  const stats = buildStats(model, validation);
  const clientData = buildClientData(model, validation);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ChopDot Product Cockpit</title>
  <style>${boardCss()}</style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">ChopDot product cockpit</p>
        <h1>Build what lowers friction and raises trust.</h1>
      </div>
      <div class="top-actions">
        <button class="button secondary" type="button" data-copy="npm run product:refresh">Copy refresh</button>
        <a class="button secondary" href="./generated/user-path-coverage.html">Open path coverage</a>
        <a class="button primary" href="./generated/product-resume.md">Open resume</a>
      </div>
    </header>

    <section class="summary-strip" aria-label="Product status">
      ${metric('Cards', stats.cards)}
      ${metric('Ready or active', stats.readyOrActive)}
      ${metric('Blocked', stats.blocked)}
      ${metric('Screens', model.appInventory.summary.screenFiles)}
      ${metric('Unmapped screens', model.appInventory.summary.orphanScreens)}
      ${metric('Gate errors', validation.summary.errors)}
      ${metric('Warnings', validation.summary.warnings)}
    </section>

    <section class="source-banner">
      <span>Source: <code>product/cards.md</code>, <code>product/decisions.md</code>, roadmap, outcomes, and append-only history.</span>
      <span>Generated: ${escapeHtml(formatDateTime(model.generatedAt))}</span>
    </section>

    <section class="priority-panel" aria-label="Next best work">
      <div>
        <p class="eyebrow">Next best card</p>
        ${renderHeroCard(nextBestCard(model.cards))}
      </div>
      <div>
        <p class="eyebrow">System warning</p>
        <div class="warning-box">
          ${validation.summary.errors === 0
            ? 'No blocking cockpit errors. Keep screenshot review before promoting user-facing work.'
            : `${validation.summary.errors} cockpit error(s) need attention before promotion.`}
        </div>
        <p class="eyebrow app-map-eyebrow">Current app map</p>
        <div class="warning-box">
          ${model.appInventory.summary.mappedScreens}/${model.appInventory.summary.screenFiles} screen files mapped to product cards.
          <br><a href="./generated/current-app-map.md">Open current app map</a>
        </div>
      </div>
    </section>

    <section class="toolbar" aria-label="Cockpit controls">
      <div class="tabs" role="group" aria-label="Views">
        ${['Roadmap', 'Kanban', 'Decisions', 'History'].map((name, index) => `<button class="tab" type="button" data-view="${name.toLowerCase()}" aria-pressed="${index === 0 ? 'true' : 'false'}">${name}</button>`).join('')}
      </div>
      <div class="filters">
        <input id="search" type="search" placeholder="Search cards, modules, decisions">
        <select id="scope-filter">
          <option value="">All scopes</option>
          ${scopes.map((scope) => `<option value="${escapeAttribute(scope)}">${escapeHtml(scope)}</option>`).join('')}
        </select>
        <select id="status-filter">
          <option value="">All statuses</option>
          ${statuses.map((status) => `<option value="${escapeAttribute(status)}">${escapeHtml(status)}</option>`).join('')}
        </select>
      </div>
    </section>

    <section class="view" id="roadmap-view">
      ${renderRoadmap(model)}
    </section>

    <section class="view" id="kanban-view" hidden>
      <div class="board">
        ${statuses.map((status) => renderColumn(status, groups.byStatus.get(status) ?? [])).join('')}
      </div>
    </section>

    <section class="view" id="decisions-view" hidden>
      ${renderDecisions(model)}
    </section>

    <section class="view" id="history-view" hidden>
      ${renderHistory(model)}
    </section>
  </main>
  ${renderOperatorDrawer()}
  <script>window.__CHOPDOT_COCKPIT__ = ${safeJson(clientData)};</script>
  <script>${boardJs()}</script>
</body>
</html>
`;
}

function renderHeroCard(card) {
  if (!card) {
    return '<div class="hero-card">No active cards.</div>';
  }
  return `<article class="hero-card product-card" role="button" tabindex="0" data-card-id="${escapeAttribute(card.id)}" data-scope="${escapeAttribute(card.scope)}" data-status="${escapeAttribute(card.status)}" data-search="${searchBlob(card)}">
    <div class="card-top">
      <span class="card-id">${escapeHtml(card.id)}</span>
      <span class="status status-${escapeAttribute(card.status)}">${escapeHtml(card.status)}</span>
    </div>
    <h2>${escapeHtml(card.title)}</h2>
    <p>${escapeHtml(card.user_story)}</p>
    <div class="next-action">${escapeHtml(card.one_next_action)}</div>
    <dl class="mini-grid">
      <div><dt>Score</dt><dd>${card.total_score}/10</dd></div>
      <div><dt>Scope</dt><dd>${escapeHtml(card.scope)}</dd></div>
      <div><dt>Evidence</dt><dd>${escapeHtml(card.evidence_quality)}</dd></div>
    </dl>
  </article>`;
}

function renderRoadmap(model) {
  const sections = [
    ['Now', ['ready', 'building', 'validation']],
    ['Next', ['discovery', 'measuring']],
    ['Blocked', ['blocked']],
    ['Done / Deferred', ['done', 'deferred']]
  ];
  return `<div class="roadmap">
    ${sections.map(([label, sectionStatuses]) => {
      const cards = model.cards.filter((card) => sectionStatuses.includes(card.status));
      return `<section class="lane">
        <h2>${escapeHtml(label)}</h2>
        <div class="lane-body">${cards.length ? cards.map(renderCard).join('') : '<p class="empty">No cards in this lane.</p>'}</div>
      </section>`;
    }).join('')}
  </div>`;
}

function renderColumn(status, cards) {
  return `<section class="column" data-column="${escapeAttribute(status)}">
    <h2>${escapeHtml(status)} <span>${cards.length}</span></h2>
    ${cards.length ? cards.map(renderCard).join('') : '<p class="empty">Empty</p>'}
  </section>`;
}

function renderCard(card) {
  return `<article class="product-card" role="button" tabindex="0" data-card-id="${escapeAttribute(card.id)}" data-scope="${escapeAttribute(card.scope)}" data-status="${escapeAttribute(card.status)}" data-search="${searchBlob(card)}">
    <div class="card-top">
      <span class="card-id">${escapeHtml(card.id)}</span>
      <span class="status status-${escapeAttribute(card.status)}">${escapeHtml(card.status)}</span>
    </div>
    <h3>${escapeHtml(card.title)}</h3>
    <p>${escapeHtml(card.user_story)}</p>
    <div class="next-action">${escapeHtml(card.one_next_action)}</div>
    <dl class="mini-grid">
      <div><dt>Score</dt><dd>${card.total_score}/10</dd></div>
      <div><dt>Scope</dt><dd>${escapeHtml(card.scope)}</dd></div>
      <div><dt>Priority</dt><dd>${escapeHtml(card.priority)}</dd></div>
      <div><dt>Proof</dt><dd>${escapeHtml(card.evidence_quality)}</dd></div>
    </dl>
    <details>
      <summary>Why and next</summary>
      <p><strong>Why:</strong> ${escapeHtml(card.why)}</p>
      <p><strong>Falsifier:</strong> ${escapeHtml(card.challenge)}</p>
      <p><strong>Next:</strong> ${escapeHtml(card.next_action)}</p>
      <p><strong>Tests:</strong> ${escapeHtml(card.tests.join(', ') || 'none')}</p>
      <p><strong>Screens:</strong> ${escapeHtml(card.screens.join(', ') || 'none')}</p>
    </details>
  </article>`;
}

function renderOperatorDrawer() {
  return `<div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
  <aside class="drawer" id="card-drawer" aria-label="Product card detail" aria-hidden="true">
    <div class="drawer-header">
      <div>
        <p class="eyebrow">Card detail</p>
        <h2 id="drawer-title">Select a card</h2>
      </div>
      <button class="icon-button" type="button" data-close-drawer aria-label="Close card detail">×</button>
    </div>
    <div class="drawer-body" id="drawer-body">
      <p>Select a card to inspect the journey, gate, proof, and next action.</p>
    </div>
  </aside>`;
}

function renderDecisions(model) {
  const buckets = [
    ['Ready for decision', model.cards.filter((card) => ['validation', 'measuring'].includes(card.status) && card.evidence_quality !== 'none')],
    ['Evidence missing', model.cards.filter((card) => ['ready', 'building', 'validation'].includes(card.status) && ['none', 'thin'].includes(card.evidence_quality))],
    ['Blocked by dependency', model.cards.filter((card) => card.status === 'blocked')],
    ['Decision recorded', model.cards.filter((card) => model.decisions.some((decision) => toList(decision.cards).includes(card.id)))]
  ];
  return `<div class="decision-stack">
    <div class="board decision-board">
      ${buckets.map(([label, cards]) => `<section class="column"><h2>${escapeHtml(label)} <span>${cards.length}</span></h2>${cards.map(renderCard).join('') || '<p class="empty">Empty</p>'}</section>`).join('')}
    </div>
    <section class="records">
      <h2>Decision records</h2>
      ${model.decisions.map((decision) => `<article class="record">
        <div class="card-top"><span class="card-id">${escapeHtml(decision.id)}</span><span class="status">${escapeHtml(decision.status)}</span></div>
        <h3>${escapeHtml(decision.title)}</h3>
        <p>${escapeHtml(decision.decision)}</p>
        <p><strong>Why:</strong> ${escapeHtml(decision.why)}</p>
        <p><strong>Follow-up:</strong> ${escapeHtml(decision.follow_up)}</p>
      </article>`).join('')}
    </section>
  </div>`;
}

function renderHistory(model) {
  const events = [...model.history].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return `<div class="history-list">
    ${events.length ? events.map((event) => `<article class="record">
      <div class="card-top"><span class="card-id">${escapeHtml(event.id ?? 'event')}</span><span class="status">${escapeHtml(event.type ?? 'checkpoint')}</span></div>
      <h3>${escapeHtml(event.summary ?? 'Untitled event')}</h3>
      <p>${escapeHtml(event.timestamp ?? '')}</p>
      <p><strong>Cards:</strong> ${escapeHtml(toList(event.cards).join(', ') || 'none')}</p>
      <p><strong>Evidence:</strong> ${escapeHtml(toList(event.evidence).join(', ') || 'none')}</p>
    </article>`).join('') : '<p class="empty">No history events yet.</p>'}
  </div>`;
}

function renderCurrentProductMap(model, validation) {
  const lines = generatedHeader('ChopDot Current Product Map');
  lines.push('## Summary', '');
  lines.push(`- Cards: ${model.cards.length}`);
  lines.push(`- Decisions: ${model.decisions.length}`);
  lines.push(`- History events: ${model.history.length}`);
  lines.push(`- Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s)`);
  lines.push('', '## Cards', '');
  lines.push('| Card | Status | Scope | Score | One next action | Evidence |');
  lines.push('| --- | --- | --- | ---: | --- | --- |');
  for (const card of model.cards) {
    lines.push(`| ${card.id} ${pipe(card.title)} | ${card.status} | ${card.scope} | ${card.total_score}/10 | ${pipe(card.one_next_action)} | ${card.evidence_quality} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderCurrentAppMap(model) {
  const inventory = model.appInventory;
  const lines = generatedHeader('ChopDot Current App Map');
  lines.push('## Summary', '');
  lines.push(`- Screen types in nav: ${inventory.summary.screenTypes}`);
  lines.push(`- Router entries: ${inventory.summary.routerEntries}`);
  lines.push(`- Render functions: ${inventory.summary.renderFunctions}`);
  lines.push(`- Screen files: ${inventory.summary.screenFiles}`);
  lines.push(`- Tests found: ${inventory.summary.tests}`);
  lines.push(`- Screens mapped to product cards: ${inventory.summary.mappedScreens}`);
  lines.push(`- Screens not yet mapped to product cards: ${inventory.summary.orphanScreens}`);
  lines.push(`- Product card screen refs not found: ${inventory.summary.referencedScreensMissing}`);
  lines.push(`- Product card test refs not found: ${inventory.summary.referencedTestsMissing}`);
  lines.push('', '## Routes', '');
  lines.push('| Route | Screen type | Renderer | Product cards |');
  lines.push('| --- | --- | --- | --- |');
  for (const route of inventory.routes) {
    lines.push(`| ${pipe(route.route)} | ${route.screenType} | ${route.renderer ?? 'missing'} | ${route.productCards.join(', ') || 'unmapped'} |`);
  }
  lines.push('', '## Screens', '');
  lines.push('| Screen component | Screen types | File | Product cards |');
  lines.push('| --- | --- | --- | --- |');
  for (const screen of inventory.screenCoverage) {
    lines.push(`| ${screen.component} | ${screen.screenTypes.join(', ') || 'not routed directly'} | ${pipe(screen.file)} | ${screen.productCards.join(', ') || 'unmapped'} |`);
  }
  lines.push('', '## Unmapped Screens', '');
  for (const screen of inventory.orphanScreens) {
    lines.push(`- ${screen}`);
  }
  lines.push('', '## Missing References', '');
  lines.push('### Screens');
  for (const screen of inventory.referencedScreensMissing) {
    lines.push(`- ${screen}`);
  }
  lines.push('### Tests');
  for (const test of inventory.referencedTestsMissing) {
    lines.push(`- ${test}`);
  }
  return `${lines.join('\n')}\n`;
}

function renderJourneyComponentMap(model) {
  const lines = generatedHeader('ChopDot Journey To Component Map');
  lines.push('| Card | Journey | Screens | Tests | Decision |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const card of model.cards) {
    lines.push(`| ${card.id} ${pipe(card.title)} | ${pipe(card.journey)} | ${pipe(card.screens.join(', '))} | ${pipe(card.tests.join(', '))} | ${card.decision_contract} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderFeatureCoverage(model) {
  const lines = generatedHeader('ChopDot Feature To Test Coverage');
  lines.push('| Card | Module | Status | Tests | Missing? |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const card of model.cards) {
    lines.push(`| ${card.id} ${pipe(card.title)} | ${card.module} | ${card.status} | ${pipe(card.tests.join(', ') || 'none')} | ${card.tests.length ? 'no' : 'yes'} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderFrictionRegister(model) {
  const lines = generatedHeader('ChopDot Friction Register');
  lines.push('| Card | Friction | Trust | Clarity | Language | Falsifier |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const card of model.cards) {
    lines.push(`| ${card.id} ${pipe(card.title)} | ${card.friction_score}/3 | ${card.trust_score}/3 | ${card.clarity_score}/3 | ${card.language_score}/1 | ${pipe(card.challenge)} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderAgentRouting(model) {
  const lines = generatedHeader('ChopDot Agent Routing Board');
  lines.push('| Card | Owner | Status | Next action | Human review? |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const card of model.cards) {
    const humanReview = card.screenshot_required === 'yes' && ['validation', 'measuring', 'done'].includes(card.status) ? 'yes' : 'before promotion';
    lines.push(`| ${card.id} ${pipe(card.title)} | ${card.owner} | ${card.status} | ${pipe(card.next_action)} | ${humanReview} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderReadinessScorecard(model, validation) {
  const lines = generatedHeader('ChopDot Readiness Scorecard');
  lines.push(`Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s).`, '');
  lines.push('| Card | Readiness | Reason |');
  lines.push('| --- | --- | --- |');
  for (const card of model.cards) {
    lines.push(`| ${card.id} ${pipe(card.title)} | ${readinessLabel(card)} | ${pipe(readinessReason(card))} |`);
  }
  return `${lines.join('\n')}\n`;
}

function renderProductResume(model, validation) {
  const active = model.cards.filter((card) => ['ready', 'building', 'validation'].includes(card.status)).sort(compareCards).slice(0, 8);
  const blocked = model.cards.filter((card) => card.status === 'blocked');
  const lines = generatedHeader('ChopDot Product Resume');
  lines.push('## Product Thesis', '');
  lines.push('ChopDot should help groups capture money moments, make the next action obvious, confirm what happened, and close with a readable saved record.');
  lines.push('', '## Current Health', '');
  lines.push(`- Validation: ${validation.summary.errors} error(s), ${validation.summary.warnings} warning(s)`);
  lines.push(`- Active or ready cards: ${active.length}`);
  lines.push(`- Blocked cards: ${blocked.length}`);
  lines.push(`- Current app screens mapped: ${model.appInventory.summary.mappedScreens}/${model.appInventory.summary.screenFiles}`);
  lines.push(`- Current app unmapped screens: ${model.appInventory.summary.orphanScreens}`);
  lines.push('', '## Top Work', '');
  for (const card of active) {
    lines.push(`- ${card.id} ${card.title}: ${card.one_next_action} (${card.status}, ${card.total_score}/10)`);
  }
  lines.push('', '## Blocked', '');
  for (const card of blocked) {
    lines.push(`- ${card.id} ${card.title}: ${card.blocker}`);
  }
  lines.push('', '## Next Agent Instruction', '');
  const next = nextBestCard(model.cards);
  lines.push(next ? `Start with ${next.id} ${next.title}. One next action: ${next.one_next_action}. Falsifier: ${next.challenge}.` : 'No active next card.');
  lines.push('', '## Boundaries', '');
  lines.push('- Do not expose internal technical language in normal ChopDot UI.');
  lines.push('- Do not mark agent success as human approval without operator review.');
  lines.push('- Do not block local product progress on live .dot availability.');
  return `${lines.join('\n')}\n`;
}

function buildStatus(model, validation) {
  return {
    generatedAt: model.generatedAt,
    summary: validation.summary,
    byStatus: Object.fromEntries(statuses.map((status) => [status, countByStatus(model.cards, status)])),
    topCard: nextBestCard(model.cards)?.id ?? null
  };
}

function buildTraceability(model, validation = null) {
  return {
    generatedAt: model.generatedAt,
    validation: validation?.summary ?? null,
    appInventory: model.appInventory.summary,
    links: model.cards.map((card) => ({
      card: card.id,
      title: card.title,
      journey: card.journey,
      scope: card.scope,
      module: card.module,
      screens: card.screens,
      mappedAppScreens: model.appInventory.screenCoverage.filter((screen) => screen.productCards.includes(card.id)).map((screen) => screen.file),
      tests: card.tests,
      evidence: card.evidence,
      decisionContract: card.decision_contract
    }))
  };
}

function buildReadiness(model, validation = null) {
  return {
    generatedAt: model.generatedAt,
    validation: validation?.summary ?? null,
    summary: {
      cards: model.cards.length,
      activeOrReady: model.cards.filter((card) => gatedStatuses.has(card.status)).length,
      blocked: model.cards.filter((card) => card.status === 'blocked').length,
      readyForPilot: model.cards.filter((card) => ['validation', 'measuring', 'done'].includes(card.status) && card.total_score >= 8).length
    },
    cards: model.cards.map((card) => ({
      id: card.id,
      title: card.title,
      status: card.status,
      readiness: readinessLabel(card),
      reason: readinessReason(card),
      score: card.total_score,
      evidenceQuality: card.evidence_quality,
      nextAction: card.next_action
    }))
  };
}

function buildHistory(model) {
  return {
    generatedAt: model.generatedAt,
    count: model.history.length,
    events: model.history
  };
}

function buildClientData(model, validation) {
  const issuesBySubject = new Map();
  for (const issue of validation.issues) {
    if (!issuesBySubject.has(issue.subject)) {
      issuesBySubject.set(issue.subject, []);
    }
    issuesBySubject.get(issue.subject).push(issue);
  }
  return {
    generatedAt: model.generatedAt,
    cards: model.cards.map((card) => ({
      ...card,
      issues: issuesBySubject.get(card.id) ?? [],
      appScreens: model.appInventory.screenCoverage.filter((screen) => screen.productCards.includes(card.id)),
      commands: buildCardCommands(card)
    })),
    decisions: model.decisions,
    decisionContracts: model.decisionContracts,
    validation,
    appInventory: model.appInventory
  };
}

function buildCardCommands(card) {
  const safeSummary = card.title.replace(/"/g, "'");
  return {
    start: `npm run product:start -- --id=${card.id} --summary="${safeSummary}"`,
    finish: `npm run product:finish -- --id=${card.id} --status=done --evidence=PATH --evidence-quality=partial --summary="${safeSummary}"`,
    checkpoint: `npm run product:checkpoint -- --summary="${safeSummary}" --cards=${card.id} --evidence=PATH`,
    query: `npm run product:query -- "${card.id}"`
  };
}

function lifecycle(action, options) {
  const id = required(options, 'id');
  const actor = options.actor ?? process.env.USER ?? 'codex';
  const model = readModel();
  const card = model.cards.find((candidate) => candidate.id === id);
  if (!card) {
    throw new Error(`Unknown card ${id}`);
  }
  if (action === 'start' && ['done', 'deferred'].includes(card.status)) {
    throw new Error(`${id} is ${card.status}; reopen manually before starting.`);
  }
  if (action === 'finish' && (toList(options.evidence).length === 0 && card.evidence.length === 0)) {
    throw new Error('product:finish requires --evidence=... unless the card already has evidence.');
  }

  const targetStatus = options.status ?? (action === 'start' ? 'building' : 'done');
  const nextCard = {
    ...card,
    status: targetStatus,
    owner: actor,
    blocker: options.blocker ?? 'none',
    last_touched: today(),
    evidence_quality: options['evidence-quality'] ?? options.evidenceQuality ?? card.evidence_quality,
    evidence: unique([...card.evidence, ...toList(options.evidence)]),
    next_action: options['next-action'] ?? options.nextAction ?? card.next_action
  };
  const validation = validateModel({ ...model, cards: model.cards.map((candidate) => candidate.id === id ? nextCard : candidate) });
  const blocking = validation.issues.filter((issue) => issue.severity === 'error' && issue.subject === id);
  if (blocking.length) {
    throw new Error(`Lifecycle update would invalidate ${id}:\n${blocking.map((issue) => `- ${issue.message}`).join('\n')}`);
  }

  updateCardInMarkdown(id, nextCard);
  writeCheckpoint({
    type: action === 'start' ? 'claim' : 'release',
    summary: options.summary ?? `${action === 'start' ? 'Started' : 'Finished'} ${id}`,
    cards: id,
    evidence: unique(['product/cards.md', ...toList(options.evidence)]).join(','),
    notes: options.notes ?? ''
  });
  refreshAndPrint();
}

function writeCheckpoint(options) {
  ensureDirs();
  const now = new Date();
  const safe = (options.summary ?? 'checkpoint').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'checkpoint';
  const id = `H-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${safe}`;
  const event = {
    id,
    timestamp: now.toISOString(),
    type: options.type ?? 'checkpoint',
    summary: options.summary ?? 'Product checkpoint',
    cards: toList(options.cards),
    roadmap: toList(options.roadmap),
    evidence: toList(options.evidence),
    notes: toList(options.notes)
  };
  writeFileSync(resolve(historyDir, `${id}.json`), `${JSON.stringify(event, null, 2)}\n`);
}

function updateCardInMarkdown(id, nextCard) {
  const markdown = readFile(cardsPath);
  const sections = [...markdown.matchAll(/^##\s+(P-\d+)\s+-\s+(.+)$/gm)];
  const index = sections.findIndex((match) => match[1] === id);
  if (index === -1) {
    throw new Error(`Unable to find card ${id} in product/cards.md`);
  }
  const start = sections[index].index;
  const end = sections[index + 1]?.index ?? markdown.length;
  const section = markdown.slice(start, end);
  const yamlMatch = section.match(/```yaml\n([\s\S]*?)\n```/);
  if (!yamlMatch || yamlMatch.index === undefined) {
    throw new Error(`${id} has no yaml block.`);
  }
  const yaml = renderYaml(nextCard);
  const nextSection = `${section.slice(0, yamlMatch.index)}\`\`\`yaml\n${yaml}\n\`\`\`${section.slice(yamlMatch.index + yamlMatch[0].length)}`;
  writeFileSync(cardsPath, `${markdown.slice(0, start)}${nextSection}${markdown.slice(end)}`);
}

async function captureCockpitScreenshot() {
  const boardPath = resolve(productDir, 'board.html');
  if (!existsSync(boardPath)) {
    const model = readModel();
    const validation = validateModel(model);
    writeGeneratedViews(model, validation);
  }
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is not available for product:cockpit:screenshot.');
  }
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(pathToFileURL(boardPath).href);
  await page.screenshot({ path: resolve(screenshotDir, 'product-cockpit-latest.png'), fullPage: true });
  await page.locator('[data-card-id]').first().click();
  await page.locator('#card-drawer.is-open').waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: resolve(screenshotDir, 'product-cockpit-drawer-latest.png'), fullPage: true });
  await browser.close();
  writeFile('product/evidence/product-cockpit-screenshot-latest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    screenshot: 'product/evidence/screenshots/product-cockpit-latest.png',
    drawerScreenshot: 'product/evidence/screenshots/product-cockpit-drawer-latest.png',
    viewport: { width: 1440, height: 1100 },
    reviewed: false,
    note: 'Board and card detail drawer screenshots captured for operator visual review.'
  }, null, 2) + '\n');
  console.log('Cockpit screenshots captured: product/evidence/screenshots/product-cockpit-latest.png and product/evidence/screenshots/product-cockpit-drawer-latest.png');
}

function writeVisualReview() {
  const screenshotPath = resolve(screenshotDir, 'product-cockpit-latest.png');
  const drawerScreenshotPath = resolve(screenshotDir, 'product-cockpit-drawer-latest.png');
  const exists = existsSync(screenshotPath);
  const drawerExists = existsSync(drawerScreenshotPath);
  writeFile('product/evidence/product-cockpit-visual-review-latest.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    screenshot: exists ? 'product/evidence/screenshots/product-cockpit-latest.png' : null,
    drawerScreenshot: drawerExists ? 'product/evidence/screenshots/product-cockpit-drawer-latest.png' : null,
    result: exists && drawerExists ? 'needs-human-review' : 'missing-screenshot',
    checks: {
      topPriorityVisible: exists,
      tabsVisible: exists,
      filtersVisible: exists,
      nextActionVisible: exists,
      cardDrawerVisible: drawerExists,
      guardedCommandsVisible: drawerExists,
      noOldUglyCockpitAsPrimary: true
    },
    note: exists && drawerExists
      ? 'Automated review confirms board and drawer screenshots exist; human review still required for taste and product feel.'
      : 'Run npm run product:cockpit:screenshot first.'
  }, null, 2) + '\n');
  if (!exists || !drawerExists) {
    throw new Error('Missing cockpit screenshot. Run npm run product:cockpit:screenshot first.');
  }
}

function refreshAndPrint() {
  const model = readModel();
  const validation = validateModel(model);
  writeAll(model, validation);
  printSummary(model, validation);
  if (validation.summary.errors > 0) {
    process.exitCode = 1;
  }
}

function queryModel(model, query) {
  const q = query.toLowerCase();
  if (!q || q.includes('next')) {
    const next = nextBestCard(model.cards);
    return next ? `${next.id} ${next.title}\nNext action: ${next.next_action}\nFalsifier: ${next.challenge}` : 'No next card.';
  }
  if (q.includes('block')) {
    return model.cards.filter((card) => card.status === 'blocked').map((card) => `${card.id} ${card.title}: ${card.blocker}`).join('\n') || 'No blocked cards.';
  }
  if (q.includes('ready')) {
    return model.cards.filter((card) => ['ready', 'validation'].includes(card.status)).map((card) => `${card.id} ${card.title}: ${card.one_next_action}`).join('\n') || 'No ready cards.';
  }
  return model.cards
    .filter((card) => searchBlob(card).includes(q))
    .map((card) => `${card.id} ${card.title} [${card.status}] ${card.next_action}`)
    .join('\n') || `No cards matched "${query}".`;
}

function renderHistoryCli(model) {
  return model.history
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .map((event) => `${event.timestamp} ${event.id}\n${event.summary}\nCards: ${toList(event.cards).join(', ') || 'none'}\n`)
    .join('\n') || 'No history events.';
}

function readHistoryEvents() {
  if (!existsSync(historyDir)) {
    return [];
  }
  return readdirSync(historyDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      try {
        return JSON.parse(readFileSync(resolve(historyDir, file), 'utf8'));
      } catch (error) {
        return {
          id: basename(file, '.json'),
          timestamp: null,
          type: 'invalid',
          summary: `Invalid history event: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    });
}

function parseSections(markdown, headingPattern) {
  const matches = [...markdown.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? markdown.length;
    return {
      id: match[1],
      title: match[2].trim(),
      body: markdown.slice(start, end)
    };
  });
}

function parseYamlBlock(markdown, subject) {
  const match = markdown.match(/```yaml\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error(`${subject} is missing a yaml block.`);
  }
  return parseSimpleYaml(match[1]);
}

function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split(/\r?\n/);
  let currentArrayKey = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) {
      continue;
    }
    const arrayMatch = line.match(/^\s*-\s*(.*)$/);
    if (arrayMatch && currentArrayKey) {
      result[currentArrayKey].push(parseScalar(arrayMatch[1]));
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyMatch) {
      continue;
    }
    const [, key, value = ''] = keyMatch;
    if (value === '') {
      result[key] = [];
      currentArrayKey = key;
    } else {
      result[key] = parseScalar(value);
      currentArrayKey = null;
    }
  }
  return result;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '[]') {
    return [];
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function stripYaml(markdown) {
  return markdown.replace(/```yaml\n[\s\S]*?\n```/, '');
}

function renderYaml(card) {
  const order = [
    'id',
    'type',
    'title',
    'status',
    'scope',
    'module',
    'journey',
    'pillar',
    'priority',
    'evidence_quality',
    'owner',
    'depends_on',
    'blocker',
    'decision_contract',
    'tests',
    'screens',
    'evidence',
    'next_action',
    'user_story',
    'one_next_action',
    'friction_score',
    'trust_score',
    'clarity_score',
    'language_score',
    'total_score',
    'why',
    'challenge',
    'acceptance',
    'screenshot_required',
    'last_touched'
  ];
  return order
    .filter((key) => card[key] !== undefined)
    .map((key) => {
      const value = card[key];
      if (Array.isArray(value)) {
        return value.length ? `${key}:\n${value.map((item) => `  - ${quote(item)}`).join('\n')}` : `${key}: []`;
      }
      if (typeof value === 'number') {
        return `${key}: ${value}`;
      }
      return `${key}: ${quote(value)}`;
    })
    .join('\n');
}

function boardCss() {
  return `
:root {
  color-scheme: light;
  --bg: #f7f4f0;
  --paper: #fffdf9;
  --ink: #151416;
  --muted: #6e696b;
  --line: #ded8d0;
  --pink: #ff2f8a;
  --pink-dark: #d9146a;
  --green: #0b8a55;
  --amber: #9a6500;
  --red: #b42318;
  --blue: #1f5eff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); }
button, input, select { font: inherit; }
.shell { max-width: 1500px; margin: 0 auto; padding: 24px; }
.topbar { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 18px; }
.eyebrow { margin: 0 0 6px; color: var(--muted); font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(32px, 5vw, 72px); line-height: .94; letter-spacing: 0; max-width: 900px; }
h2, h3, p { margin-top: 0; }
.top-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.button { border: 1px solid var(--ink); border-radius: 8px; padding: 10px 14px; text-decoration: none; color: var(--ink); background: var(--paper); cursor: pointer; }
.button.primary { background: var(--pink); border-color: var(--pink); color: #fff; font-weight: 800; }
.button.secondary { color: var(--ink); }
.summary-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); border: 1px solid var(--line); background: var(--paper); border-radius: 8px; overflow: hidden; margin: 18px 0; }
.metric { padding: 14px 16px; border-right: 1px solid var(--line); }
.metric:last-child { border-right: 0; }
.metric dt { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
.metric dd { margin: 3px 0 0; font-size: 26px; font-weight: 850; }
.source-banner { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; background: #fff7fb; color: #3b3035; margin-bottom: 18px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.priority-panel { display: grid; grid-template-columns: 1.4fr .8fr; gap: 18px; margin-bottom: 20px; }
.warning-box, .hero-card { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
.warning-box a { color: var(--pink-dark); font-weight: 850; }
.app-map-eyebrow { margin-top: 16px; }
.toolbar { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin: 18px 0; position: sticky; top: 0; background: rgba(247,244,240,.95); padding: 10px 0; z-index: 2; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab { border: 1px solid var(--line); background: var(--paper); border-radius: 999px; padding: 9px 14px; cursor: pointer; }
.tab[aria-pressed="true"] { background: var(--ink); color: #fff; border-color: var(--ink); }
.filters { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.filters input, .filters select { border: 1px solid var(--line); background: var(--paper); border-radius: 8px; padding: 9px 10px; min-height: 40px; }
.roadmap { display: grid; grid-template-columns: repeat(4, minmax(250px, 1fr)); gap: 14px; align-items: start; }
.board { display: grid; grid-template-columns: repeat(9, minmax(260px, 1fr)); gap: 14px; overflow-x: auto; padding-bottom: 12px; }
.decision-board { grid-template-columns: repeat(4, minmax(280px, 1fr)); }
.lane, .column { min-width: 0; }
.lane > h2, .column > h2, .records > h2 { font-size: 14px; text-transform: uppercase; color: var(--muted); letter-spacing: .05em; display: flex; justify-content: space-between; }
.product-card, .record { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 0 rgba(0,0,0,.02); }
.product-card { cursor: pointer; transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease; }
.product-card:hover, .product-card:focus { border-color: var(--pink); outline: none; box-shadow: 0 6px 18px rgba(20, 18, 16, .08); transform: translateY(-1px); }
.product-card h3, .record h3, .hero-card h2 { margin: 8px 0; font-size: 18px; line-height: 1.15; }
.product-card p, .record p, .hero-card p { color: #343034; line-height: 1.35; }
.card-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.card-id { font-weight: 850; font-size: 12px; color: var(--muted); }
.status { display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 800; background: #f5f3f0; }
.status-ready, .status-building, .status-validation { color: var(--pink-dark); background: #fff0f7; border-color: #ffd0e5; }
.status-blocked { color: var(--red); background: #fff1ef; border-color: #ffd0ca; }
.status-done { color: var(--green); background: #edfdf5; border-color: #c9f2df; }
.next-action { margin: 12px 0; display: inline-flex; background: var(--pink); color: #fff; border-radius: 8px; padding: 9px 11px; font-weight: 850; }
.mini-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 12px 0 0; }
.mini-grid div { border-top: 1px solid var(--line); padding-top: 8px; }
.mini-grid dt { color: var(--muted); font-size: 11px; text-transform: uppercase; font-weight: 800; }
.mini-grid dd { margin: 2px 0 0; font-weight: 800; }
details { border-top: 1px solid var(--line); margin-top: 12px; padding-top: 10px; }
summary { cursor: pointer; font-weight: 800; color: var(--muted); }
.empty { color: var(--muted); font-style: italic; }
.history-list { max-width: 900px; }
.hidden-by-filter { display: none !important; }
.drawer-backdrop { position: fixed; inset: 0; background: rgba(22, 20, 18, .18); z-index: 8; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(560px, 100vw); background: var(--paper); border-left: 1px solid var(--line); z-index: 9; transform: translateX(100%); transition: transform .2s ease; display: flex; flex-direction: column; box-shadow: -24px 0 60px rgba(30, 26, 22, .18); }
.drawer.is-open { transform: translateX(0); }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px; border-bottom: 1px solid var(--line); }
.drawer-header h2 { margin: 0; font-size: 30px; line-height: 1; }
.icon-button { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 8px; background: #fff; cursor: pointer; font-size: 24px; line-height: 1; }
.drawer-body { overflow: auto; padding: 20px 22px 28px; }
.drawer-section { border-top: 1px solid var(--line); padding-top: 16px; margin-top: 16px; }
.drawer-section h3 { font-size: 13px; text-transform: uppercase; color: var(--muted); letter-spacing: .06em; margin-bottom: 10px; }
.drawer-lede { font-size: 18px; line-height: 1.35; color: var(--ink); }
.action-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.command { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: #faf7f2; margin-bottom: 8px; }
.command code { white-space: pre-wrap; word-break: break-word; color: #2d252a; }
.copy-command { justify-self: start; border: 1px solid var(--ink); border-radius: 7px; background: var(--ink); color: #fff; padding: 7px 10px; cursor: pointer; font-weight: 800; }
.issue-list { display: grid; gap: 8px; }
.issue { border: 1px solid #ffd0ca; background: #fff1ef; color: var(--red); border-radius: 8px; padding: 9px 10px; font-weight: 700; }
.issue.ok { border-color: #c9f2df; background: #edfdf5; color: var(--green); }
.detail-list { display: grid; gap: 8px; margin: 0; }
.detail-list div { display: grid; grid-template-columns: 130px 1fr; gap: 12px; border-top: 1px solid var(--line); padding-top: 8px; }
.detail-list dt { color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
.detail-list dd { margin: 0; font-weight: 700; }
@media (max-width: 900px) {
  .shell { padding: 14px; }
  .topbar, .source-banner, .toolbar { flex-direction: column; align-items: stretch; }
  .summary-strip, .priority-panel, .roadmap { grid-template-columns: 1fr; }
  .metric { border-right: 0; border-bottom: 1px solid var(--line); }
  .metric:last-child { border-bottom: 0; }
  .board { grid-template-columns: 1fr; overflow-x: visible; }
  h1 { font-size: 36px; }
  .drawer { width: 100vw; }
  .detail-list div { grid-template-columns: 1fr; gap: 2px; }
}
`;
}

function boardJs() {
  return `
const cockpit = window.__CHOPDOT_COCKPIT__ || { cards: [], decisions: [], decisionContracts: [] };
const cardById = new Map((cockpit.cards || []).map((card) => [card.id, card]));
const contractById = new Map((cockpit.decisionContracts || []).map((contract) => [contract.id, contract]));
const tabs = document.querySelectorAll('[data-view]');
const views = {
  roadmap: document.getElementById('roadmap-view'),
  kanban: document.getElementById('kanban-view'),
  decisions: document.getElementById('decisions-view'),
  history: document.getElementById('history-view')
};
tabs.forEach((tab) => tab.addEventListener('click', () => {
  const view = tab.dataset.view;
  tabs.forEach((button) => button.setAttribute('aria-pressed', String(button === tab)));
  Object.entries(views).forEach(([name, element]) => {
    if (element) element.hidden = name !== view;
  });
}));
const search = document.getElementById('search');
const scope = document.getElementById('scope-filter');
const status = document.getElementById('status-filter');
function applyFilters() {
  const q = (search.value || '').toLowerCase();
  const s = scope.value;
  const st = status.value;
  document.querySelectorAll('.product-card').forEach((card) => {
    const matchesSearch = !q || (card.dataset.search || '').includes(q);
    const matchesScope = !s || card.dataset.scope === s;
    const matchesStatus = !st || card.dataset.status === st;
    card.classList.toggle('hidden-by-filter', !(matchesSearch && matchesScope && matchesStatus));
  });
}
[search, scope, status].forEach((control) => control && control.addEventListener('input', applyFilters));
document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
  await navigator.clipboard.writeText(button.dataset.copy);
  button.textContent = 'Copied';
  setTimeout(() => { button.textContent = 'Copy refresh'; }, 1200);
}));
const drawer = document.getElementById('card-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerTitle = document.getElementById('drawer-title');
const drawerBody = document.getElementById('drawer-body');
function openDrawer(cardId) {
  const card = cardById.get(cardId);
  if (!card || !drawer || !drawerBody || !drawerTitle) return;
  drawerTitle.textContent = card.title;
  drawerBody.innerHTML = renderDrawerBody(card);
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  if (drawerBackdrop) drawerBackdrop.hidden = false;
  drawer.querySelectorAll('[data-copy-command]').forEach((button) => {
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(button.dataset.copyCommand || '');
      const before = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = before; }, 1200);
    });
  });
}
function closeDrawer() {
  if (!drawer) return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  if (drawerBackdrop) drawerBackdrop.hidden = true;
}
document.querySelectorAll('[data-card-id]').forEach((card) => {
  card.addEventListener('click', (event) => {
    if (event.target.closest('details')) return;
    openDrawer(card.dataset.cardId);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDrawer(card.dataset.cardId);
    }
  });
});
document.querySelectorAll('[data-close-drawer]').forEach((button) => button.addEventListener('click', closeDrawer));
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDrawer();
});
function renderDrawerBody(card) {
  const contract = contractById.get(card.decision_contract);
  const issues = card.issues && card.issues.length
    ? card.issues.map((issue) => '<div class="issue">' + escapeHtml(issue.message) + '</div>').join('')
    : '<div class="issue ok">No blocking cockpit issues for this card.</div>';
  return [
    '<p class="drawer-lede">' + escapeHtml(card.user_story) + '</p>',
    '<div class="next-action">' + escapeHtml(card.one_next_action) + '</div>',
    '<section class="drawer-section"><h3>Product gate</h3>' +
      '<dl class="detail-list">' +
      detail('Friction', card.friction_score + '/3') +
      detail('Trust', card.trust_score + '/3') +
      detail('Clarity', card.clarity_score + '/3') +
      detail('Language', card.language_score + '/1') +
      detail('Total', card.total_score + '/10') +
      '</dl></section>',
    '<section class="drawer-section"><h3>Decision</h3>' +
      '<dl class="detail-list">' +
      detail('Contract', card.decision_contract + (contract ? ' - ' + contract.title : '')) +
      detail('Why', card.why) +
      detail('Falsifier', card.challenge) +
      detail('Acceptance', card.acceptance) +
      '</dl></section>',
    '<section class="drawer-section"><h3>Work links</h3>' +
      '<dl class="detail-list">' +
      detail('Status', card.status) +
      detail('Scope', card.scope) +
      detail('Module', card.module) +
      detail('Blocker', card.blocker || 'none') +
      detail('Screens', (card.screens || []).join(', ') || 'none') +
      detail('Tests', (card.tests || []).join(', ') || 'none') +
      detail('Proof', (card.evidence || []).join(', ') || 'none') +
      '</dl></section>',
    '<section class="drawer-section"><h3>Current app mapping</h3>' +
      renderAppScreens(card) +
      '</section>',
    '<section class="drawer-section"><h3>Guardrails</h3><div class="issue-list">' + issues + '</div></section>',
    '<section class="drawer-section"><h3>Copy actions</h3>' +
      command('Start', card.commands.start) +
      command('Finish with proof', card.commands.finish) +
      command('Checkpoint', card.commands.checkpoint) +
      command('Query', card.commands.query) +
      '</section>'
  ].join('');
}
function detail(label, value) {
  return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value || '') + '</dd></div>';
}
function command(label, value) {
  return '<div class="command"><strong>' + escapeHtml(label) + '</strong><code>' + escapeHtml(value) + '</code><button class="copy-command" type="button" data-copy-command="' + escapeAttribute(value) + '">Copy command</button></div>';
}
function renderAppScreens(card) {
  if (!card.appScreens || card.appScreens.length === 0) {
    return '<div class="issue">No current screen file is mapped to this card yet.</div>';
  }
  return '<dl class="detail-list">' + card.appScreens.map((screen) =>
    detail(screen.component, screen.file + (screen.screenTypes && screen.screenTypes.length ? ' · ' + screen.screenTypes.join(', ') : ''))
  ).join('') + '</dl>';
}
function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttribute(value) {
  return escapeHtml(value).replace(new RegExp(String.fromCharCode(96), 'g'), '&#96;');
}
`;
}

function readOptions(args) {
  const options = {};
  for (const arg of args) {
    if (!arg.startsWith('--')) {
      continue;
    }
    const [rawKey, ...rest] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = rest.join('=').trim();
    if (options[key]) {
      options[key] = `${options[key]},${value}`;
    } else {
      options[key] = value || 'yes';
    }
  }
  return options;
}

function required(options, key) {
  if (!options[key]) {
    throw new Error(`--${key}=... is required`);
  }
  return options[key];
}

function ensureDirs() {
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(historyDir, { recursive: true });
}

function readFile(path) {
  return readFileSync(path, 'utf8');
}

function listFiles(root, predicate = () => true) {
  if (!existsSync(root)) {
    return [];
  }
  const results = [];
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = resolve(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...listFiles(absolutePath, predicate));
    } else if (entry.isFile() && predicate(absolutePath)) {
      results.push(absolutePath);
    }
  }
  return results.sort();
}

function writeFile(relativePath, contents) {
  const absolutePath = resolve(repoRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function writeFileSyncSafe(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function groupCards(cards) {
  const byStatus = new Map();
  for (const status of statuses) {
    byStatus.set(status, []);
  }
  for (const card of [...cards].sort(compareCards)) {
    byStatus.get(card.status)?.push(card);
  }
  return { byStatus };
}

function compareCards(a, b) {
  return priorityRank(b.priority) - priorityRank(a.priority)
    || b.total_score - a.total_score
    || a.id.localeCompare(b.id);
}

function priorityRank(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] ?? 0;
}

function nextBestCard(cards) {
  return cards
    .filter((card) => ['ready', 'building', 'validation'].includes(card.status))
    .sort(compareCards)[0] ?? null;
}

function countByStatus(cards, status) {
  return cards.filter((card) => card.status === status).length;
}

function buildStats(model, validation) {
  return {
    cards: model.cards.length,
    readyOrActive: model.cards.filter((card) => gatedStatuses.has(card.status)).length,
    blocked: model.cards.filter((card) => card.status === 'blocked').length,
    errors: validation.summary.errors,
    warnings: validation.summary.warnings
  };
}

function metric(label, value) {
  return `<dl class="metric"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></dl>`;
}

function readinessLabel(card) {
  if (card.status === 'blocked') return 'blocked';
  if (card.status === 'done') return 'accepted';
  if (['validation', 'measuring'].includes(card.status)) return 'needs review';
  if (card.total_score >= 8 && card.evidence_quality !== 'none') return 'ready';
  return 'needs work';
}

function readinessReason(card) {
  if (card.status === 'blocked') return card.blocker;
  if (card.total_score < 8) return `Product gate is ${card.total_score}/10.`;
  if (card.evidence_quality === 'none') return 'Evidence is missing.';
  return card.next_action;
}

function hasScreenshotEvidence(card) {
  return card.evidence.some((item) => /screenshot|\.png|\.jpg|\.jpeg|visual/i.test(item));
}

function addIssue(issues, severity, area, code, subject, message) {
  issues.push({ severity, area, code, subject, message });
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value === undefined || value === null || value === '' || value === '[]') {
    return [];
  }
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function quote(value) {
  return JSON.stringify(String(value));
}

function pipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchBlob(card) {
  return escapeAttribute([
    card.id,
    card.title,
    card.status,
    card.scope,
    card.module,
    card.journey,
    card.user_story,
    card.one_next_action,
    card.next_action,
    card.decision_contract
  ].join(' ').toLowerCase());
}

function generatedHeader(title) {
  return [
    `# ${title}`,
    '',
    '<!-- Generated by scripts/chopdot-product-cockpit.mjs. Edit product/cards.md and source docs instead. -->',
    ''
  ];
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function relative(path) {
  return path.replace(`${repoRoot}/`, '');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich'
  }).format(new Date(value));
}

function printSummary(model, validation) {
  console.log('ChopDot product cockpit');
  console.log(`cards: ${model.cards.length}`);
  console.log(`decisions: ${model.decisions.length}`);
  console.log(`decision contracts: ${model.decisionContracts.length}`);
  console.log(`history events: ${model.history.length}`);
  console.log(`errors: ${validation.summary.errors}`);
  console.log(`warnings: ${validation.summary.warnings}`);
  console.log('board: product/board.html');
  console.log('resume: product/generated/product-resume.md');
  if (validation.issues.length) {
    for (const issue of validation.issues.slice(0, 12)) {
      console.log(`${issue.severity.toUpperCase()} ${issue.area}/${issue.code} ${issue.subject}: ${issue.message}`);
    }
  }
}
