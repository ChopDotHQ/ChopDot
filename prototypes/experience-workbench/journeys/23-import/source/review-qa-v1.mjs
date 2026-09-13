#!/usr/bin/env node

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const journeyRoot = path.resolve(here, '..');
const repoRoot = path.resolve(journeyRoot, '../../../..');
const candidatePath = path.join(journeyRoot, 'v1-candidate.html');
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j23-v1-review');
const screenshotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(screenshotRoot, {recursive: true});

const html = await readFile(candidatePath, 'utf8');
const candidateSha256 = createHash('sha256').update(html).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8'}).trim();
const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');

const states = [
  'entry-you','entry-groups','source-picker','source-picker-cancelled','source-selected','source-unavailable',
  'inspecting','valid-package','unsupported-package','malformed','empty-package','oversized','partial-readable',
  'provenance-unknown','offline-inspection','clean-preview','preview-detail','exact-duplicate','similar-group',
  'identity-clean','ambiguous-person','own-identity-ambiguity','currency-conflict','unsupported-record','ready-to-confirm',
  'cancelled-before-confirmation',
];
const boundaries = ['group-home-boundary','review-boundary'];
const boundaryMarkers = {'group-home-boundary':'owner-j08','review-boundary':'builder-scope'};
const rendered = [...states, ...boundaries];
const progressStates = new Set(['inspecting']);
const viewports = [
  {width:393,height:852,name:'393x852'},
  {width:430,height:890,name:'430x890'},
];

const expectedStateCodes = {
  'entry-you':'J23-S01','entry-groups':'J23-S02','source-picker':'J23-S03','source-picker-cancelled':'J23-S04',
  'source-selected':'J23-S05','source-unavailable':'J23-S06','inspecting':'J23-S07','valid-package':'J23-S08',
  'unsupported-package':'J23-S09','malformed':'J23-S10','empty-package':'J23-S11','oversized':'J23-S12',
  'partial-readable':'J23-S13','provenance-unknown':'J23-S14','offline-inspection':'J23-S15','clean-preview':'J23-S16',
  'preview-detail':'J23-S17','exact-duplicate':'J23-S18','similar-group':'J23-S19','identity-clean':'J23-S20',
  'ambiguous-person':'J23-S21','own-identity-ambiguity':'J23-S22','currency-conflict':'J23-S23',
  'unsupported-record':'J23-S24','ready-to-confirm':'J23-S25','cancelled-before-confirmation':'J23-S39',
};

const expectedSemantics = {
  'entry-you':['Review first. Import after.','before anything is saved','does not create a group'],
  'entry-groups':['without touching your current groups','creates a new group','never merges history'],
  'source-picker':['System picker boundary','does not read a local file','No ChopDot product data is written'],
  'source-picker-cancelled':['No package selected','Nothing was inspected or saved','unchanged'],
  'source-selected':['Not inspected yet','content not trusted yet','Product writes','None'],
  'source-unavailable':['no longer available','not inspected','nothing was written'],
  'inspecting':['Read-only check','before any product write','No group has been created'],
  'valid-package':['Ready to preview','Nothing has been imported yet','readable package is not proof'],
  'unsupported-package':['cannot interpret this package','No data was imported','does not claim support'],
  'malformed':['damaged or invalid','Nothing was written','Raw source markup or scripts are not rendered'],
  'empty-package':['nothing to import','No import action is available'],
  'oversized':['too large or complex','Nothing was imported'],
  'partial-readable':['non-financial details','do not change balances, identity, or record meaning','would block'],
  'provenance-unknown':['Readable, not verified','cannot establish who produced it','Parsing success is not authenticity'],
  'offline-inspection':['Inspection was interrupted','has not validated this package','No product write started'],
  'clean-preview':['Nothing saved yet','Lisbon Weekend','one new group','Merge into existing','Never in V1','Product writes','None yet'],
  'preview-detail':['historical records','not commands','History only','not payment authority','Not imported'],
  'exact-duplicate':['exact package was already imported','Lisbon Weekend','not a same-name guess','No new import is created'],
  'similar-group':['similar group already exists','cannot prove they are the same group','Separate new group','Never in V1'],
  'identity-clean':['People are resolved without guessing','Stable identity evidence','No name-only linking','Nothing is saved yet'],
  'ambiguous-person':['Which Maya is this?','Display name alone is not enough','No link is made until you choose','pending preview'],
  'own-identity-ambiguity':['Is this imported member you?','cannot prove this imported member is your current identity','pending preview','Nothing is linked or written'],
  'currency-conflict':['Currency meaning is unclear','Import cannot continue','No exchange rate','financial truth'],
  'unsupported-record':['unsupported record changes the balance','Dropping it would change','cannot be dropped safely','import is blocked'],
  'ready-to-confirm':['Ready to import','Final review','No product write has happened','Import group'],
  'cancelled-before-confirmation':['Nothing was imported','before the explicit import confirmation','Existing ChopDot data remains unchanged'],
  'group-home-boundary':['Journey 08 boundary','Preview only','Journey 08 owns','does not redesign Group Home'],
  'review-boundary':['Commit is not built yet','J23-S26–J23-S38 remain intentionally unimplemented','Nothing was written','review scaffolding'],
};

