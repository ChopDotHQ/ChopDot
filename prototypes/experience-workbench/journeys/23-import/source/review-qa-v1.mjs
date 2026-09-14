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
  'import-confirmation','importing','taking-longer','leave-during-commit','offline-possible-commit','import-succeeded',
  'failure-before-write','rollback-confirmed','unknown-partial-outcome','reconciling','reconciled-existing',
  'reconciled-safe-retry','reconciliation-unavailable','cancelled-before-confirmation',
];
const boundaries = ['group-home-boundary','portability-boundary','recovery-boundary'];
const boundaryMarkers = {
  'group-home-boundary':'owner-j08',
  'portability-boundary':'owner-j24',
  'recovery-boundary':'owner-j28',
};
const rendered = [...states, ...boundaries];
const progressStates = new Set(['inspecting','importing','taking-longer','reconciling']);
const uncertainWriteStates = new Set(['importing','taking-longer','leave-during-commit','offline-possible-commit','unknown-partial-outcome','reconciling','reconciliation-unavailable']);
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
  'unsupported-record':'J23-S24','ready-to-confirm':'J23-S25','import-confirmation':'J23-S26','importing':'J23-S27',
  'taking-longer':'J23-S28','leave-during-commit':'J23-S29','offline-possible-commit':'J23-S30','import-succeeded':'J23-S31',
  'failure-before-write':'J23-S32','rollback-confirmed':'J23-S33','unknown-partial-outcome':'J23-S34','reconciling':'J23-S35',
  'reconciled-existing':'J23-S36','reconciled-safe-retry':'J23-S37','reconciliation-unavailable':'J23-S38',
  'cancelled-before-confirmation':'J23-S39',
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
  'identity-clean':['People are resolved without guessing','Stable identity evidence','No automatic name-only linking','Nothing is saved yet'],
  'ambiguous-person':['Which Maya is this?','Display name alone is not enough','No link is made until you choose','pending preview'],
  'own-identity-ambiguity':['Is this imported member you?','cannot prove this imported member is your current identity','pending preview','Nothing is linked or written'],
  'currency-conflict':['Currency meaning is unclear','Import cannot continue','No exchange rate','financial truth'],
  'unsupported-record':['unsupported record changes the balance','Dropping it would change','cannot be dropped safely','import is blocked'],
  'ready-to-confirm':['Ready to import','Final review','No product write has happened','Import group'],
  'import-confirmation':['Final write boundary','first product write','one new group','does not merge history','Confirm import'],
  'importing':['Commit may be underway','commit may already be underway','Do not start another import or retry','No second import action'],
  'taking-longer':['Taking longer','This is not a failure','outcome is not known yet','Do not retry or re-import'],
  'leave-during-commit':['Leaving does not cancel','cannot safely promise cancellation','reconcile the prior attempt before any retry'],
  'offline-possible-commit':['Outcome unknown','cannot tell whether Lisbon Weekend was saved','Reconcile what saved before retry','Do not start a second import'],
  'import-succeeded':['imported as a new group','Existing groups were not merged','Payment-looking rows','History only','Open group'],
  'failure-before-write':['before anything was written','Existing ChopDot data is unchanged','retrying the read-only inspection is safe'],
  'rollback-confirmed':['rollback is confirmed complete','same logical import attempt','no duplicate group exists'],
  'unknown-partial-outcome':['do not know whether the import finished','neither success nor failure','Do not retry the import','Check what saved'],
  'reconciling':['prior attempt before any retry','No duplicate write is allowed'],
  'reconciled-existing':['prior import already exists','same logical import attempt','Do not import again','Open group'],
  'reconciled-safe-retry':['No committed import was found','same logical import attempt','Retry same import'],
  'reconciliation-unavailable':['cannot establish what saved safely','Do not retry or create another import','Journey 28'],
  'cancelled-before-confirmation':['Nothing was imported','before the explicit import confirmation','Existing ChopDot data remains unchanged'],
  'group-home-boundary':['Journey 08 boundary','Preview only','Journey 08 owns','does not redesign Group Home'],
  'portability-boundary':['Journey 24 boundary','does not define export formats','does not claim that this prototype can export'],
  'recovery-boundary':['Journey 28 boundary','preserves the import context','does not create a retry'],
};

const partialWarningPhrase = 'Some non-financial source details were omitted.';
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

