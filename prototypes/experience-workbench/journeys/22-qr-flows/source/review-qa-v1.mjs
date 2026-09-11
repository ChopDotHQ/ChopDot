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
const evidenceRoot = path.resolve(repoRoot, 'artifacts/j22-v1-review');
const screenshotRoot = path.join(evidenceRoot, 'screenshots');
await mkdir(screenshotRoot, {recursive: true});

const html = await readFile(candidatePath, 'utf8');
const candidateSha256 = createHash('sha256').update(html).digest('hex');
const git = (...args) => execFileSync('git', args, {cwd: repoRoot, encoding: 'utf8'}).trim();
const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');

const states = [
  'entry','permission','permission-denied','camera-unavailable','scanner-ready','reading','resolving','resolution-error','offline','duplicate',
  'person','own-person','person-unavailable','session-changed','cancelled-before','cancelled-after','rescan','loading','load-error',
  'person-handoff','return-from-person','you-handoff',
];
const progressStates = new Set(['reading','resolving','loading']);
const viewports = [
  {width:393,height:852,name:'393x852'},
  {width:430,height:890,name:'430x890'},
];

const expectedSemantics = {
  entry:['Scan first. Decide after.','Scanning a code never acts by itself','Your context is preserved','No action yet'],
  permission:['Use your camera to scan.','camera access','does not access a real camera'],
  'permission-denied':['Camera access is off.','No code was scanned','original context is still here'],
  'camera-unavailable':['camera is not available','Nothing was read or handed off','context is preserved'],
  'scanner-ready':['Hold a ChopDot code inside the frame','read it first','no live camera is accessed'],
  reading:['Code detected','repeated frames are paused','No person, invite, receiving share, or action has been trusted yet'],
  resolving:['Checking what this code represents','current type and availability','Nothing is joined, shared, paid, saved, or connected'],
  'resolution-error':['could not check this code','code was read','No handoff was started','same detected reference'],
  offline:['You are offline','cannot confirm its current person, invite, or sharing status','No stale result is being shown as current'],
  duplicate:['same QR again','one resolution attempt','No duplicate join, share, request, or payment action'],
  person:['code belongs to Maya','ChopDot person','Manage People','identity only','does not reveal balances, payment details, wallet state'],
  'own-person':['your own ChopDot code','identifies you as a person','not a receiving destination','do not open a fake'],
  'person-unavailable':['person cannot be opened now','will not reuse an older identity preview','original You context remains unchanged'],
  'session-changed':['signed-in context changed','old preview cannot be used as current authority','same reference under the current session'],
  'cancelled-before':['Nothing changed','No target was opened','Return context','Preserved'],
  'cancelled-after':['handoff was cancelled','underlying person, invite, share','transport attempt'],
  rescan:['Ready for a different code','previous scan result was cleared','does not repeat a join, share, payment, or wallet command'],
  loading:['Preparing QR tools','No scanner, code target, person, invite, receiving share, or action is assumed yet'],
  'load-error':['could not be prepared','No scanner success or code result is being assumed','Return context'],
  'person-handoff':['Preview only','J22 has identified Maya and stops here','Journey 09 owns person detail','does not copy J09 screens'],
  'return-from-person':['back in the same QR context','does not turn its cancellation, failure, or unchanged state into QR success','Original caller'],
  'you-handoff':['Safe return','exact caller','Nothing outside the scanner was changed'],
};

const expectedStateCodes = {
  entry:'J22-S01',permission:'J22-S02','permission-denied':'J22-S03','camera-unavailable':'J22-S04','scanner-ready':'J22-S05',
  reading:'J22-S06',resolving:'J22-S07','resolution-error':'J22-S08',offline:'J22-S09',duplicate:'J22-S10',person:'J22-S11',
  'own-person':'J22-S12','person-unavailable':'J22-S13','cancelled-before':'J22-S33','cancelled-after':'J22-S34','session-changed':'J22-S35',
  'return-from-person':'J22-S36',rescan:'J22-S37',loading:'J22-S38','load-error':'J22-S39',
};

const errors = [];
const screenshotRecords = [];
const browserErrors = [];
const consoleErrors = [];
const externalRequests = [];
const interactionResults = [];
const browser = await chromium.launch({headless:true});

