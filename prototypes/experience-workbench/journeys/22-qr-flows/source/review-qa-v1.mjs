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
const inventoryPath = path.join(journeyRoot, 'STATE_INVENTORY.md');
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j22-v1-review');
const screenshotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(screenshotRoot, {recursive: true});

const html = await readFile(candidatePath, 'utf8');
const inventory = await readFile(inventoryPath, 'utf8');
const candidateSha256 = createHash('sha256').update(html).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd:repoRoot,encoding:'utf8'}).trim();
const head = git('rev-parse','HEAD');
const tree = git('rev-parse','HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse','--abbrev-ref','HEAD');

const states = [
  'entry','permission','permission-denied','camera-unavailable','scanner-ready','reading','resolving','resolution-error','offline','duplicate',
  'person','own-person','person-unavailable',
  'invite','invite-already-joined','invite-expired',
  'receive-share','receive-expired','receive-wrong-audience','settlement-match','settlement-mismatch',
  'malformed','unsupported-type','unsupported-version','external-payload','sensitive-payload',
  'my-qr','invite-qr','receive-qr','display-expired','display-loading','display-error',
  'cancelled-before','cancelled-after','session-changed','return-from-person','rescan','loading','load-error',
  'person-handoff','you-handoff','invite-handoff','receive-handoff','settlement-receive-handoff','settlement-return',
];
const progressStates = new Set(['reading','resolving','loading','display-loading']);
const viewports = [
  {width:393,height:852,name:'393x852'},
  {width:430,height:890,name:'430x890'},
];

const expectedStateCodes = {
  entry:'J22-S01',permission:'J22-S02','permission-denied':'J22-S03','camera-unavailable':'J22-S04','scanner-ready':'J22-S05',
  reading:'J22-S06',resolving:'J22-S07','resolution-error':'J22-S08',offline:'J22-S09',duplicate:'J22-S10',
  person:'J22-S11','own-person':'J22-S12','person-unavailable':'J22-S13',invite:'J22-S14','invite-already-joined':'J22-S15','invite-expired':'J22-S16',
  'receive-share':'J22-S17','receive-expired':'J22-S18','receive-wrong-audience':'J22-S19','settlement-match':'J22-S20','settlement-mismatch':'J22-S21',
  malformed:'J22-S22','unsupported-type':'J22-S23','unsupported-version':'J22-S24','external-payload':'J22-S25','sensitive-payload':'J22-S26',
  'my-qr':'J22-S27','invite-qr':'J22-S28','receive-qr':'J22-S29','display-expired':'J22-S30','display-loading':'J22-S31','display-error':'J22-S32',
  'cancelled-before':'J22-S33','cancelled-after':'J22-S34','session-changed':'J22-S35','return-from-person':'J22-S36',rescan:'J22-S37',loading:'J22-S38','load-error':'J22-S39',
};

