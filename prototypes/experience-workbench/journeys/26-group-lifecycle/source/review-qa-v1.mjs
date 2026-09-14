#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const journeyRoot = path.resolve(here, '..');
const repoRoot = path.resolve(journeyRoot, '../../../..');
const candidatePath = path.join(journeyRoot, 'v1-candidate.html');
const packetPath = path.join(here, 'current-work-packet.md');
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j26-v1-review');
const shotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(shotRoot, { recursive: true });

const html = await readFile(candidatePath, 'utf8');
const packet = await readFile(packetPath, 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');
const candidateSha256 = hash(html);
const packetSha256 = hash(packet);

const viewports = [
  { width: 393, height: 852, name: '393x852' },
  { width: 430, height: 890, name: '430x890' },
];
const errors = [], pageErrors = [], consoleErrors = [], external = [];
const screenshots = [], layouts = [], interactions = [], reachability = [], modelChecks = [];
const check = (label, pass, actual = '') => {
  modelChecks.push({ label, pass, actual });
  if (!pass) errors.push(`${label}${actual ? `: ${actual}` : ''}`);
};

for (const bad of ['<script src=', 'type="password"', 'private key fixture', 'seed phrase fixture']) {
  if (html.includes(bad)) errors.push(`prohibited static marker: ${bad}`);
}
for (const req of ['Journey 26', 'v1.1', 'REN26-A', 'CFG26-A', 'ARC26-A', 'UNA26-A', 'OWN26-A', 'LEV26-A', 'DEL26-A', 'delete-type-confirm', 'window.J26_DEFS', 'Prototype fixture only', 'app-header', 'tabbar', 'add-tab']) {
  if (!html.includes(req)) errors.push(`missing static marker: ${req}`);
}
check('compressed work packet identifies Journey 26', packet.includes('Journey: **26 — Group Lifecycle V1**'));
check('compressed work packet binds activation head', packet.includes('724799a282cd2233b2f5c227f27613354026bcf6'));
check('compressed work packet calls out caller reachability', packet.toLowerCase().includes('caller reachability'));

const browser = await chromium.launch({ headless: true });
const file = pathToFileURL(candidatePath).href;
const stateUrl = (id, role = 'owner', q = {}) => {
  const u = new URL(file);
  u.searchParams.set('role', role);
  for (const [k, v] of Object.entries(q || {})) u.searchParams.set(k, String(v));
  u.hash = id;
  return u.href;
};
const waitRendered = (p, id) => p.waitForFunction(
  target => location.hash === `#${target}` && document.getElementById('content')?.dataset?.testState === target,
  id,
);
const goto = async (p, id, role = 'owner', q = {}) => {
  await p.goto(stateUrl(id, role, q), { waitUntil: 'load' });
  await waitRendered(p, id);
};
const record = (label, expected, actual) => {
  const pass = actual === expected;
  interactions.push({ label, expected, actual, pass });
  if (!pass) errors.push(`${label}: expected ${expected}, got ${actual}`);
};
const visibleContains = async (label, p, needles) => {
  const text = await p.locator('#content').innerText();
  for (const needle of needles) {
    const pass = text.includes(needle);
    interactions.push({ label: `${label}: ${needle}`, expected: true, actual: pass, pass });
    if (!pass) errors.push(`${label}: missing visible fact ${needle}`);
  }
};

const probe = await browser.newPage({ viewport: { width: 393, height: 852 } });
await goto(probe, 'settings-entry-owner');
const defs = await probe.evaluate(() => window.J26_DEFS);
const roots = await probe.evaluate(() => window.J26_ROOTS);
const boundaryIds = await probe.evaluate(() => window.J26_BOUNDARIES);
await probe.close();
const ids = Object.keys(defs);
const boundarySet = new Set(boundaryIds);
const stateIds = ids.filter(id => !boundarySet.has(id));
const guardedDeleteIds = new Set(['delete-type-confirm','delete-mismatch','delete-final-review','deleting','delete-cancelled','delete-failed','delete-unknown','delete-reconciling','delete-no-effect-retry','deleted']);
const directQueryFor = id => guardedDeleteIds.has(id) ? { members: '1', open: '0' } : {};

check('registered material state count', stateIds.length === 78, String(stateIds.length));
check('named boundary count', boundaryIds.length === 5, String(boundaryIds.length));
check('root set exact', JSON.stringify(roots) === JSON.stringify(['settings-entry-owner', 'settings-entry-member']), JSON.stringify(roots));
const codes = ids.map(id => defs[id].code);
check('state and boundary codes unique', new Set(codes).size === codes.length, `${new Set(codes).size}/${codes.length}`);
for (const id of stateIds) check(`${id} has J26 state code`, /^J26-S\d+$/.test(defs[id].code), defs[id].code);
for (const id of boundaryIds) check(`${id} has J26 boundary code`, /^J26-B\d+$/.test(defs[id].code), defs[id].code);
for (const id of ['rename-cancelled', 'config-cancelled', 'archive-cancelled', 'unarchive-cancelled', 'transfer-cancelled', 'leave-cancelled', 'delete-cancelled']) check(`${id} uses neutral cancelled treatment`, defs[id]?.status === 'neutral', defs[id]?.status);
for (const id of ['rename-saving', 'config-saving', 'archiving', 'unarchiving', 'transfer-saving', 'leaving', 'deleting']) check(`${id} uses pending treatment`, defs[id]?.status === 'progress', defs[id]?.status);
for (const id of ['rename-unknown', 'config-unknown', 'archive-unknown', 'unarchive-unknown', 'transfer-unknown', 'leave-unknown', 'delete-unknown']) check(`${id} uses unknown warning treatment`, defs[id]?.status === 'warn', defs[id]?.status);
for (const id of ['rename-success', 'config-success', 'archived', 'active-restored', 'transfer-success', 'left-group', 'deleted']) check(`${id} uses verified-success treatment`, defs[id]?.status === 'success', defs[id]?.status);

const edges = {};
for (const id of ids) {
  edges[id] = [];
  for (const action of defs[id].actions || []) if (action?.to) edges[id].push({ from: id, to: action.to, label: action.label, special: false });
  if (id === 'delete-type-confirm') {
    edges[id].push({ from: id, to: 'delete-final-review', label: 'typed exact group name', special: 'exact' });
    edges[id].push({ from: id, to: 'delete-mismatch', label: 'typed non-matching name', special: 'mismatch' });
  }
}
for (const id of ids) for (const edge of edges[id]) check(`valid transition ${id} -> ${edge.to}`, Boolean(defs[edge.to]), edge.to);
function shortestPath(target) {
  const queue = roots.map(start => ({ id: start, start, steps: [] }));
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    if (current.id === target) return current;
    for (const edge of edges[current.id] || []) queue.push({ id: edge.to, start: current.start, steps: [...current.steps, edge] });
  }
  return null;
}
const E=(from,to,label='',special=false)=>({from,to,label,special});
const safeDeletePrefix=[E('settings-entry-owner','settings-overview-owner'),E('settings-overview-owner','archive-review'),E('archive-review','archive-confirm'),E('archive-confirm','archiving'),E('archiving','archived'),E('archived','delete-review'),E('delete-review','manage-people-boundary'),E('manage-people-boundary','archived'),E('archived','delete-review'),E('delete-review','money-resolution-boundary'),E('money-resolution-boundary','archived'),E('archived','delete-review'),E('delete-review','delete-type-confirm')];
const pFinal=[...safeDeletePrefix,E('delete-type-confirm','delete-final-review','typed exact group name','exact')];
const pDeleting=[...pFinal,E('delete-final-review','deleting')];
const safeDeleteProof={'delete-type-confirm':safeDeletePrefix,'delete-mismatch':[...safeDeletePrefix,E('delete-type-confirm','delete-mismatch','typed non-matching name','mismatch')],'delete-final-review':pFinal,'deleting':pDeleting,'delete-cancelled':[...pFinal,E('delete-final-review','delete-cancelled')],'delete-failed':[...pDeleting,E('deleting','delete-failed')],'delete-unknown':[...pDeleting,E('deleting','delete-unknown')],'delete-reconciling':[...pDeleting,E('deleting','delete-unknown'),E('delete-unknown','delete-reconciling')],'delete-no-effect-retry':[...pDeleting,E('deleting','delete-unknown'),E('delete-unknown','delete-reconciling'),E('delete-reconciling','delete-no-effect-retry')],'deleted':[...pDeleting,E('deleting','deleted')]};
const pathProof = {};
for (const id of ids) {pathProof[id] = safeDeleteProof[id] ? { id, start: 'settings-entry-owner', steps: safeDeleteProof[id] } : shortestPath(id);check(`truthful caller path exists for ${id}`, Boolean(pathProof[id]), 'no path');}