const checkHash = async (page, expected, label) => {
  const hash = await page.evaluate(() => location.hash);
  const pass = hash === `#${expected}`;
  interactionResults.push({label, expected:`#${expected}`, actual:hash, pass});
  if (!pass) errors.push(`${label}: expected #${expected}, got ${hash}`);
};

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page = await context.newPage();
    page.on('pageerror', error => browserErrors.push({viewport:viewport.name,message:String(error)}));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push({viewport:viewport.name,message:message.text()}); });
    page.on('request', request => { const url=request.url(); if (/^https?:/iu.test(url)) externalRequests.push({viewport:viewport.name,url}); });

    for (const state of states) {
      const url = `${pathToFileURL(candidatePath).href}?freeze=1#${state}`;
      await page.goto(url,{waitUntil:'load'});
      const active = page.locator(`#${state}`);
      if (!(await active.isVisible())) errors.push(`${viewport.name}/${state}: target screen is not visible`);
      const visibleScreens = await page.locator('.screen:visible').count();
      if (visibleScreens !== 1) errors.push(`${viewport.name}/${state}: expected exactly one visible screen, got ${visibleScreens}`);

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
        const clickableRects=actions.map(node=>({cls:node.className||'',w:node.getBoundingClientRect().width,h:node.getBoundingClientRect().height}));
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
          anchors,
          clickableRects,
          text:screen?.textContent?.replace(/\s+/gu,' ').trim()??'',
          stateCode:screen?.getAttribute('data-state-code'),
          boundary:screen?.getAttribute('data-boundary'),
          secretInputs:[...(screen?.querySelectorAll('input,textarea')??[])].filter(node=>/seed|private\s*key|password|secret|credential/iu.test(`${node.getAttribute('name')??''} ${node.getAttribute('aria-label')??''} ${node.getAttribute('placeholder')??''}`)).length,
        };
      },state);

      if ((metrics.bodyOverflow??0)>1 || (metrics.screenOverflow??0)>1 || (metrics.contentOverflow??0)>1) errors.push(`${viewport.name}/${state}: horizontal overflow body=${metrics.bodyOverflow}, screen=${metrics.screenOverflow}, content=${metrics.contentOverflow}`);
      if (metrics.footerTop!==null && metrics.contentBottom!==null && metrics.contentBottom>metrics.footerTop+1) errors.push(`${viewport.name}/${state}: content/footer overlap ${metrics.contentBottom} > ${metrics.footerTop}`);
      const expectedPrimary = progressStates.has(state)?0:1;
      if (metrics.primaryCount!==expectedPrimary) errors.push(`${viewport.name}/${state}: expected ${expectedPrimary} primary action(s), got ${metrics.primaryCount}`);
      if (metrics.primaryHeight!==null && metrics.primaryHeight<44) errors.push(`${viewport.name}/${state}: primary target ${metrics.primaryHeight}px < 44px`);
      if (metrics.primaryBottom!==null && metrics.contentBottom!==null && metrics.primaryBottom>metrics.contentBottom+1) errors.push(`${viewport.name}/${state}: primary action is outside initial content viewport`);
      for (const rect of metrics.clickableRects) {
        if (String(rect.cls).includes('btn') && rect.h<44) errors.push(`${viewport.name}/${state}: button target ${rect.h}px < 44px`);
        if (String(rect.cls).includes('text-link') && rect.h<44) errors.push(`${viewport.name}/${state}: text-link target ${rect.h}px < 44px`);
      }
      if (metrics.secretInputs!==0) errors.push(`${viewport.name}/${state}: found secret-like input field`);
      if (expectedStateCodes[state] && metrics.stateCode!==expectedStateCodes[state]) errors.push(`${viewport.name}/${state}: expected state code ${expectedStateCodes[state]}, got ${metrics.stateCode}`);
      for (const phrase of expectedSemantics[state]??[]) if (!metrics.text.toLowerCase().includes(phrase.toLowerCase())) errors.push(`${viewport.name}/${state}: missing semantic phrase “${phrase}”`);
      for (const href of metrics.anchors) {
        const target=href?.slice(1);
        if (target && !states.includes(target)) errors.push(`${viewport.name}/${state}: broken in-candidate route ${href}`);
      }

      const unsafeHandoffStates = new Set(['entry','permission','permission-denied','camera-unavailable','scanner-ready','reading','resolving','resolution-error','offline','duplicate','own-person','person-unavailable','session-changed','cancelled-before','cancelled-after','rescan','loading','load-error','you-handoff']);
      if (unsafeHandoffStates.has(state) && metrics.anchors.includes('#person-handoff')) errors.push(`${viewport.name}/${state}: unresolved/non-person state must not route to J09 person handoff`);
      if (state==='person' && !metrics.anchors.includes('#person-handoff')) errors.push(`${viewport.name}/person: recognized person must offer explicit J09 handoff`);
      if (state==='person' && metrics.anchors.includes('#you-handoff')) errors.push(`${viewport.name}/person: recognized person should preserve cancel/rescan semantics rather than jump directly to generic return`);
      if (state==='own-person' && metrics.anchors.includes('#person-handoff')) errors.push(`${viewport.name}/own-person: own code must not fabricate another-person J09 handoff`);
      if (state==='session-changed' && !metrics.anchors.includes('#resolving')) errors.push(`${viewport.name}/session-changed: stale preview must re-resolve before any handoff`);
      if (state==='duplicate' && !metrics.anchors.includes('#resolving')) errors.push(`${viewport.name}/duplicate: duplicate read must reuse current resolution`);
      if (state==='person-handoff' && metrics.boundary!=='J09') errors.push(`${viewport.name}/person-handoff: boundary must identify J09 ownership`);
      if (state==='you-handoff' && metrics.boundary!=='You') errors.push(`${viewport.name}/you-handoff: safe return boundary is not explicit`);
      if (state==='person') {
        for (const forbidden of ['IBAN','account number','wallet address','CHF ',' DOT ','private key']) if (metrics.text.includes(forbidden)) errors.push(`${viewport.name}/person: identity-only preview leaked forbidden field phrase “${forbidden}”`);
      }

      const shot=path.join(screenshotRoot,`${viewport.name}--${state}.png`);
      await page.screenshot({path:shot,fullPage:false});
      screenshotRecords.push({viewport:viewport.name,state,file:path.relative(evidenceRoot,shot),contentScrollable:metrics.contentScrollable});
    }

    // Actual clicked happy path with automatic reading/resolution states.
    await page.goto(`${pathToFileURL(candidatePath).href}#entry`,{waitUntil:'load'});
    await page.locator('#entry [data-test-primary]').click(); await checkHash(page,'permission',`${viewport.name}/happy entry→permission`);
    await page.locator('#permission [data-test-primary]').click(); await checkHash(page,'scanner-ready',`${viewport.name}/happy permission→ready`);
    await page.locator('#scanner-ready [data-test-primary]').click(); await checkHash(page,'reading',`${viewport.name}/happy ready→reading`);
    await page.waitForTimeout(1550); await checkHash(page,'person',`${viewport.name}/happy automatic resolve→person`);
    await page.locator('#person [data-test-primary]').click(); await checkHash(page,'person-handoff',`${viewport.name}/happy person→J09 boundary`);
    await page.locator('#person-handoff [data-test-primary]').click(); await checkHash(page,'return-from-person',`${viewport.name}/happy J09 return→QR context`);
    await page.locator('#return-from-person [data-test-primary]').click(); await checkHash(page,'rescan',`${viewport.name}/happy return→rescan`);
    await page.locator('#rescan [data-test-primary]').click(); await checkHash(page,'scanner-ready',`${viewport.name}/happy rescan→ready`);

    // Permission denial recovers only through permission or safe return.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#permission`,{waitUntil:'load'});
    await page.locator('#permission a[href="#permission-denied"]').click(); await checkHash(page,'permission-denied',`${viewport.name}/permission denial`);
    await page.locator('#permission-denied [data-test-primary]').click(); await checkHash(page,'permission',`${viewport.name}/permission retry`);

    // Scanner cancellation returns without a domain result.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#scanner-ready`,{waitUntil:'load'});
    await page.locator('#scanner-ready a[href="#cancelled-before"]').first().click(); await checkHash(page,'cancelled-before',`${viewport.name}/cancel before scan`);
    await page.locator('#cancelled-before [data-test-primary]').click(); await checkHash(page,'you-handoff',`${viewport.name}/cancel safe return`);

    // Own-person code cannot enter the another-person boundary.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#own-person`,{waitUntil:'load'});
    await page.locator('#own-person [data-test-primary]').click(); await checkHash(page,'you-handoff',`${viewport.name}/own person→You`);

    // Stale session must re-resolve instead of using the old preview.
    await page.goto(`${pathToFileURL(candidatePath).href}?freeze=1#session-changed`,{waitUntil:'load'});
    await page.locator('#session-changed [data-test-primary]').click(); await checkHash(page,'resolving',`${viewport.name}/session change→re-resolve`);

    // Resolver error retries the same reference.
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