const checkPartialWarning = async (page, state, label, viewport) => {
  const warning = page.locator(`#${state} [data-test-partial-warning]`);
  const visible = await warning.isVisible();
  const text = visible ? (await warning.textContent() ?? '').replace(/\s+/gu,' ').trim() : '';
  const pass = visible && text.includes(partialWarningPhrase);
  interactions.push({viewport,label,expected:`visible warning containing '${partialWarningPhrase}'`,actual:visible?text:'hidden',pass});
  if (!pass) errors.push(`${viewport}/${label}: partial-read omission warning did not persist visibly`);
  if (visible) await warning.scrollIntoViewIfNeeded();
  const shot = path.join(screenshotRoot, `partial-warning-${state}-${viewport}.png`);
  await page.screenshot({path:shot,fullPage:false});
  screenshots.push({viewport,state:`partial-warning-${state}`,context:'J23-S13 carry-forward',path:path.relative(evidenceRoot,shot)});
};

const clickPartialWarningPath = async (page, viewport) => {
  await page.goto(`${pathToFileURL(candidatePath).href}#partial-readable`, {waitUntil:'load'});
  await page.locator('#partial-readable').locator('a[data-test-primary]').click();
  await checkHash(page,'clean-preview','partial → preview with warning',viewport);
  await checkPartialWarning(page,'clean-preview','partial warning visible in preview',viewport);
  await page.locator('#clean-preview').locator('a[data-test-primary]').click();
  await checkHash(page,'preview-detail','partial preview → detail',viewport);
  await checkPartialWarning(page,'preview-detail','partial warning visible in preview detail',viewport);
  await page.locator('#preview-detail').locator('a[data-test-primary]').click();
  await checkHash(page,'identity-clean','partial detail → identity review',viewport);
  await checkPartialWarning(page,'identity-clean','partial warning survives identity review',viewport);
  await page.locator('#identity-clean').locator('a[data-test-primary]').click();
  await checkHash(page,'ready-to-confirm','partial identity review → final review',viewport);
  await checkPartialWarning(page,'ready-to-confirm','partial warning visible in final review',viewport);
  await page.locator('#ready-to-confirm').locator('a[data-test-primary]').click();
  await checkHash(page,'import-confirmation','partial final review → explicit confirmation',viewport);
  await checkPartialWarning(page,'import-confirmation','partial warning visible at write confirmation',viewport);
};

const readIdentityTruth = async (page, screen, person) => page.evaluate(({screen,person}) => {
  const root=document.getElementById(screen);
  if (screen === 'identity-clean') {
    const row=[...(root?.querySelectorAll('.row') ?? [])].find(node=>node.querySelector('.row-copy b')?.textContent?.trim()===person);
    return {label:person,evidence:row?.querySelector('.row-copy span')?.textContent?.trim()??'',pill:row?.querySelector('.pill')?.textContent?.trim()??''};
  }
  const rows=[...(root?.querySelectorAll('[data-test-identity-summary] .meta-row') ?? [])];
  const row=rows.find(node=>node.querySelector('span')?.textContent?.trim()===`${person} identity`);
  return {label:row?.querySelector('span')?.textContent?.trim()??'',evidence:row?.querySelector('b')?.textContent?.trim()??'',pill:''};
},{screen,person});