async function clickTransition(p, step) {
  const current = await p.evaluate(() => document.getElementById('content')?.dataset?.testState);
  if (current !== step.from) {
    errors.push(`transition ${step.from}->${step.to}: rendered caller is ${current}`);
    return false;
  }
  if (step.special) {
    const input = p.locator('[data-test-delete-input]');
    await input.fill(step.special === 'exact' ? 'Zurich Weekend' : 'Zurich Weeken');
    await p.locator('#delete-submit').click();
  } else {
    const loc = p.locator(`#content [data-to="${step.to}"]`).first();
    if (await loc.count() !== 1) {
      errors.push(`transition ${step.from}->${step.to}: rendered control missing`);
      return false;
    }
    await loc.click();
  }
  await waitRendered(p, step.to);
  const actual = await p.evaluate(() => document.getElementById('content')?.dataset?.testState);
  const pass = actual === step.to;
  interactions.push({ label: `caller ${step.from} -> ${step.to}`, expected: step.to, actual, pass });
  if (!pass) errors.push(`transition ${step.from}->${step.to}: ended ${actual}`);
  return pass;
}

for (const vp of viewports) {
  const p = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', e => pageErrors.push({ viewport: vp.name, error: String(e) }));
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push({ viewport: vp.name, text: m.text() }); });
  p.on('request', r => {
    const u = r.url();
    if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('about:')) external.push({ viewport: vp.name, url: u });
  });

  for (const id of ids) {
    await goto(p, id, defs[id].role || 'owner', directQueryFor(id));
    const actualCode = await p.locator('#content').getAttribute('data-state-code');
    if (actualCode !== defs[id].code) errors.push(`${vp.name}/${id}: state code ${actualCode} expected ${defs[id].code}`);
    const metrics = await p.evaluate(() => {
      const c = document.getElementById('content');
      return {
        doc: document.documentElement.scrollWidth,
        iw: innerWidth,
        cw: c.clientWidth,
        sw: c.scrollWidth,
        ch: c.clientHeight,
        sh: c.scrollHeight,
        actions: [...c.querySelectorAll('.btn')].map(el => {
          const r = el.getBoundingClientRect();
          return { t: el.textContent.trim(), h: r.height, w: r.width };
        }),
      };
    });
    if (metrics.doc > metrics.iw + 1 || metrics.sw > metrics.cw + 1) errors.push(`${vp.name}/${id}: horizontal overflow`);
    for (const action of metrics.actions) if (action.h < 43) errors.push(`${vp.name}/${id}: action too short ${action.t}:${action.h}`);
    layouts.push({ viewport: vp.name, state: id, ...metrics });
    let shot = path.join(shotRoot, `${id}-${vp.name}.png`);
    await p.screenshot({ path: shot, fullPage: false });
    screenshots.push({ viewport: vp.name, state: id, position: 'top', path: path.relative(evidenceRoot, shot) });
    if (metrics.sh > metrics.ch + 4) {
      await p.locator('#content').evaluate(el => { el.scrollTop = el.scrollHeight; });
      shot = path.join(shotRoot, `${id}-bottom-${vp.name}.png`);
      await p.screenshot({ path: shot, fullPage: false });
      screenshots.push({ viewport: vp.name, state: id, position: 'bottom', path: path.relative(evidenceRoot, shot) });
    }
  }

  await goto(p, 'rename-success');
  await visibleContains(`${vp.name} rename result`, p, ['Zurich Long Weekend', 'Stable group id', 'Balances / history', 'Unchanged']);
  await goto(p, 'config-success');
  await visibleContains(`${vp.name} config result`, p, ['Future default', 'EUR', 'Old expenses', 'Not converted', 'Balances', 'Not recalculated']);
  await goto(p, 'archived');
  await visibleContains(`${vp.name} archive truth`, p, ['Outstanding positions', 'Still true', 'History', 'Preserved']);
  await goto(p, 'transfer-success', 'member');
  await visibleContains(`${vp.name} transfer truth`, p, ['Jeanine', 'Your role', 'Member', 'Money / history', 'Unchanged']);
  await goto(p, 'left-group', 'member');
  await visibleContains(`${vp.name} leave truth`, p, ['Membership', 'Removed', 'History / ledger', 'Preserved']);
  await goto(p, 'deleted');
  await visibleContains(`${vp.name} deletion scope`, p, ['This working state', 'Group removed', 'Exports / backups', 'Not claimed erased', 'Provider / chain history', 'Not claimed erased']);

  await goto(p, 'delete-type-confirm', 'owner', { members: '1', open: '0' });
  await p.locator('[data-test-delete-input]').fill('wrong');
  await p.locator('#delete-submit').click();
  await waitRendered(p, 'delete-mismatch');
  record(`${vp.name} mismatched typed confirmation blocks delete`, '#delete-mismatch', await p.evaluate(() => location.hash));
  await p.locator('#content [data-to="delete-type-confirm"]').click();
  await waitRendered(p, 'delete-type-confirm');
  await p.locator('[data-test-delete-input]').fill('Zurich Weekend');
  await p.locator('#delete-submit').click();
  await waitRendered(p, 'delete-final-review');
  record(`${vp.name} exact typed confirmation reaches final review`, '#delete-final-review', await p.evaluate(() => location.hash));

  await goto(p, 'rename-saving');
  await p.locator('#back').click();
  await waitRendered(p, 'rename-unknown');
  record(`${vp.name} leaving pending rename preserves unknown truth`, '#rename-unknown', await p.evaluate(() => location.hash));
  await goto(p, 'delete-unknown');
  await p.reload({ waitUntil: 'load' });
  await waitRendered(p, 'delete-unknown');
  record(`${vp.name} unknown delete survives reload`, '#delete-unknown', await p.evaluate(() => location.hash));
  await goto(p, 'transfer-saving');
  await p.locator('#content [data-to="transfer-success"]').click();
  await waitRendered(p, 'transfer-success');
  record(`${vp.name} verified transfer demotes current user`, 'member', await p.locator('#content').getAttribute('data-role'));

  await goto(p, 'rename-saving');await p.locator('#content [data-to="rename-success"]').click();await waitRendered(p, 'rename-success');await p.locator('#content [data-to="settings-overview-owner"]').click();await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} renamed truth survives settings return`, p, ['Name', 'Zurich Long Weekend']);record(`${vp.name} renamed header survives settings return`, true, (await p.locator('.header-title span').innerText()).includes('Zurich Long Weekend'));await p.goBack();await waitRendered(p, 'rename-success');await p.goForward();await waitRendered(p, 'settings-overview-owner');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} renamed truth survives history and reload`, p, ['Zurich Long Weekend']);
  await goto(p, 'config-saving');await p.locator('#content [data-to="config-success"]').click();await waitRendered(p, 'config-success');await p.locator('#content [data-to="settings-overview-owner"]').click();await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} EUR truth survives settings return`, p, ['Future expense default', 'EUR']);await p.goBack();await waitRendered(p, 'config-success');await p.goForward();await waitRendered(p, 'settings-overview-owner');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} EUR truth survives history and reload`, p, ['EUR']);
  await goto(p, 'transfer-saving');await p.locator('#content [data-to="transfer-success"]').click();await waitRendered(p, 'transfer-success');await p.locator('#content [data-to="settings-overview-member"]').click();await waitRendered(p, 'settings-overview-member');await visibleContains(`${vp.name} transferred owner survives settings return`, p, ['Owner', 'Jeanine', 'Your role', 'Member']);await p.goBack();await waitRendered(p, 'transfer-success');await p.goForward();await waitRendered(p, 'settings-overview-member');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-member');await visibleContains(`${vp.name} transferred owner survives history and reload`, p, ['Owner', 'Jeanine']);
  await goto(p, 'archived');await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} open archived group cannot reach delete effect`, 0, await p.locator('#content [data-to="delete-type-confirm"]').count());await p.locator('#content [data-to="manage-people-boundary"]').click();await waitRendered(p, 'manage-people-boundary');await p.locator('#content [data-to="archived"]').click();await waitRendered(p, 'archived');await visibleContains(`${vp.name} roster return establishes owner-only fact`, p, ['Active members', 'Owner only', 'Outstanding positions', 'Still true']);await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} owner-only with open items still blocks delete`, 0, await p.locator('#content [data-to="delete-type-confirm"]').count());await p.locator('#content [data-to="money-resolution-boundary"]').click();await waitRendered(p, 'money-resolution-boundary');await p.locator('#content [data-to="archived"]').click();await waitRendered(p, 'archived');await visibleContains(`${vp.name} money return establishes no-open-item fact`, p, ['Active members', 'Owner only', 'Outstanding positions', 'None']);await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} delete unlocks only after both returned facts`, 1, await p.locator('#content [data-to="delete-type-confirm"]').count());
  await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));await goto(p, 'leaving', 'member');await p.locator('#content [data-to="left-group"]').click();await waitRendered(p, 'left-group');await p.goBack();await waitRendered(p, 'home-boundary');record(`${vp.name} browser Back after leave cannot re-expose group`, '#home-boundary', await p.evaluate(() => location.hash));await p.goForward();await waitRendered(p, 'left-group');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'left-group');record(`${vp.name} terminal leave survives Forward/reload without stale group`, '#left-group', await p.evaluate(() => location.hash));
  await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));await goto(p, 'deleting', 'owner', { members: '1', open: '0' });await p.locator('#content [data-to="deleted"]').click();await waitRendered(p, 'deleted');await p.goBack();await waitRendered(p, 'home-boundary');record(`${vp.name} browser Back after delete cannot re-expose group`, '#home-boundary', await p.evaluate(() => location.hash));await p.goForward();await waitRendered(p, 'deleted');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'deleted');record(`${vp.name} terminal delete survives Forward/reload without stale group`, '#deleted', await p.evaluate(() => location.hash));

  for (const id of ids) {
    const proof = pathProof[id];
    if (!proof) {
      reachability.push({ viewport: vp.name, target: id, pass: false, reason: 'no path' });
      continue;
    }
    await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));
    await goto(p, proof.start, defs[proof.start].role || 'owner');
    let pass = true;
    for (const step of proof.steps) {
      if (!(await clickTransition(p, step))) { pass = false; break; }
    }
    const actual = await p.evaluate(() => document.getElementById('content')?.dataset?.testState);
    if (actual !== id) {
      errors.push(`${vp.name} caller path ${id} ended at ${actual}`);
      pass = false;
    }
    reachability.push({
      viewport: vp.name,
      target: id,
      start: proof.start,
      steps: proof.steps.length,
      boundary: boundarySet.has(id),
      pass,
      path: proof.steps.map(x => ({ from: x.from, to: x.to, label: x.label, special: x.special || false })),
    });
  }
  await p.close();
}

await browser.close();
if (pageErrors.length) errors.push(`${pageErrors.length} page errors`);
if (consoleErrors.length) errors.push(`${consoleErrors.length} console errors`);
if (external.length) errors.push(`${external.length} external requests`);
const reachable = reachability.filter(x => x.pass).length;
const required = ids.length * viewports.length;
const summary = {
  status: errors.length ? 'FAILED' : 'COMPLETE_CANDIDATE_QA_PASSED',
  journey: '26',
  factory_generation: 'v1.1',
  current_work_packet: { path: path.relative(repoRoot, packetPath), sha256: packetSha256 },
  candidate: { branch, head, tree, path: path.relative(repoRoot, candidatePath), sha256: candidateSha256 },
  coverage: {
    registered_states: stateIds.length,
    owner_boundaries: boundaryIds.length,
    caller_reachability_proved: reachable,
    caller_reachability_required: required,
    direct_rendered_states: ids.length,
    viewports: viewports.map(v => `${v.width}x${v.height}`),
    screenshots: screenshots.length,
    layout_records: layouts.length,
    interaction_checks: interactions.length,
    interaction_passed: interactions.filter(x => x.pass).length,
    model_contract_checks: modelChecks.length,
    model_contract_checks_passed: modelChecks.filter(x => x.pass).length,
  },
  errors,
  page_errors: pageErrors,
  console_errors: consoleErrors,
  external_requests: external,
  claim_boundary: [
    'Deterministic standalone prototype only',
    'No production permission persistence',
    'No backend/group database mutation proof',
    'No real settlement/payment/signing/wallet/provider/chain effects',
    'No external/global erasure proof',
    'No production recovery/finality proof',
  ],
  authority: [
    'Owner group-wide lifecycle authority stays distinct from member self-leave',
    'Future-default currency never converts historical money facts',
    'Archive is reversible organization state, not settlement/deletion',
    'Ownership transfer changes role only after verified result',
    'Leave/delete never clear ledger facts',
    'Unknown lifecycle outcomes reconcile before retry',
    'Delete is archived + sole-member + no-open-item gated and typed-confirmed',
    'Adjacent owners are explicit',
    'TYPO-01 deferred',
  ],
};
await writeFile(path.join(evidenceRoot, 'QA_SUMMARY.json'), JSON.stringify(summary, null, 2) + '\n');
await writeFile(path.join(evidenceRoot, 'CALLER_REACHABILITY.json'), JSON.stringify(reachability, null, 2) + '\n');
await writeFile(path.join(evidenceRoot, 'INTERACTIONS.json'), JSON.stringify(interactions, null, 2) + '\n');
await writeFile(path.join(evidenceRoot, 'MODEL_CONTRACT_CHECKS.json'), JSON.stringify(modelChecks, null, 2) + '\n');
await writeFile(path.join(evidenceRoot, 'LAYOUTS.json'), JSON.stringify(layouts, null, 2) + '\n');
await writeFile(path.join(evidenceRoot, 'VISUAL_QA.md'), `# Journey 26 V1 exact-head candidate evidence\n\n- Head: \`${head}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- Current-work packet SHA-256: \`${packetSha256}\`\n- Factory generation: \`v1.1\`\n- Status: **${summary.status}**\n- Registered states: ${stateIds.length}\n- Owner boundaries: ${boundaryIds.length}\n- Caller reachability: ${reachable}/${required} across both canonical viewports\n- Screenshots: ${screenshots.length}\n- Interaction checks: ${summary.coverage.interaction_passed}/${summary.coverage.interaction_checks}\n- Model/contract checks: ${summary.coverage.model_contract_checks_passed}/${summary.coverage.model_contract_checks}\n- Page errors: ${pageErrors.length}\n- Console errors: ${consoleErrors.length}\n- External runtime requests: ${external.length}\n\nDirect reviewer inspection of PNGs is still required before GOLDEN-READY. This bundle does not claim production permission/database writes, settlement/payment/signing effects, global erasure, or recovery finality.\n`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