const errors = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const screenshots = [];
const layouts = [];
const interactions = [];
const browser = await chromium.launch({headless:true});

const checkHash = async (page, expected, label, viewport) => {
  const hash = await page.evaluate(() => location.hash);
  const pass = hash === `#${expected}`;
  interactions.push({viewport,label,expected:`#${expected}`,actual:hash,pass});
  if (!pass) errors.push(`${viewport}/${label}: expected #${expected}, got ${hash}`);
};

const clickPath = async (page, start, selector, expected, label, viewport) => {
  await page.goto(`${pathToFileURL(candidatePath).href}#${start}`, {waitUntil:'load'});
  await page.locator(`#${start}`).locator(selector).click();
  await checkHash(page, expected, label, viewport);
};

const clickInspectionPath = async (page, start, selector, label, viewport) => {
  await page.goto(`${pathToFileURL(candidatePath).href}#${start}`, {waitUntil:'load'});
  await page.locator(`#${start}`).locator(selector).click();
  await checkHash(page, 'inspecting', `${label} → inspecting`, viewport);
  await page.waitForFunction(() => location.hash === '#valid-package');
  await checkHash(page, 'valid-package', `${label} → selected fixture result`, viewport);
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page = await context.newPage();
    page.on('pageerror', error => browserErrors.push({viewport:viewport.name,message:String(error)}));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push({viewport:viewport.name,message:message.text()}); });
    page.on('request', request => { const url=request.url(); if (/^https?:/iu.test(url)) externalRequests.push({viewport:viewport.name,url}); });

    for (const state of rendered) {
      await page.goto(`${pathToFileURL(candidatePath).href}#${state}`, {waitUntil:'load'});
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
      const active = page.locator(`#${state}`);
      if (!(await active.isVisible())) errors.push(`${viewport.name}/${state}: target screen is not visible`);
      const visibleScreens = await page.locator('.screen:visible').count();
      if (visibleScreens !== 1) errors.push(`${viewport.name}/${state}: expected exactly one visible screen, got ${visibleScreens}`);

      const metrics = await page.evaluate(stateId => {
        const screen=document.getElementById(stateId);
        const content=screen?.querySelector('.content');
        const footer=screen?.querySelector('.app-footer');
        const primary=screen?.querySelector('.btn.primary');
        const primaryButtons=[...(screen?.querySelectorAll('.btn.primary') ?? [])];
        const buttons=[...(screen?.querySelectorAll('.btn') ?? [])];
        const anchors=[...(screen?.querySelectorAll('a[href^="#"]') ?? [])].map(node=>node.getAttribute('href'));
        const contentRect=content?.getBoundingClientRect();
        const footerRect=footer?.getBoundingClientRect();
        const primaryRect=primary?.getBoundingClientRect();
        return {
          bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          screenOverflow:screen?screen.scrollWidth-screen.clientWidth:null,
          contentOverflow:content?content.scrollWidth-content.clientWidth:null,
          contentScrollable:content?content.scrollHeight>content.clientHeight:false,
          contentBottom:contentRect?.bottom??null,
          footerTop:footerRect?.top??null,
          primaryBottom:primaryRect?.bottom??null,
          primaryCount:primaryButtons.length,
          primaryHeight:primaryRect?.height??null,
          buttonTargets:buttons.map(node=>({text:(node.textContent??'').trim(),height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width})),
          anchors,
          text:screen?.textContent?.replace(/\s+/gu,' ').trim()??'',
          stateCode:screen?.getAttribute('data-state-code'),
          boundary:screen?.getAttribute('data-boundary'),
          secretInputs:[...(screen?.querySelectorAll('input,textarea')??[])].filter(node=>/seed|private\s*key|password|secret|credential/iu.test(`${node.getAttribute('name')??''} ${node.getAttribute('aria-label')??''} ${node.getAttribute('placeholder')??''}`)).length,
          actionableImportGroup:primaryButtons.some(node=>/^\s*import\s+group\s*$/iu.test(node.textContent??'')),
        };
      }, state);

      layouts.push({viewport:viewport.name,state,...metrics});
      if ((metrics.bodyOverflow??0)>1 || (metrics.screenOverflow??0)>1 || (metrics.contentOverflow??0)>1) errors.push(`${viewport.name}/${state}: horizontal overflow body=${metrics.bodyOverflow}, screen=${metrics.screenOverflow}, content=${metrics.contentOverflow}`);
      if (metrics.footerTop!==null && metrics.contentBottom!==null && metrics.contentBottom>metrics.footerTop+1) errors.push(`${viewport.name}/${state}: content/footer overlap ${metrics.contentBottom} > ${metrics.footerTop}`);
      const expectedPrimary = progressStates.has(state) ? 0 : 1;
      if (metrics.primaryCount !== expectedPrimary) errors.push(`${viewport.name}/${state}: expected ${expectedPrimary} primary action(s), got ${metrics.primaryCount}`);
      if (metrics.primaryHeight !== null && metrics.primaryHeight < 44) errors.push(`${viewport.name}/${state}: primary target ${metrics.primaryHeight}px < 44px`);
      for (const button of metrics.buttonTargets) if (button.height < 44) errors.push(`${viewport.name}/${state}: candidate .btn target '${button.text}' is ${button.height}px < 44px`);
      if (metrics.primaryBottom!==null && metrics.contentBottom!==null && metrics.primaryBottom>metrics.contentBottom+1) errors.push(`${viewport.name}/${state}: primary action extends below content viewport`);
      if (metrics.secretInputs) errors.push(`${viewport.name}/${state}: secret-like input field detected`);
      if (metrics.actionableImportGroup && state !== 'ready-to-confirm') errors.push(`${viewport.name}/${state}: Import group action is allowed only on J23-S25 in this bounded increment`);
      if (state === 'ready-to-confirm' && !metrics.actionableImportGroup) errors.push(`${viewport.name}/${state}: J23-S25 must expose the explicit Import group action`);

      if (states.includes(state) && metrics.stateCode !== expectedStateCodes[state]) errors.push(`${viewport.name}/${state}: expected state code ${expectedStateCodes[state]}, got ${metrics.stateCode}`);
      if (boundaries.includes(state) && metrics.boundary !== boundaryMarkers[state]) errors.push(`${viewport.name}/${state}: expected boundary marker ${boundaryMarkers[state]}, got ${metrics.boundary}`);
      for (const phrase of expectedSemantics[state] ?? []) if (!metrics.text.includes(phrase)) errors.push(`${viewport.name}/${state}: missing semantic phrase '${phrase}'`);

      for (const href of metrics.anchors) {
        const target=href?.slice(1);
        if (target && !rendered.includes(target)) errors.push(`${viewport.name}/${state}: local route ${href} has no bounded candidate target`);
      }

      const shot = path.join(screenshotRoot, `${state}-${viewport.name}.png`);
      await page.screenshot({path:shot,fullPage:false});
      screenshots.push({viewport:viewport.name,state,path:path.relative(evidenceRoot,shot)});
    }

    await clickPath(page,'entry-you','a[data-test-primary]','source-picker','entry You → choose package',viewport.name);
    await clickPath(page,'source-picker','a[data-test-primary]','source-selected','picker → demo package',viewport.name);
    await clickPath(page,'source-picker','a.text-link','source-picker-cancelled','picker → cancel',viewport.name);
    await clickPath(page,'source-picker-cancelled','a[data-test-primary]','source-picker','picker cancelled → choose package',viewport.name);
    await clickInspectionPath(page,'source-selected','a[data-test-primary]','selected → inspect',viewport.name);
    await clickPath(page,'source-unavailable','a[data-test-primary]','source-picker','unavailable → choose another',viewport.name);
    await clickPath(page,'valid-package','a[data-test-primary]','clean-preview','valid → preview',viewport.name);
    await clickPath(page,'unsupported-package','a[data-test-primary]','source-picker','unsupported → choose another',viewport.name);
    await clickPath(page,'malformed','a[data-test-primary]','source-picker','malformed → choose another',viewport.name);
    await clickPath(page,'empty-package','a[data-test-primary]','source-picker','empty → choose another',viewport.name);
    await clickPath(page,'oversized','a[data-test-primary]','source-picker','oversized → choose another',viewport.name);
    await clickPath(page,'partial-readable','a[data-test-primary]','clean-preview','partial → preview with warning',viewport.name);
    await clickPath(page,'provenance-unknown','a[data-test-primary]','clean-preview','unknown provenance → preview',viewport.name);
    await clickPath(page,'offline-inspection','a[data-test-primary]','inspecting','offline inspection → retry',viewport.name);
    await clickPath(page,'clean-preview','a[data-test-primary]','preview-detail','preview → details',viewport.name);
    await clickPath(page,'clean-preview','a.text-link','cancelled-before-confirmation','preview → cancel',viewport.name);
    await clickPath(page,'preview-detail','a[data-test-primary]','identity-clean','details → clean identity review',viewport.name);
    await clickPath(page,'exact-duplicate','a[data-test-primary]','group-home-boundary','exact duplicate → J08 boundary',viewport.name);
    await clickPath(page,'exact-duplicate','a.text-link','source-picker','exact duplicate → choose another',viewport.name);
    await clickPath(page,'group-home-boundary','a[data-test-primary]','exact-duplicate','J08 boundary → duplicate result',viewport.name);
    await clickPath(page,'similar-group','a[data-test-primary]','identity-clean','similar group → separate import review',viewport.name);
    await clickPath(page,'similar-group','a.text-link','cancelled-before-confirmation','similar group → cancel',viewport.name);
    await clickPath(page,'identity-clean','a[data-test-primary]','ready-to-confirm','clean identity → ready',viewport.name);
    await clickPath(page,'ambiguous-person','a[data-test-primary]','identity-clean','ambiguous person → keep separate',viewport.name);
    await clickPath(page,'ambiguous-person','a[data-test-secondary]','identity-clean','ambiguous person → explicit link',viewport.name);
    await clickPath(page,'own-identity-ambiguity','a[data-test-primary]','identity-clean','own identity → keep separate',viewport.name);
    await clickPath(page,'own-identity-ambiguity','a[data-test-secondary]','identity-clean','own identity → explicit self link',viewport.name);
    await clickPath(page,'currency-conflict','a[data-test-primary]','source-picker','currency conflict → choose another',viewport.name);
    await clickPath(page,'unsupported-record','a[data-test-primary]','source-picker','unsupported financial record → choose another',viewport.name);
    await clickPath(page,'ready-to-confirm','a[data-test-primary]','review-boundary','ready → bounded write boundary',viewport.name);
    await clickPath(page,'review-boundary','a[data-test-primary]','ready-to-confirm','write boundary → final review',viewport.name);
    await clickPath(page,'cancelled-before-confirmation','a[data-test-primary]','entry-you','cancelled → import entry',viewport.name);

    await context.close();
  }
} finally {
  await browser.close();
}