const sensitivePayloadPatterns = [
  {label:'Swiss IBAN-shaped value',re:/\bCH\d{2}(?:[ ]?[A-Z0-9]){17,21}\b/iu},
  {label:'long hexadecimal wallet-like value',re:/\b0x[a-f0-9]{20,}\b/iu},
  {label:'seed phrase input',re:/<input[^>]+(?:seed|private[-_ ]?key|secret|password)/iu},
];
for (const {label,re} of sensitivePayloadPatterns) if (re.test(html)) errors.push(`candidate source contains ${label}`);

const summary = {
  journey:'22',
  candidate:'prototypes/experience-workbench/journeys/22-qr-flows/v1-candidate.html',
  branch,head,tree,candidate_sha256:candidateSha256,
  scope:'First bounded J22 candidate increment: scanner lifecycle, person-reference typed preview, J09 boundary handoff, cancellation/rescan/session continuity, and initial load recovery. Group invite, private receive/share, settlement mismatch, invalid/unsupported payload and QR display clusters remain definition-only.',
  status:errors.length?'FAILED':'BOUNDED_INCREMENT_QA_PASSED',
  states_rendered:states.length,
  screenshots:screenshotRecords.length,
  viewports:viewports.map(v=>v.name),
  clicked_path_observations:interactionResults.length,
  clicked_paths_passed:interactionResults.filter(item=>item.pass).length,
  page_errors:browserErrors,
  console_errors:consoleErrors,
  external_requests:externalRequests,
  limitations:[
    'Standalone synthetic prototype; no real camera, resolver, authentication, backend write, payment, share, invite join, wallet connection, or external app is used.',
    'This is intentionally a bounded first candidate increment, not complete J22 V1 state coverage.',
    'Boundary states identify owner journeys but do not copy or claim completion of approved adjacent Golden experiences.',
    'Mechanical/browser evidence is not independent UX approval and does not imply GOLDEN-READY.',
  ],
  errors,
  screenshots_manifest:screenshotRecords,
  interactions:interactionResults,
};
await writeFile(path.join(evidenceRoot,'QA_SUMMARY.json'),JSON.stringify(summary,null,2));