const expectedSemantics = {
  entry:['Scan first. Decide after.','Scanning a code never acts by itself'],
  permission:['Use your camera to scan.','does not access a real camera'],
  'permission-denied':['Camera access is off.','No code was scanned'],
  'camera-unavailable':['camera is not available','Nothing was read or handed off'],
  'scanner-ready':['Hold a ChopDot code inside the frame','no live camera is accessed'],
  reading:['Code detected','No person, invite, receiving share, or action has been trusted yet'],
  resolving:['Checking what this code represents','Nothing is joined, shared, paid, saved, or connected'],
  'resolution-error':['could not check this code','No handoff was started'],
  offline:['You are offline','No stale result is being shown as current'],
  duplicate:['same QR again','No duplicate join, share, request, or payment action'],
  person:['code belongs to Maya','identity only','Manage People'],
  'own-person':['your own ChopDot code','not a receiving destination'],
  'person-unavailable':['person cannot be opened now','will not reuse an older identity preview'],
  invite:['Lisbon Weekend invite','does not join the group','Invite / Join'],
  'invite-already-joined':['already in Lisbon Weekend','no second join action'],
  'invite-expired':['invite is no longer usable','No Join action is available'],
  'receive-share':['Maya shared receiving details','Possessing this QR is not access','Receive / Share'],
  'receive-expired':['receiving share cannot be used','will not revive or redirect it'],
  'receive-wrong-audience':['not available to this account','Possession of the image does not grant access'],
  'settlement-match':['matches this payment context','CHF 24.00','cannot pay or authorize anything'],
  'settlement-mismatch':['does not match the payment you reviewed','will not substitute it','Maya · CHF 24.00'],
  malformed:['could not read this as a supported QR','will not guess a target'],
  'unsupported-type':['code type is not supported yet','does not guess another owner'],
  'unsupported-version':['version cannot be opened safely','will not downgrade'],
  'external-payload':['not a supported ChopDot QR','keeps it inert','No external page or application was opened'],
  'sensitive-payload':['will not import this QR data','not echoed','opaque references'],
  'my-qr':['Your ChopDot identity','not a receiving destination','public-profile permission'],
  'invite-qr':['Existing invite reference','did not create or extend it','explicit Join / Not now'],
  'receive-qr':['Existing private share','opaque reference','does not contain raw receiving fields'],
  'display-expired':['Code stopped or expired','Back navigation cannot revive it'],
  'display-loading':['Preparing the code','No placeholder value is shown as a usable QR'],
  'display-error':['No usable code was created','does not create a new invite, share, payment, method, or wallet action'],
  'cancelled-before':['Nothing changed','No target was opened'],
  'cancelled-after':['handoff was cancelled','transport attempt'],
  'session-changed':['signed-in context changed','old preview cannot be used as current authority'],
  'return-from-person':['back in the same QR context','Original caller'],
  rescan:['Ready for a different code','does not repeat a join, share, payment, or wallet command'],
  loading:['Preparing QR tools','No scanner, code target, person, invite, receiving share, or action is assumed yet'],
  'load-error':['could not be prepared','No scanner success or code result is being assumed'],
  'person-handoff':['Preview only','Journey 09 owns person detail','does not claim a balance'],
  'you-handoff':['Safe return','exact caller','Nothing outside the scanner was changed'],
  'invite-handoff':['Preview only','Journey 04 owns current invite status','does not claim that you joined'],
  'receive-handoff':['Preview only','Journey 14 owns audience authentication','Raw destination','Still hidden'],
  'settlement-receive-handoff':['Same scoped payment preserved','Maya / CHF 24.00 / Zurich Weekend','No payment was authorized, submitted, finalized'],
  'settlement-return':['Payment context unchanged','Maya / CHF 24.00 / Zurich Weekend','same payment review'],
};

const expectedBoundaries = {
  'person-handoff':'J09',
  'you-handoff':'You',
  'invite-handoff':'J04',
  'receive-handoff':'J14',
  'settlement-receive-handoff':'J14/J11',
  'settlement-return':'J11',
};

const errors = [];
const screenshotRecords = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const interactionResults = [];

const requiredInventoryCodes = [...new Set(inventory.match(/J22-S\d{2}/gu) ?? [])].sort();
const mappedCodes = Object.values(expectedStateCodes).sort();
if (requiredInventoryCodes.length !== 39) errors.push(`inventory expected 39 unique J22 states, found ${requiredInventoryCodes.length}`);
for (const code of requiredInventoryCodes) if (!mappedCodes.includes(code)) errors.push(`QA state mapping is missing ${code}`);
for (const code of mappedCodes) if (!requiredInventoryCodes.includes(code)) errors.push(`QA maps ${code} but it is not registered in STATE_INVENTORY.md`);
if (new Set(states).size !== states.length) errors.push('QA states list contains duplicate ids');

