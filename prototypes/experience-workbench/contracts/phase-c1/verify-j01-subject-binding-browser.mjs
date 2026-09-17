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
assert.equal(canonicalSha,'383170c06d4e6bc4d6b658664fff6ae0f2eb003cf202ca5e8f8617fb06ae8f46','exact live approved J01 predecessor bytes');
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
    const emailProof=()=>page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,challenge:s.pendingChallenge,subject:s.pendingSubject,destination:s.pendingDestination,epoch:s.pendingEpoch}});
    const emailProviderEvidence=()=>page.evaluate(()=>EntryDemo.emailProviderEvidence());
    const emailResult=(code='123456')=>page.evaluate(c=>EntryDemo.emailResult(c),code);
    const walletProof=()=>page.evaluate(()=>{const s=EntryDemo.get();return {request:s.pendingRequest,subject:s.pendingSubject,destination:s.pendingDestination,epoch:s.pendingEpoch}});
    const startEmail=async destination=>{await page.evaluate(d=>EntryDemo.fixture(d==='invite'?'invite':'new'),destination);await page.locator('[data-action=EMAIL]').first().click();await fillEmail('dev@example.com');await route('code');};
    const startWallet=async destination=>{await page.evaluate(d=>EntryDemo.fixture(d==='invite'?'invite':'new'),destination);await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();await route('approval-waiting');};

    await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>EntryDemo.fixture('returning'));await route('email');await fillEmail('dev@example.com');await route('code');
    const proofA=await emailProof();
    await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryModel.verificationCurrent(EntryDemo.get())),'A proof current at Ready',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:dev@example.com','A exact subject bound',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedEpoch))===proofA.epoch,'A proof bound to current epoch',vp.name);await snap('ready-subject-a');await noOverflow('ready A');

    await page.goBack();await page.waitForTimeout(40);await route('code');await page.goBack();await page.waitForTimeout(40);await route('email');
    await page.locator('#email').fill('other@example.com');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'subject edit revokes verification immediately',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='home','navigation intent preserved while authority revoked',vp.name);await snap('subject-mutated-fail-closed');
    await page.goForward();await page.waitForTimeout(40);await route('code');await page.goForward();await page.waitForTimeout(40);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'Forward cannot restore prior-subject authority',vp.name);

    await page.evaluate(([p])=>EntryDemo.dispatch('VERIFY_CODE',{code:'123456',...p}),[proofA]);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale A proof rejected for B',vp.name);

    await fillEmail('other@example.com');await route('code');const proofB=await emailProof();
    check(proofB.subject==='email:other@example.com','fresh request bound to B',vp.name);check(proofB.request!==proofA.request,'fresh request rotates proof identity',vp.name);check(proofB.epoch===proofA.epoch,'same document retains one non-reusable epoch while requests rotate',vp.name);await fillCode('123456');await route('profile');await page.locator('#name').fill('Other');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:other@example.com','Ready uses fresh B proof',vp.name);await snap('fresh-subject-b-ready');

    // A same-document fragment navigation is not a restart. Leave the document first so this is a true direct-entry load.
    await page.goto('about:blank');await page.goto(`${url}#ready/invite`,{waitUntil:'load'});await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'direct Ready hash starts unverified',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination retained as navigation intent',vp.name);await noOverflow('direct-hash fail closed');

    await page.evaluate(()=>EntryDemo.fixture('invite'));await page.locator('[data-action=EMAIL]').first().click();await fillEmail('sam@example.com');await fillCode('123456');await route('profile');const subjectBefore=await page.evaluate(()=>EntryDemo.get().verifiedSubject);const epochBefore=await page.evaluate(()=>EntryDemo.get().verifiedEpoch);await page.locator('#name').fill('Sam Display');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))===subjectBefore,'profile mutation cannot rebind proof subject',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedEpoch))===epochBefore,'profile mutation cannot rebind proof epoch',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination survives same-subject verification',vp.name);await snap('invite-profile-bound');

    await page.evaluate(()=>EntryDemo.fixture('invite'));await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();await route('approval-waiting');const walletA=await walletProof();
    await page.evaluate(()=>EntryDemo.dispatch('REQUEST_APPROVAL',{account:'Travel'}));await route('approval-waiting');const walletB=await walletProof();
    await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[walletA]);check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale wallet/account approval rejected',vp.name);await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[walletB]);check(await page.evaluate(()=>EntryDemo.get().verified),'fresh wallet/account approval accepted',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='wallet:travel','wallet proof bound to exact account subject',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedEpoch))===walletB.epoch,'wallet proof bound to exact epoch',vp.name);await snap('wallet-account-bound');

    // Reviewer 5708896186: whole restart family, with stale email provider evidence injected through the same normal form/adapter seam.
    for(const destination of ['home','invite']){
      await page.goto(url,{waitUntil:'load'});await startWallet(destination);const s1=await walletProof();await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[s1]);check(await page.evaluate(()=>EntryDemo.get().verified),`S1 wallet ${destination} proof valid`,vp.name);
      await page.goto(url,{waitUntil:'load'});await startWallet(destination);const s2=await walletProof();check(s2.epoch!==s1.epoch,`wallet ${destination} restart epoch differs`,vp.name);check(s2.request!==s1.request,`wallet ${destination} restart request identity differs`,vp.name);
      await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[s1]);await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),`stale S1 wallet ${destination} proof rejected`,vp.name);
      await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[s2]);check(await page.evaluate(()=>EntryDemo.get().verified),`fresh S2 wallet ${destination} proof accepted`,vp.name);

      await page.goto(url,{waitUntil:'load'});await startEmail(destination);const e1=await emailProof();const e1Provider=await emailProviderEvidence();const e1Result=await emailResult();check(e1Provider?.providerRequestId===e1Result.providerRequestId,`S1 email ${destination} result carries issued provider request identity`,vp.name);await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),`S1 email ${destination} provider result valid on ordinary form`,vp.name);

      // Exercise both refresh-style reload and full process/document recreation across the two destinations.
      if(destination==='home')await page.reload({waitUntil:'load'});else{await page.goto('about:blank');await page.goto(url,{waitUntil:'load'});}
      await startEmail(destination);const e2=await emailProof();const e2Provider=await emailProviderEvidence();check(e2.epoch!==e1.epoch,`email ${destination} restart epoch differs`,vp.name);check(e2.request!==e1.request,`email ${destination} restart request identity differs`,vp.name);check(e2.challenge===e1.challenge,`email ${destination} reset challenge may collide without conferring freshness`,vp.name);check(e2Provider.providerRequestId!==e1Provider.providerRequestId,`email ${destination} provider transaction identity differs after restart`,vp.name);
      const manufactured=await page.evaluate(()=>EntryModel.emailVerificationResult(EntryDemo.get(),'123456'));check(!Object.hasOwn(manufactured,'request'),`current S2 pending state cannot manufacture ${destination} provider binding`,vp.name);

      // This is the exact public-path negative: retained S1 provider evidence is delivered to the same adapter buffer, then the ordinary code form submits it.
      await page.evaluate(e=>EntryDemo.deliverEmailProviderEvidence(e),e1Provider);await fillCode('123456');await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),`stale S1 provider result through ordinary ${destination} form mints zero S2 authority`,vp.name);

      // Only a freshly issued S2 result can succeed after the stale attempt fails closed.
      await fillEmail('dev@example.com');await route('code');const e2FreshProvider=await emailProviderEvidence();check(e2FreshProvider.providerRequestId!==e1Provider.providerRequestId,`fresh S2 ${destination} provider identity remains distinct from S1`,vp.name);await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),`fresh S2 ordinary email ${destination} result accepted`,vp.name);
    }

    // Reachable START_OVER is a full-reset boundary for wallet and the same ordinary email provider-result path.
    await page.goto(url,{waitUntil:'load'});await startWallet('home');const beforeReset=await walletProof();await page.evaluate(()=>EntryDemo.dispatch('START_OVER'));await route('welcome');const resetEpoch=await page.evaluate(()=>EntryDemo.get().verificationEpoch);check(resetEpoch!==beforeReset.epoch,'START_OVER rotates verification epoch',vp.name);await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();const afterReset=await walletProof();check(afterReset.request!==beforeReset.request,'START_OVER cannot recreate request identity',vp.name);await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[beforeReset]);await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'START_OVER rejects stale pre-reset wallet evidence',vp.name);await page.evaluate(([p])=>EntryDemo.dispatch('APPROVAL_RESULT',{result:'approved',...p}),[afterReset]);check(await page.evaluate(()=>EntryDemo.get().verified),'START_OVER accepts only fresh post-reset wallet evidence',vp.name);

    await page.goto(url,{waitUntil:'load'});await startEmail('home');const emailBeforeResetProvider=await emailProviderEvidence();const emailBeforeReset=await emailResult();await page.evaluate(()=>EntryDemo.dispatch('START_OVER'));await route('welcome');await page.locator('[data-action=EMAIL]').first().click();await fillEmail('dev@example.com');await route('code');const emailAfterReset=await emailProof();const emailAfterResetProvider=await emailProviderEvidence();check(emailAfterReset.epoch!==emailBeforeReset.epoch,'START_OVER email epoch differs',vp.name);check(emailAfterReset.request!==emailBeforeReset.request,'START_OVER email request differs',vp.name);check(emailAfterResetProvider.providerRequestId!==emailBeforeResetProvider.providerRequestId,'START_OVER email provider identity differs',vp.name);await page.evaluate(e=>EntryDemo.deliverEmailProviderEvidence(e),emailBeforeResetProvider);await fillCode('123456');await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'START_OVER rejects stale pre-reset provider result through ordinary email form',vp.name);await fillEmail('dev@example.com');await route('code');await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),'START_OVER accepts only fresh post-reset ordinary email result',vp.name);

    check(pageErrors.length===0,'zero page errors',vp.name);check(consoleErrors.length===0,'zero console errors',vp.name);check(network.length===0,'zero external network requests',vp.name);
    if(pageErrors.length||consoleErrors.length||network.length)failures.push({viewport:vp.name,pageErrors,consoleErrors,network});
    await context.close();
  }
  const evidence={suite:'phase-c1-j01-subject-binding',reviewer_receipt:5708896186,predecessor_builder_handoff:5708416535,security_finding:5707441287,security_followup:5708182785,canonical_predecessor_sha256:canonicalSha,generated_successor_sha256:digest(fs.readFileSync(artifact)),model_checks:modelEvidence.checks,cross_restart_replay:'wallet+email / home+invite / reload+process recreation+START_OVER / ordinary email UI-adapter path',email_result_correlation:'provider-issued opaque request identity + request+challenge+subject+destination+epoch; current S2 pending state cannot manufacture provider binding',public_path_negative:'retain valid S1 provider evidence; recreate S2 same subject+destination; inject S1 into ordinary adapter buffer; submit same code form; zero authority; fresh S2 evidence only succeeds',viewports,assertions:checks.length,screenshot_count:screenshots.length,screenshots,page_console_network_failures:failures,result:'pass'};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence));
} finally {
  if(browser)await browser.close();
  fs.writeFileSync(artifact,canonicalBytes);
  assert.equal(digest(fs.readFileSync(artifact)),canonicalSha,'approved J01 bytes restored after ephemeral successor render');
}