if (browserErrors.length) errors.push(`browser errors: ${browserErrors.length}`);
if (consoleErrors.length) errors.push(`console errors: ${consoleErrors.length}`);
if (externalRequests.length) errors.push(`external runtime requests: ${externalRequests.length}`);

const summary = {
  journey:'23',
  version:'v1',
  scope:'Second bounded J23 candidate increment: registered S01–S25 plus pre-confirmation cancellation S39, J08 owner-boundary evidence, and one non-product Builder write boundary. S26–S38 remain open; no product write/commit/result/recovery cluster is implemented yet.',
  review_status: errors.length ? 'BOUNDED_SLICE_QA_FAILED' : 'BOUNDED_SLICE_QA_PASSED',
  branch,head,tree,candidate_path:path.relative(repoRoot,candidatePath),candidate_sha256:candidateSha256,
  registered_states:states.length,
  boundary_renders:boundaries.length,
  rendered_states_and_boundaries:rendered.length,
  viewports,
  screenshots:screenshots.length,
  interaction_paths:interactions.length,
  interaction_passes:interactions.filter(x=>x.pass).length,
  browser_errors:browserErrors,
  console_errors:consoleErrors,
  external_requests:externalRequests,
  failures:errors,
  open_registered_scope:['J23-S26–J23-S38: final confirmation execution, commit progress, result, unknown/partial outcomes, reconciliation and safe retry','J23-B02/J23-B03: J24 portability and J28 shared-recovery owner boundaries'],
  limitations:[
    'Prototype fixture only: no production file picker, parser, provider integration, remote fetch, migration, database write, or authenticity verification is exercised.',
    'The selected demo package now proves the S05 → S07 → S08 caller transition; direct state loads remain evidence fixtures rather than product navigation.',
    'J23-S25 exposes the contract-required Import group action, but this bounded head routes it only to explicit Builder review scaffolding; no product write or confirmation execution occurs.',
    'Payment/settlement-looking fixture records are historical display only; no payment execution, wallet signing, receiving-detail publication, invitation, or finality is exercised.',
    'Builder mechanical evidence is not independent UX review, GOLDEN-READY, human approval, or Golden freeze.',
    'TYPO-01 remains centrally deferred and is not repaired here.'
  ]
};