const md = [
  '# Journey 22 V1 — bounded candidate visual QA',
  '',
  `- Exact head: \`${head}\``,
  `- Branch: \`${branch}\``,
  `- Candidate SHA-256: \`${candidateSha256}\``,
  `- Result: **${summary.status}**`,
  `- States rendered: **${states.length}**`,
  `- Screenshots: **${screenshotRecords.length}** (${viewports.map(v=>v.name).join(' and ')})`,
  `- Clicked-path observations: **${summary.clicked_paths_passed}/${interactionResults.length} passed**`,
  `- Browser errors: **${browserErrors.length}** · console errors: **${consoleErrors.length}** · external requests: **${externalRequests.length}**`,
  '',
  '## Scope',
  '',
  summary.scope,
  '',
  '## Rendered states',
  '',
  states.map(state=>`- \`${state}\``).join('\n'),
  '',
  '## Evidence limits',
  '',
  ...summary.limitations.map(item=>`- ${item}`),
  '',
  '## Mechanical findings',
  '',
  errors.length?errors.map(item=>`- FAIL — ${item}`).join('\n'):'- No deterministic browser, interaction, layout, route, authority-boundary, secret-input, console, page-error, or external-request failures detected.',
  '',
  'Actual PNGs are in `screenshots/`; inspect those directly for independent visual judgment.',
  '',
].join('\n');
await writeFile(path.join(evidenceRoot,'VISUAL_QA.md'),md);

console.log(JSON.stringify({head,candidateSha256,status:summary.status,states:states.length,screenshots:screenshotRecords.length,interactions:`${summary.clicked_paths_passed}/${interactionResults.length}`,errors:errors.length},null,2));
if (errors.length) process.exit(1);