const checkIdentityDecisionPath = async (page, start, selector, person, expectedEvidence, expectedPill, label, viewport) => {
  await page.goto(`${pathToFileURL(candidatePath).href}#${start}`, {waitUntil:'load'});
  await page.locator(`#${start}`).locator(selector).click();
  await checkHash(page,'identity-clean',`${label} → people review`,viewport);
  const rowTruth = await readIdentityTruth(page,'identity-clean',person);
  const rowPass = rowTruth.evidence === expectedEvidence && rowTruth.pill === expectedPill && rowTruth.evidence !== 'Stable identity evidence';
  interactions.push({viewport,label:`${label} decision truth in S20`,expected:{evidence:expectedEvidence,pill:expectedPill},actual:rowTruth,pass:rowPass});
  if (!rowPass) errors.push(`${viewport}/${label}: S20 lost explicit identity decision truth (${JSON.stringify(rowTruth)})`);
  const s20Shot=path.join(screenshotRoot,`identity-${label.replace(/[^a-z0-9]+/giu,'-').toLowerCase()}-s20-${viewport}.png`);
  await page.screenshot({path:s20Shot,fullPage:false});
  screenshots.push({viewport,state:'identity-clean',context:label,path:path.relative(evidenceRoot,s20Shot)});

  await page.locator('#identity-clean').locator('a[data-test-primary]').click();
  await checkHash(page,'ready-to-confirm',`${label} → final review`,viewport);
  const finalTruth = await readIdentityTruth(page,'ready-to-confirm',person);
  const expectedFinal={label:`${person} identity`,evidence:expectedEvidence};
  const finalPass=finalTruth.label === expectedFinal.label && finalTruth.evidence === expectedFinal.evidence;
  interactions.push({viewport,label:`${label} decision truth in S25`,expected:expectedFinal,actual:finalTruth,pass:finalPass});
  if (!finalPass) errors.push(`${viewport}/${label}: S25 lost explicit identity decision truth (${JSON.stringify(finalTruth)})`);
  const s25Shot=path.join(screenshotRoot,`identity-${label.replace(/[^a-z0-9]+/giu,'-').toLowerCase()}-s25-${viewport}.png`);
  await page.screenshot({path:s25Shot,fullPage:false});
  screenshots.push({viewport,state:'ready-to-confirm',context:label,path:path.relative(evidenceRoot,s25Shot)});

  await page.locator('#ready-to-confirm').locator('a[data-test-primary]').click();
  await checkHash(page,'import-confirmation',`${label} → explicit confirmation`,viewport);
  const confirmTruth = await readIdentityTruth(page,'import-confirmation',person);
  const confirmPass=confirmTruth.label === expectedFinal.label && confirmTruth.evidence === expectedFinal.evidence;
  interactions.push({viewport,label:`${label} decision truth in S26`,expected:expectedFinal,actual:confirmTruth,pass:confirmPass});
  if (!confirmPass) errors.push(`${viewport}/${label}: S26 lost explicit identity decision truth (${JSON.stringify(confirmTruth)})`);
  const s26Shot=path.join(screenshotRoot,`identity-${label.replace(/[^a-z0-9]+/giu,'-').toLowerCase()}-s26-${viewport}.png`);
  await page.screenshot({path:s26Shot,fullPage:false});
  screenshots.push({viewport,state:'import-confirmation',context:label,path:path.relative(evidenceRoot,s26Shot)});
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
        const buttonTexts=buttons.map(node=>(node.textContent??'').replace(/\s+/gu,' ').trim());
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
          buttonTargets:buttons.map(node=>({text:(node.textContent??'').replace(/\s+/gu,' ').trim(),height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width})),
          buttonTexts,
          anchors,
          text:screen?.textContent?.replace(/\s+/gu,' ').trim()??'',
          stateCode:screen?.getAttribute('data-state-code'),
          boundary:screen?.getAttribute('data-boundary'),
          secretInputs:[...(screen?.querySelectorAll('input,textarea')??[])].filter(node=>/seed|private\s*key|password|secret|credential/iu.test(`${node.getAttribute('name')??''} ${node.getAttribute('aria-label')??''} ${node.getAttribute('placeholder')??''}`)).length,
          actionableImportGroup:primaryButtons.some(node=>/^\s*import\s+group\s*$/iu.test(node.textContent??'')),
          actionableConfirmImport:primaryButtons.some(node=>/^\s*confirm\s+import\s*$/iu.test(node.textContent??'')),
          retrySameImport:buttons.some(node=>/^\s*retry\s+same\s+import\s*$/iu.test(node.textContent??'')),
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
      if (metrics.actionableImportGroup && state !== 'ready-to-confirm') errors.push(`${viewport.name}/${state}: Import group action is allowed only on J23-S25`);
      if (state === 'ready-to-confirm' && !metrics.actionableImportGroup) errors.push(`${viewport.name}/${state}: J23-S25 must expose the explicit Import group action`);
      if (metrics.actionableConfirmImport && state !== 'import-confirmation') errors.push(`${viewport.name}/${state}: Confirm import action is allowed only on J23-S26`);
      if (state === 'import-confirmation' && !metrics.actionableConfirmImport) errors.push(`${viewport.name}/${state}: J23-S26 must expose the final explicit Confirm import action`);
      if (metrics.retrySameImport && !['rollback-confirmed','reconciled-safe-retry'].includes(state)) errors.push(`${viewport.name}/${state}: Retry same import is allowed only after proven rollback or safe reconciliation`);
      if (uncertainWriteStates.has(state) && metrics.buttonTexts.some(text=>/^(?:import group|confirm import|retry same import)$/iu.test(text))) errors.push(`${viewport.name}/${state}: possible-commit state exposes an unsafe write/retry action`);

      if (states.includes(state) && metrics.stateCode !== expectedStateCodes[state]) errors.push(`${viewport.name}/${state}: expected state code ${expectedStateCodes[state]}, got ${metrics.stateCode}`);
      if (boundaries.includes(state) && metrics.boundary !== boundaryMarkers[state]) errors.push(`${viewport.name}/${state}: expected boundary marker ${boundaryMarkers[state]}, got ${metrics.boundary}`);
      for (const phrase of expectedSemantics[state] ?? []) if (!metrics.text.includes(phrase)) errors.push(`${viewport.name}/${state}: missing semantic phrase '${phrase}'`);

      for (const href of metrics.anchors) {
        const target=href?.slice(1);
        if (target && !rendered.includes(target)) errors.push(`${viewport.name}/${state}: local route ${href} has no registered candidate/boundary target`);
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
    await clickPartialWarningPath(page,viewport.name);
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
    await checkIdentityDecisionPath(page,'ambiguous-person','a[data-test-primary]','Maya','Kept separate by your choice','Separate','ambiguous Maya keep separate',viewport.name);
    await checkIdentityDecisionPath(page,'ambiguous-person','a[data-test-secondary]','Maya','Linked by your confirmation','User confirmed','ambiguous Maya explicit link',viewport.name);
    await checkIdentityDecisionPath(page,'own-identity-ambiguity','a[data-test-primary]','Dev','Kept separate by your choice','Separate','ambiguous self keep separate',viewport.name);
    await checkIdentityDecisionPath(page,'own-identity-ambiguity','a[data-test-secondary]','Dev','Confirmed by you for this import','You confirmed','ambiguous self explicit confirmation',viewport.name);
    await clickPath(page,'currency-conflict','a[data-test-primary]','source-picker','currency conflict → choose another',viewport.name);
    await clickPath(page,'unsupported-record','a[data-test-primary]','source-picker','unsupported financial record → choose another',viewport.name);
    await clickPath(page,'ready-to-confirm','a[data-test-primary]','import-confirmation','ready → explicit confirmation',viewport.name);
    await clickPath(page,'import-confirmation','a[data-test-primary]','importing','confirmation → import commit fixture',viewport.name);
    await clickPath(page,'taking-longer','a.text-link','leave-during-commit','taking longer → leave question',viewport.name);
    await clickPath(page,'leave-during-commit','a[data-test-primary]','taking-longer','leave question → stay',viewport.name);
    await clickPath(page,'leave-during-commit','a.text-link','unknown-partial-outcome','leave question → unresolved outcome',viewport.name);
    await clickPath(page,'offline-possible-commit','a[data-test-primary]','reconciling','offline possible commit → reconcile',viewport.name);
    await clickPath(page,'import-succeeded','a[data-test-primary]','group-home-boundary','success → J08 boundary',viewport.name);
    await clickPath(page,'failure-before-write','a[data-test-primary]','inspecting','pre-write failure → retry inspection',viewport.name);
    await clickPath(page,'rollback-confirmed','a[data-test-primary]','importing','rollback confirmed → retry same attempt',viewport.name);
    await clickPath(page,'unknown-partial-outcome','a[data-test-primary]','reconciling','unknown outcome → reconcile',viewport.name);
    await clickPath(page,'reconciled-existing','a[data-test-primary]','group-home-boundary','reconciled existing → J08 boundary',viewport.name);
    await clickPath(page,'reconciled-safe-retry','a[data-test-primary]','importing','reconciled no commit → retry same attempt',viewport.name);
    await clickPath(page,'reconciliation-unavailable','a[data-test-primary]','recovery-boundary','cannot reconcile → J28 boundary',viewport.name);
    await clickPath(page,'portability-boundary','a[data-test-primary]','unsupported-package','J24 boundary → import result',viewport.name);
    await clickPath(page,'recovery-boundary','a[data-test-primary]','reconciliation-unavailable','J28 boundary → unresolved import',viewport.name);
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
  scope:'Full registered J23 V1 candidate: J23-S01–J23-S39 plus J08/J24/J28 owner-boundary renders. Reviewed S07 caller continuity, S13 omission-warning carry-forward and S21/S22 identity-decision truth are retained; S26–S38 now cover explicit confirmation, commit/result truth, unknown/partial outcomes, reconciliation and safe retry without production writes.',
  review_status: errors.length ? 'FULL_SCOPE_QA_FAILED' : 'FULL_SCOPE_QA_PASSED',
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
  open_registered_scope:[],
  limitations:[
    'Prototype fixture only: no production file picker, parser, provider integration, remote fetch, migration, database write, authenticity verification, export implementation or recovery implementation is exercised.',
    'Commit/result/reconciliation states are deterministic UX fixtures. They prove state semantics and retry gating, not a production transaction, rollback mechanism or idempotency implementation.',
    'The selected demo package proves the S05 → S07 → S08 caller transition; direct state loads remain evidence fixtures rather than product navigation.',
    'The J23-S13 non-financial omission warning carries contextually through S16, S17, S20, S25 and S26; clicked-path screenshots prove the warning remains visible through explicit write confirmation.',
    'Ambiguous Maya and self-identity choices retain exact keep-separate versus user-confirmed truth through S20, S25 and S26; manual choices are never relabeled as deterministic Stable identity evidence.',
    'Possible-commit states expose no second import, confirmation or retry action. Retry same import appears only after proven rollback or reconciliation establishing no committed import.',
    'Payment/settlement-looking fixture records are historical display only; no payment execution, wallet signing, receiving-detail publication, invitation or finality is exercised.',
    'J08, J24 and J28 renders are owner-boundary evidence only and do not redesign those journeys.',
    'Builder mechanical evidence is not independent UX review, GOLDEN-READY, human approval or Golden freeze.',
    'TYPO-01 remains centrally deferred and is not repaired here.'
  ]
};

await writeFile(path.join(evidenceRoot,'QA_SUMMARY.json'),JSON.stringify(summary,null,2));
await writeFile(path.join(evidenceRoot,'LAYOUT_QA.json'),JSON.stringify(layouts,null,2));
await writeFile(path.join(evidenceRoot,'INTERACTION_QA.json'),JSON.stringify(interactions,null,2));
await writeFile(path.join(evidenceRoot,'BROWSER_QA.json'),JSON.stringify({browserErrors,consoleErrors,externalRequests},null,2));
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),`# Journey 23 V1 — full-scope mechanical evidence\n\n- Exact head: \`${head}\`\n- Branch: \`${branch}\`\n- Candidate SHA-256: \`${candidateSha256}\`\n- Registered states rendered: **${states.length}**\n- Boundary renders: **${boundaries.length}**\n- Canonical viewports: **393×852**, **430×890**\n- PNGs: **${screenshots.length}**\n- Clicked checks: **${interactions.filter(x=>x.pass).length}/${interactions.length}**\n- Browser errors: **${browserErrors.length}**\n- Console errors: **${consoleErrors.length}**\n- External runtime requests: **${externalRequests.length}**\n- Deterministic failures: **${errors.length}**\n\n## Scope\n\nThis exact candidate covers the full registered J23 V1 state inventory J23-S01–J23-S39 plus the J08 Group Home, J24 portability and J28 recovery owner boundaries. It retains the reviewed S07 caller-continuity repair, S13 warning carry-forward and S21/S22 identity-decision truth, and adds the bounded S26–S38 write/result/reconciliation cluster.\n\nThe final write path is explicit: S25 review → S26 confirmation → S27 commit fixture. Once a commit may exist, slow/offline/unknown states never label uncertainty as failure and expose no second write or retry. Retry becomes available only after proven rollback (S33) or reconciliation proves no committed import (S37). Reconciliation that finds the prior import opens the established group (S36); unresolved reconciliation hands off to Journey 28 (S38/B03).\n\nThe partially readable fixture keeps its non-financial omission warning visible through S16, S17, S20, S25 and S26. Ambiguous identity choices retain exact user-decision truth through S20, S25 and S26.\n\n## Trust / authority limits\n\nAll commit/result/reconciliation outcomes are deterministic prototype fixtures. This evidence does not prove a production picker, parser, provider integration, migration, source authenticity, database write, rollback implementation, idempotency backend, payment execution, wallet signing, receiving-detail publication, invitation, settlement replay, export implementation, recovery implementation or external finality. Imported payment-looking rows are history only.\n\n## Review status\n\n\`${summary.review_status}\`. This is Builder mechanical evidence only; it does not grant independent visual clearance, REVIEWABLE, GOLDEN-READY, human approval or Golden status.\n`);

if (errors.length) {
  console.error(JSON.stringify(summary,null,2));
  process.exit(1);
}
console.log(JSON.stringify(summary,null,2));