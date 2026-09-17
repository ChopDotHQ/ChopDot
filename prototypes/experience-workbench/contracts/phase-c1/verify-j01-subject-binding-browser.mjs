import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const workbench=path.resolve(here,'../..');
const journey=path.join(workbench,'journeys/01-enter-chopdot');
const source=path.join(journey,'source');
const artifact=path.join(journey,'v1-candidate.html');
const out=path.join(here,'artifacts','j01-subject-binding');
fs.mkdirSync(out,{recursive:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const canonicalBytes=fs.readFileSync(artifact);
const canonicalSha=digest(canonicalBytes);
assert.equal(canonicalSha,'6c078a2ee901de3233dbd6278434c78d3734a5a98903e70d50e6ef4b06f6e33d','exact approved J01 predecessor bytes');
const modelEvidence=JSON.parse(execFileSync(process.execPath,[path.join(source,'test-subject-binding.cjs')],{encoding:'utf8'}));
assert.equal(modelEvidence.ok,true);

let browser;
const viewports=[{name:'393x852',width:393,height:852},{name:'430x890',width:430,height:890}];
const checks=[];const screenshots=[];const failures=[];
const check=(value,message,viewport)=>{assert.ok(value,message);checks.push({viewport,message,passed:true});};
try{
  execFileSync(process.execPath,[path.join(source,'build.mjs')],{stdio:'pipe'});
  const generatedBytes=fs.readFileSync(artifact);const generatedSha=digest(generatedBytes);
  assert.notEqual(generatedSha,canonicalSha,'selective successor must differ from approved predecessor');
  fs.writeFileSync(path.join(out,'j01-subject-binding-successor.html'),generatedBytes);
  browser=await chromium.launch({headless:true});
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});const page=await context.newPage();
    const pageErrors=[],consoleErrors=[],network=[];
    page.on('pageerror',e=>pageErrors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
    page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url())});
    const url=pathToFileURL(artifact).href;
    const route=async expected=>check((await page.locator('#entry-screen').getAttribute('data-state'))===expected,`state=${expected}`,vp.name);
    const snap=async name=>{const file=path.join(out,`${vp.name}-${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(path.basename(file));};
    const fillEmail=async value=>{await page.locator('#email').fill(value);await page.locator('#email-form button[type=submit], button[form=email-form]').first().click();};
    const fillCode=async value=>{await page.locator('#code').fill(value);await page.locator('#code-form button[type=submit], button[form=code-form]').first().click();};
    const noOverflow=async label=>check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),`${label} no horizontal overflow`,vp.name);

    // Real caller path: returning email A -> provider fixture -> Ready.
    await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>EntryDemo.fixture('returning'));await route('email');await fillEmail('dev@example.com');await route('code');
    const proofA=await page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,challenge:s.pendingChallenge,subject:s.pendingSubject,destination:s.pendingDestination}});
    await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryModel.verificationCurrent(EntryDemo.get())),'A proof current at Ready',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:dev@example.com','A exact subject bound',vp.name);await snap('ready-subject-a');await noOverflow('ready A');

    // Browser Back/Forward temporal cut: return to email, mutate A->B, then Forward cannot resurrect A authority.
    await page.goBack();await page.waitForTimeout(40);await route('code');await page.goBack();await page.waitForTimeout(40);await route('email');
    await page.locator('#email').fill('other@example.com');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'subject edit revokes verification immediately',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='home','navigation intent preserved while authority revoked',vp.name);await snap('subject-mutated-fail-closed');
    await page.goForward();await page.waitForTimeout(40);await route('code');await page.goForward();await page.waitForTimeout(40);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'Forward cannot restore prior-subject authority',vp.name);

    // Replay old correlated provider result after mutation: rejected.
    await page.evaluate(([p])=>EntryDemo.dispatch('VERIFY_CODE',{code:'123456',...p}),[proofA]);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale A proof rejected for B',vp.name);

    // Fresh B proof is required and works.
    await fillEmail('other@example.com');await route('code');const proofB=await page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,challenge:s.pendingChallenge,subject:s.pendingSubject,destination:s.pendingDestination}});
    check(proofB.subject==='email:other@example.com','fresh request bound to B',vp.name);check(proofB.request>proofA.request,'fresh request rotates proof epoch',vp.name);await fillCode('123456');await route('profile');await page.locator('#name').fill('Other');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:other@example.com','Ready uses fresh B proof',vp.name);await snap('fresh-subject-b-ready');

    // Direct-hash/restart cannot synthesize authority; invite remains navigation intent only.
    await page.goto(`${url}#ready/invite`,{waitUntil:'load'});await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'direct Ready hash starts unverified',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination retained as navigation intent',vp.name);await noOverflow('direct-hash fail closed');

    // Invite path + profile presentation does not rebind identity authority.
    await page.evaluate(()=>EntryDemo.fixture('invite'));await page.locator('[data-action=EMAIL]').first().click();await fillEmail('sam@example.com');await fillCode('123456');await route('profile');const subjectBefore=await page.evaluate(()=>EntryDemo.get().verifiedSubject);await page.locator('#name').fill('Sam Display');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))===subjectBefore,'profile mutation cannot rebind proof subject',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination survives same-subject verification',vp.name);await snap('invite-profile-bound');

    // Wallet sibling: a newer account request makes the older approval unusable.
    await page.evaluate(()=>EntryDemo.fixture('invite'));await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();await route('approval-waiting');const walletA=await page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,subject:s.pendingSubject,destination:s.pendingDestination}});
    await page.evaluate(()=>EntryDemo.dispatch('REQUEST_APPROVAL',{account:'Travel'}));await route('approval-waiting');const walletB=await page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,subject:s.pendingSubject,destination:s.pendingDestination}});
    await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[walletA]);check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale wallet/account approval rejected',vp.name);await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[walletB]);check(await page.evaluate(()=>EntryDemo.get().verified),'fresh wallet/account approval accepted',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='wallet:travel','wallet proof bound to exact account subject',vp.name);await snap('wallet-account-bound');

    check(pageErrors.length===0,'zero page errors',vp.name);check(consoleErrors.length===0,'zero console errors',vp.name);check(network.length===0,'zero external network requests',vp.name);
    if(pageErrors.length||consoleErrors.length||network.length)failures.push({viewport:vp.name,pageErrors,consoleErrors,network});
    await context.close();
  }
  const evidence={suite:'phase-c1-j01-subject-binding',canonical_predecessor_sha256:canonicalSha,generated_successor_sha256:digest(fs.readFileSync(artifact)),model_checks:modelEvidence.checks,viewports,assertions:checks.length,screenshot_count:screenshots.length,screenshots,page_console_network_failures:failures,result:'pass'};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence));
} finally {
  if(browser)await browser.close();
  fs.writeFileSync(artifact,canonicalBytes);
  assert.equal(digest(fs.readFileSync(artifact)),canonicalSha,'approved J01 bytes restored after ephemeral successor render');
}