const browser = await chromium.launch({headless:true});
const checkHash = async (page,expected,label) => {
  const hash = await page.evaluate(() => location.hash);
  const pass = hash === `#${expected}`;
  interactionResults.push({label,expected:`#${expected}`,actual:hash,pass});
  if (!pass) errors.push(`${label}: expected #${expected}, got ${hash}`);
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page = await context.newPage();
    page.on('pageerror', error => browserErrors.push({viewport:viewport.name,message:String(error)}));
    page.on('console', message => { if (message.type()==='error') consoleErrors.push({viewport:viewport.name,message:message.text()}); });
    page.on('request', request => { const url=request.url(); if (/^https?:/iu.test(url)) externalRequests.push({viewport:viewport.name,url}); });

    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#entry`,{waitUntil:'load'});
    const candidateStateCodes = await page.locator('[data-state-code]').evaluateAll(nodes => nodes.map(node=>node.getAttribute('data-state-code')).sort());
    if (candidateStateCodes.length !== 39) errors.push(`${viewport.name}: candidate expected 39 state-coded screens, found ${candidateStateCodes.length}`);
    for (const code of requiredInventoryCodes) if (!candidateStateCodes.includes(code)) errors.push(`${viewport.name}: candidate is missing registered state ${code}`);

    for (const state of states) {
      const url = `${pathToFileURL(candidatePath).href}?freeze=1#${state}`;
      await page.goto(url,{waitUntil:'load'});
      const active = page.locator(`#${state}`);
      if (!(await active.isVisible())) errors.push(`${viewport.name}/${state}: target screen is not visible`);
      const visibleScreens = await page.locator('.screen:visible').count();
      if (visibleScreens!==1) errors.push(`${viewport.name}/${state}: expected exactly one visible screen, got ${visibleScreens}`);

      const metrics = await page.evaluate(stateId => {
        const screen=document.getElementById(stateId);
        const content=screen?.querySelector('.content');
        const footer=screen?.querySelector('.app-footer');
        const primary=screen?.querySelector('.btn.primary');
        const actions=[...(screen?.querySelectorAll('a[href],button') ?? [])];
        const anchors=[...(screen?.querySelectorAll('a[href^="#"]') ?? [])].map(node=>node.getAttribute('href'));
        const contentRect=content?.getBoundingClientRect();
        const footerRect=footer?.getBoundingClientRect();
        const primaryRect=primary?.getBoundingClientRect();
        const clickableRects=actions.map(node=>({
          classes:[...node.classList],
          isCandidateButton:node.classList.contains('btn'),
          isTextLink:node.classList.contains('text-link'),
          isInheritedIconButton:node.classList.contains('icon-btn'),
          w:node.getBoundingClientRect().width,
          h:node.getBoundingClientRect().height,
        }));
        return {
          bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          screenOverflow:screen?screen.scrollWidth-screen.clientWidth:null,
          contentOverflow:content?content.scrollWidth-content.clientWidth:null,
          contentScrollable:content?content.scrollHeight>content.clientHeight:false,
          contentBottom:contentRect?.bottom??null,
          footerTop:footerRect?.top??null,
          primaryBottom:primaryRect?.bottom??null,
          primaryCount:screen?.querySelectorAll('.btn.primary').length??0,
          primaryHeight:primaryRect?.height??null,
          anchors,clickableRects,
          text:screen?.textContent?.replace(/\s+/gu,' ').trim()??'',
          stateCode:screen?.getAttribute('data-state-code'),
          boundary:screen?.getAttribute('data-boundary'),
          demoReference:screen?.querySelector('[data-demo-reference]')?.getAttribute('data-demo-reference')??null,
          secretInputs:[...(screen?.querySelectorAll('input,textarea')??[])].filter(node=>/seed|private\s*key|password|secret|credential/iu.test(`${node.getAttribute('name')??''} ${node.getAttribute('aria-label')??''} ${node.getAttribute('placeholder')??''}`)).length,
        };
      },state);

      if ((metrics.bodyOverflow??0)>1 || (metrics.screenOverflow??0)>1 || (metrics.contentOverflow??0)>1) errors.push(`${viewport.name}/${state}: horizontal overflow body=${metrics.bodyOverflow}, screen=${metrics.screenOverflow}, content=${metrics.contentOverflow}`);
      if (metrics.footerTop!==null && metrics.contentBottom!==null && metrics.contentBottom>metrics.footerTop+1) errors.push(`${viewport.name}/${state}: content/footer overlap ${metrics.contentBottom} > ${metrics.footerTop}`);
      const expectedPrimary=progressStates.has(state)?0:1;
      if (metrics.primaryCount!==expectedPrimary) errors.push(`${viewport.name}/${state}: expected ${expectedPrimary} primary action(s), got ${metrics.primaryCount}`);
      if (metrics.primaryHeight!==null && metrics.primaryHeight<44) errors.push(`${viewport.name}/${state}: primary target ${metrics.primaryHeight}px < 44px`);
      if (metrics.primaryBottom!==null && metrics.contentBottom!==null && metrics.primaryBottom>metrics.contentBottom+1) errors.push(`${viewport.name}/${state}: primary action is outside initial content viewport`);

      for (const rect of metrics.clickableRects) {
        // Candidate .btn controls and .text-link controls follow the 44px interaction baseline.
        // The inherited Golden header uses .icon-btn at 36x36; do not misclassify it because its class name contains the substring "btn".
        if (rect.isCandidateButton && rect.h<44) errors.push(`${viewport.name}/${state}: .btn target ${rect.h}px < 44px`);
        if (rect.isTextLink && rect.h<44) errors.push(`${viewport.name}/${state}: .text-link target ${rect.h}px < 44px`);
        if (rect.isInheritedIconButton && (rect.h<36 || rect.w<36)) errors.push(`${viewport.name}/${state}: inherited .icon-btn fell below its 36px Golden baseline (${rect.w}x${rect.h})`);
      }

      if (metrics.secretInputs!==0) errors.push(`${viewport.name}/${state}: found secret-like input field`);
      if (expectedStateCodes[state] && metrics.stateCode!==expectedStateCodes[state]) errors.push(`${viewport.name}/${state}: expected state code ${expectedStateCodes[state]}, got ${metrics.stateCode}`);
      if (expectedBoundaries[state] && metrics.boundary!==expectedBoundaries[state]) errors.push(`${viewport.name}/${state}: expected boundary ${expectedBoundaries[state]}, got ${metrics.boundary}`);
      for (const phrase of expectedSemantics[state]??[]) if (!metrics.text.toLowerCase().includes(phrase.toLowerCase())) errors.push(`${viewport.name}/${state}: missing semantic phrase “${phrase}”`);
      for (const href of metrics.anchors) {
        const target=href?.slice(1);
        if (target && !states.includes(target)) errors.push(`${viewport.name}/${state}: broken in-candidate route ${href}`);
      }

      const ownerBoundaries=['#person-handoff','#invite-handoff','#receive-handoff','#settlement-receive-handoff'];
      const unresolvedStates=new Set(['entry','permission','permission-denied','camera-unavailable','scanner-ready','reading','resolving','resolution-error','offline','duplicate','malformed','unsupported-type','unsupported-version','external-payload','sensitive-payload','session-changed','cancelled-before','cancelled-after','rescan','loading','load-error','you-handoff']);
      if (unresolvedStates.has(state)) for (const boundary of ownerBoundaries) if (metrics.anchors.includes(boundary)) errors.push(`${viewport.name}/${state}: unresolved/inert state must not route to owner boundary ${boundary}`);
      if (state==='person' && !metrics.anchors.includes('#person-handoff')) errors.push(`${viewport.name}/person: recognized person must offer explicit J09 handoff`);
      if (state==='own-person' && metrics.anchors.includes('#person-handoff')) errors.push(`${viewport.name}/own-person: own code must not fabricate another-person J09 handoff`);
      if (state==='invite' && !metrics.anchors.includes('#invite-handoff')) errors.push(`${viewport.name}/invite: recognized invite must offer explicit J04 handoff`);
      if (state==='invite-expired' && metrics.anchors.includes('#invite-handoff')) errors.push(`${viewport.name}/invite-expired: expired invite must not offer J04 join handoff`);
      if (state==='receive-share' && !metrics.anchors.includes('#receive-handoff')) errors.push(`${viewport.name}/receive-share: recognized private share must offer explicit J14 handoff`);
      if (state==='receive-wrong-audience' && metrics.anchors.includes('#receive-handoff')) errors.push(`${viewport.name}/receive-wrong-audience: wrong audience must not enter J14 disclosure handoff`);
      if (state==='settlement-match' && !metrics.anchors.includes('#settlement-receive-handoff')) errors.push(`${viewport.name}/settlement-match: matched settlement must offer scoped J14/J11 handoff`);
      if (state==='settlement-mismatch' && metrics.anchors.includes('#settlement-receive-handoff')) errors.push(`${viewport.name}/settlement-mismatch: mismatch must not route into receiving shortcut`);
      if (state==='session-changed' && !metrics.anchors.includes('#resolving')) errors.push(`${viewport.name}/session-changed: stale preview must re-resolve before handoff`);
      if (state==='duplicate' && !metrics.anchors.includes('#resolving')) errors.push(`${viewport.name}/duplicate: duplicate read must reuse current resolution`);

      if (['person','invite','receive-share','receive-expired','receive-wrong-audience','settlement-match','settlement-mismatch'].includes(state)) {
        const forbiddenValues=[/\bCH\d{2}(?:[ ]?[A-Z0-9]){17,21}\b/iu,/\b0x[a-f0-9]{20,}\b/iu,/\b(?:seed phrase|private key value|wallet secret)\s*[:=]/iu];
        for (const re of forbiddenValues) if (re.test(metrics.text)) errors.push(`${viewport.name}/${state}: preview leaked raw sensitive destination/secret value`);
      }
      if (['my-qr','invite-qr','receive-qr'].includes(state)) {
        if (!metrics.demoReference?.startsWith('https://example.invalid/chopdot/')) errors.push(`${viewport.name}/${state}: display QR does not bind an inert example.invalid demo reference`);
      }

      const shot=path.join(screenshotRoot,`${viewport.name}--${state}.png`);
      await page.screenshot({path:shot,fullPage:false});
      screenshotRecords.push({viewport:viewport.name,state,file:path.relative(evidenceRoot,shot),contentScrollable:metrics.contentScrollable});
    }

    // Existing scanner/person spine stays executable.
    await page.goto(`${pathToFileURL(candidatePath).href}#entry`,{waitUntil:'load'});
    await page.locator('#entry [data-test-primary]').click(); await checkHash(page,'permission',`${viewport.name}/person entry→permission`);
    await page.locator('#permission [data-test-primary]').click(); await checkHash(page,'scanner-ready',`${viewport.name}/person permission→ready`);
    await page.locator('#scanner-ready [data-test-primary]').click(); await checkHash(page,'reading',`${viewport.name}/person ready→reading`);
    await page.waitForTimeout(1550); await checkHash(page,'person',`${viewport.name}/person automatic resolve→person`);
    await page.locator('#person [data-test-primary]').click(); await checkHash(page,'person-handoff',`${viewport.name}/person→J09 boundary`);
    await page.locator('#person-handoff [data-test-primary]').click(); await checkHash(page,'return-from-person',`${viewport.name}/J09 return→QR context`);

    // Invite resolution hands off but never auto-joins.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#invite`,{waitUntil:'load'});
    await page.locator('#invite [data-test-primary]').click(); await checkHash(page,'invite-handoff',`${viewport.name}/invite→J04 boundary`);
    await page.locator('#invite-handoff [data-test-primary]').click(); await checkHash(page,'rescan',`${viewport.name}/J04 boundary→scanner`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#invite-already-joined`,{waitUntil:'load'});
    await page.locator('#invite-already-joined [data-test-primary]').click(); await checkHash(page,'invite-handoff',`${viewport.name}/already joined→J04 current-membership boundary`);

    // Private share possession stays non-authoritative until J14.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#receive-share`,{waitUntil:'load'});
    await page.locator('#receive-share [data-test-primary]').click(); await checkHash(page,'receive-handoff',`${viewport.name}/private share→J14 boundary`);
    await page.locator('#receive-handoff [data-test-primary]').click(); await checkHash(page,'rescan',`${viewport.name}/J14 boundary→scanner`);

    // Matching settlement carries the same scope; mismatch returns without substitution.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#settlement-match`,{waitUntil:'load'});
    await page.locator('#settlement-match [data-test-primary]').click(); await checkHash(page,'settlement-receive-handoff',`${viewport.name}/settlement match→J14/J11 boundary`);
    await page.locator('#settlement-receive-handoff [data-test-primary]').click(); await checkHash(page,'settlement-return',`${viewport.name}/owner review→same settlement`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#settlement-mismatch`,{waitUntil:'load'});
    await page.locator('#settlement-mismatch [data-test-primary]').click(); await checkHash(page,'settlement-return',`${viewport.name}/settlement mismatch→unchanged J11 context`);

    // Invalid/external/sensitive inputs stay inert and recover by rescanning.
    for (const state of ['malformed','unsupported-type','unsupported-version','external-payload','sensitive-payload']) {
      await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#${state}`,{waitUntil:'load'});
      await page.locator(`#${state} [data-test-primary]`).click(); await checkHash(page,'rescan',`${viewport.name}/${state}→safe rescan`);
    }

    // Display states render existing opaque references only and return to their owners.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#my-qr`,{waitUntil:'load'});
    await page.locator('#my-qr [data-test-primary]').click(); await checkHash(page,'you-handoff',`${viewport.name}/My QR→You`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#invite-qr`,{waitUntil:'load'});
    await page.locator('#invite-qr [data-test-primary]').click(); await checkHash(page,'invite-handoff',`${viewport.name}/invite QR→J04`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#receive-qr`,{waitUntil:'load'});
    await page.locator('#receive-qr [data-test-primary]').click(); await checkHash(page,'receive-handoff',`${viewport.name}/receive QR→J14`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#display-expired`,{waitUntil:'load'});
    await page.locator('#display-expired [data-test-primary]').click(); await checkHash(page,'receive-handoff',`${viewport.name}/expired display→owner flow`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#display-error`,{waitUntil:'load'});
    await page.locator('#display-error [data-test-primary]').click(); await checkHash(page,'display-loading',`${viewport.name}/display error→same-reference loading`);

    // Existing recovery invariants.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#permission`,{waitUntil:'load'});
    await page.locator('#permission a[href="#permission-denied"]').click(); await checkHash(page,'permission-denied',`${viewport.name}/permission denial`);
    await page.locator('#permission-denied [data-test-primary]').click(); await checkHash(page,'permission',`${viewport.name}/permission retry`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#session-changed`,{waitUntil:'load'});
    await page.locator('#session-changed [data-test-primary]').click(); await checkHash(page,'resolving',`${viewport.name}/session change→re-resolve`);
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#resolution-error`,{waitUntil:'load'});
    await page.locator('#resolution-error [data-test-primary]').click(); await checkHash(page,'resolving',`${viewport.name}/resolution error→same reference retry`);

    await context.close();
  }
} finally {
  await browser.close();
}

for (const err of browserErrors) errors.push(`${err.viewport}: page error: ${err.message}`);
for (const err of consoleErrors) errors.push(`${err.viewport}: console error: ${err.message}`);
for (const request of externalRequests) errors.push(`${request.viewport}: unexpected external request ${request.url}`);

const sensitiveSourcePatterns = [
  {label:'Swiss IBAN-shaped value',re:/\bCH\d{2}(?:[ ]?[A-Z0-9]){17,21}\b/iu},
  {label:'long hexadecimal wallet-like value',re:/\b0x[a-f0-9]{20,}\b/iu},
  {label:'secret-like input',re:/<input[^>]+(?:seed|private[-_ ]?key|secret|password|credential)/iu},
];
for (const {label,re} of sensitiveSourcePatterns) if (re.test(html)) errors.push(`candidate source contains ${label}`);
for (const ref of ['https://example.invalid/chopdot/person/demo-self-v1','https://example.invalid/chopdot/invite/demo-lisbon-v1','https://example.invalid/chopdot/receive/demo-private-share-v1']) if (!html.includes(ref)) errors.push(`candidate missing inert display reference ${ref}`);

const summary = {
  journey:'22',
  candidate:'prototypes/experience-workbench/journeys/22-qr-flows/v1-candidate.html',
  branch,head,tree,candidate_sha256:candidateSha256,
  scope:'Complete registered J22 V1 candidate: scanner lifecycle; person, group-invite, and private receive/share typed resolution; settlement match/mismatch continuity; malformed/unsupported/external/sensitive input handling; My/invite/private-share QR display with expiry/loading/error; owner-journey boundaries; cancellation, session, offline, duplicate, rescan, and load recovery.',
  status:errors.length?'FAILED':'COMPLETE_CANDIDATE_QA_PASSED',
  registered_states:requiredInventoryCodes.length,
  states_rendered:states.length,
  screenshots:screenshotRecords.length,
  viewports:viewports.map(v=>v.name),
  clicked_path_observations:interactionResults.length,
  clicked_paths_passed:interactionResults.filter(item=>item.pass).length,
  page_errors:browserErrors,
  console_errors:consoleErrors,
  external_requests:externalRequests,
  limitations:[
    'Standalone synthetic prototype; no real camera, resolver, authentication, backend write, group join, receiving-detail disclosure, payment, wallet connection, or external application is used.',
    'Displayed demo codes bind only inert example.invalid references; they are not provider payment QRs and cannot move money or grant access.',
    'Boundary states identify J04/J09/J11/J14 ownership but do not copy or claim completion of approved adjacent Golden experiences.',
    'Mechanical/browser evidence is not independent UX approval and does not imply GOLDEN-READY or human approval.',
  ],
  errors,
  screenshots_manifest:screenshotRecords,
  interactions:interactionResults,
};
await writeFile(path.join(evidenceRoot,'QA_SUMMARY.json'),JSON.stringify(summary,null,2));

const md = [
  '# Journey 22 V1 — complete candidate visual QA','',
  `- Exact head: \`${head}\``,
  `- Branch: \`${branch}\``,
  `- Candidate SHA-256: \`${candidateSha256}\``,
  `- Result: **${summary.status}**`,
  `- Registered J22 states: **${requiredInventoryCodes.length}**`,
  `- Rendered candidate states/boundaries: **${states.length}**`,
  `- Screenshots: **${screenshotRecords.length}** (${viewports.map(v=>v.name).join(' and ')})`,
  `- Clicked-path observations: **${summary.clicked_paths_passed}/${interactionResults.length} passed**`,
  `- Browser errors: **${browserErrors.length}** · console errors: **${consoleErrors.length}** · external requests: **${externalRequests.length}**`,
  '', '## Scope','', summary.scope,
  '', '## Rendered states and boundaries','', states.map(state=>`- \`${state}\``).join('\n'),
  '', '## Evidence limits','', ...summary.limitations.map(item=>`- ${item}`),
  '', '## Mechanical findings','',
  errors.length?errors.map(item=>`- FAIL — ${item}`).join('\n'):'- No deterministic inventory, browser, interaction, layout, route, authority-boundary, sensitive-value, console, page-error, or external-request failures detected.',
  '', 'Actual PNGs are in `screenshots/`; inspect those directly for independent visual judgment.','',
].join('\n');
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),md);

console.log(JSON.stringify({head,candidateSha256,status:summary.status,registeredStates:requiredInventoryCodes.length,rendered:states.length,screenshots:screenshotRecords.length,interactions:`${summary.clicked_paths_passed}/${interactionResults.length}`,errors:errors.length},null,2));
if (errors.length) process.exit(1);