await writeFile(path.join(evidenceRoot,'QA_SUMMARY.json'),JSON.stringify(summary,null,2));
await writeFile(path.join(evidenceRoot,'LAYOUT_QA.json'),JSON.stringify(layouts,null,2));
await writeFile(path.join(evidenceRoot,'INTERACTION_QA.json'),JSON.stringify(interactions,null,2));
await writeFile(path.join(evidenceRoot,'BROWSER_QA.json'),JSON.stringify({browserErrors,consoleErrors,externalRequests},null,2));
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),`# Journey 23 V1 — bounded intake / inspection / conflict-review mechanical evidence\n\n- Exact head: \`${head}\`\n- Branch: \`${branch}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- Registered states rendered: **${states.length}**\n- Boundary renders: **${boundaries.length}**\n- Canonical viewports: **393×852**, **430×890**\n- PNGs: **${screenshots.length}**\n- Clicked paths: **${interactions.filter(x=>x.pass).length}/${interactions.length}**\n- Browser errors: **${browserErrors.length}**\n- Console errors: **${consoleErrors.length}**\n- External runtime requests: **${externalRequests.length}**\n- Deterministic failures: **${errors.length}**\n\n## Scope\n\nThis is the second bounded J23 candidate increment with the reviewed S07 caller-continuity repair. It covers J23-S01–S25 plus J23-S39, one J08 owner-boundary render, and a clearly labelled non-product Builder write boundary. J23-S26–S38 and B02/B03 remain open by design on this head. The S25 \`Import group\` action routes only to that Builder boundary; no product write or confirmation execution occurs.\n\nThe selected demo fixture now exercises the real candidate caller path from S05 through S07 into S08; direct state loads remain evidence fixtures rather than a substitute for that caller transition.\n\n## Trust / authority limits\n\nThe demo package is a fixture. This evidence does not prove a production picker, parser, provider integration, migration, source authenticity, database write, payment execution, wallet signing, receiving-detail publication, invitation, settlement replay, or finality. Imported payment-looking rows are previewed as history only.\n\n## Review status\n\n\`${summary.review_status}\`. This is Builder mechanical evidence only; it does not grant independent visual clearance, REVIEWABLE, GOLDEN-READY, human approval, or Golden status.\n`);

if (errors.length) {
  console.error(JSON.stringify(summary,null,2));
  process.exit(1);
}
console.log(JSON.stringify(summary,null,2));
