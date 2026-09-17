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
    const walletProviderEvidence=()=>page.evaluate(()=>EntryDemo.walletProviderEvidence());
    const startEmail=async destination=>{await page.evaluate(d=>EntryDemo.fixture(d==='invite'?'invite':'new'),destination);await page.locator('[data-action=EMAIL]').first().click();await fillEmail('dev@example.com');await route('code');};
    const startWallet=async(destination,account='Everyday')=>{await page.evaluate(d=>EntryDemo.fixture(d==='invite'?'invite':'new'),destination);await page.locator('[data-action=WALLET]').first().click();await page.locator(`[data-account=${account}]`).click();await route('approval-waiting');};
    const ordinaryWalletResult=async(evidence,result='approved')=>{await page.evaluate(e=>EntryDemo.deliverWalletProviderEvidence(e),evidence);await page.evaluate(r=>document.querySelector(`[data-demo-result="${r}"]`).click(),result);};

    // Existing A -> B subject binding remains closed, including Back/Forward and direct-hash entry.
    await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>EntryDemo.fixture('returning'));await route('email');await fillEmail('dev@example.com');await route('code');
    const proofA=await emailProof();await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryModel.verificationCurrent(EntryDemo.get())),'A proof current at Ready',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:dev@example.com','A exact subject bound',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedEpoch))===proofA.epoch,'A proof bound to current epoch',vp.name);await snap('ready-subject-a');await noOverflow('ready A');
    await page.goBack();await page.waitForTimeout(40);await route('code');await page.goBack();await page.waitForTimeout(40);await route('email');await page.locator('#email').fill('other@example.com');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'subject edit revokes verification immediately',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='home','navigation intent preserved while authority revoked',vp.name);await snap('subject-mutated-fail-closed');
    await page.goForward();await page.waitForTimeout(40);await route('code');await page.goForward();await page.waitForTimeout(40);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'Forward cannot restore prior-subject authority',vp.name);
    await page.evaluate(([p])=>EntryDemo.dispatch('VERIFY_CODE',{code:'123456',...p}),[proofA]);await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale A proof rejected for B',vp.name);
    await fillEmail('other@example.com');await route('code');const proofB=await emailProof();check(proofB.subject==='email:other@example.com','fresh request bound to B',vp.name);check(proofB.request!==proofA.request,'fresh request rotates proof identity',vp.name);check(proofB.epoch===proofA.epoch,'same document retains one non-reusable epoch while requests rotate',vp.name);await fillCode('123456');await route('profile');await page.locator('#name').fill('Other');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='email:other@example.com','Ready uses fresh B proof',vp.name);await snap('fresh-subject-b-ready');
    await page.goto('about:blank');await page.goto(`${url}#ready/invite`,{waitUntil:'load'});await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'direct Ready hash starts unverified',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination retained as navigation intent',vp.name);await noOverflow('direct-hash fail closed');

    // Profile is presentation-only and cannot rebind authenticated authority.
    await page.evaluate(()=>EntryDemo.fixture('invite'));await page.locator('[data-action=EMAIL]').first().click();await fillEmail('sam@example.com');await fillCode('123456');await route('profile');const subjectBefore=await page.evaluate(()=>EntryDemo.get().verifiedSubject);const epochBefore=await page.evaluate(()=>EntryDemo.get().verifiedEpoch);await page.locator('#name').fill('Sam Display');await page.locator('button[form=profile-form]').click();await route('ready');check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))===subjectBefore,'profile mutation cannot rebind proof subject',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedEpoch))===epochBefore,'profile mutation cannot rebind proof epoch',vp.name);check((await page.evaluate(()=>EntryDemo.get().destination))==='invite','invite destination survives same-subject verification',vp.name);await snap('invite-profile-bound');

    // Reviewer 5710375251: wallet provider identity is fixed before result consumption; current pending S2 cannot manufacture it.
    await page.goto(url,{waitUntil:'load'});await startWallet('home');const issued=await walletProviderEvidence();check(typeof issued?.providerRequestId==='string','wallet attempt gets opaque provider identity before result',vp.name);check(issued.request===(await page.evaluate(()=>EntryDemo.get().pendingRequest)),'wallet provider identity binds exact request',vp.name);const manufactured=await page.evaluate(()=>EntryModel.walletApprovalResult(EntryDemo.get(),'approved'));check(!Object.hasOwn(manufactured,'request'),'current wallet state cannot manufacture provider result binding',vp.name);await page.evaluate(()=>EntryDemo.dispatch('APPROVAL_RESULT',{request:EntryDemo.get().request,result:'approved'}));await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'incomplete wallet result mints zero authority',vp.name);

    // Account switch: stale Everyday result delivered through the same ordinary adapter seam cannot become Travel authority.
    await page.goto(url,{waitUntil:'load'});await startWallet('invite','Everyday');const everyday=await walletProviderEvidence();await page.evaluate(()=>EntryDemo.dispatch('REQUEST_APPROVAL',{account:'Travel'}));await route('approval-waiting');const travel=await walletProviderEvidence();check(travel.request!==everyday.request,'account switch rotates wallet request identity',vp.name);check(travel.providerRequestId!==everyday.providerRequestId,'account switch rotates wallet provider attempt identity',vp.name);await ordinaryWalletResult(everyday,'approved');await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'stale Everyday result cannot authorize Travel',vp.name);await ordinaryWalletResult(travel,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),'fresh Travel provider result accepted',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedSubject))==='wallet:travel','fresh result bound to exact account subject',vp.name);check((await page.evaluate(()=>EntryDemo.get().verifiedDestination))==='invite','fresh result bound to exact invite destination',vp.name);await snap('wallet-account-bound');

    // Cross-restart ordinary-path replay: retain S1 evidence, recreate S2, inject S1 into ordinary adapter buffer, then click the ordinary result control.
    for(const destination of ['home','invite']){
      await page.goto(url,{waitUntil:'load'});await startWallet(destination);const w1=await walletProviderEvidence();await ordinaryWalletResult(w1,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),`S1 wallet ${destination} result valid through ordinary seam`,vp.name);
      if(destination==='home')await page.reload({waitUntil:'load'});else{await page.goto('about:blank');await page.goto(url,{waitUntil:'load'});}
      await startWallet(destination);const w2=await walletProviderEvidence();check(w2.epoch!==w1.epoch,`wallet ${destination} restart epoch differs`,vp.name);check(w2.request!==w1.request,`wallet ${destination} restart request differs`,vp.name);check(w2.providerRequestId!==w1.providerRequestId,`wallet ${destination} restart provider identity differs`,vp.name);
      await ordinaryWalletResult(w1,'approved');await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),`stale S1 wallet ${destination} ordinary result mints zero S2 authority`,vp.name);
      await ordinaryWalletResult(w2,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),`fresh S2 wallet ${destination} ordinary result accepted`,vp.name);

      // Retain the accepted email sibling on the exact same restart family.
      await page.goto(url,{waitUntil:'load'});await startEmail(destination);const e1=await emailProof();const e1Provider=await emailProviderEvidence();const e1Result=await emailResult();check(e1Provider?.providerRequestId===e1Result.providerRequestId,`S1 email ${destination} result carries issued provider request identity`,vp.name);await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),`S1 email ${destination} provider result valid on ordinary form`,vp.name);
      if(destination==='home')await page.reload({waitUntil:'load'});else{await page.goto('about:blank');await page.goto(url,{waitUntil:'load'});}
      await startEmail(destination);const e2=await emailProof();const e2Provider=await emailProviderEvidence();check(e2.epoch!==e1.epoch,`email ${destination} restart epoch differs`,vp.name);check(e2.request!==e1.request,`email ${destination} restart request identity differs`,vp.name);check(e2.challenge===e1.challenge,`email ${destination} reset challenge may collide without freshness`,vp.name);check(e2Provider.providerRequestId!==e1Provider.providerRequestId,`email ${destination} provider identity differs after restart`,vp.name);
      const manufacturedEmail=await page.evaluate(()=>EntryModel.emailVerificationResult(EntryDemo.get(),'123456'));check(!Object.hasOwn(manufacturedEmail,'request'),`current S2 pending state cannot manufacture ${destination} email provider binding`,vp.name);await page.evaluate(e=>EntryDemo.deliverEmailProviderEvidence(e),e1Provider);await fillCode('123456');await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),`stale S1 email ${destination} ordinary result mints zero S2 authority`,vp.name);await fillEmail('dev@example.com');await route('code');const e2FreshProvider=await emailProviderEvidence();check(e2FreshProvider.providerRequestId!==e1Provider.providerRequestId,`fresh S2 ${destination} email provider identity remains distinct`,vp.name);await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),`fresh S2 email ${destination} ordinary result accepted`,vp.name);
    }

    // Stale approved/declined/unknown ordering cannot be rebound to a fresh S2 attempt.
    for(const staleResult of ['approved','declined','unknown']){
      await page.goto(url,{waitUntil:'load'});await startWallet('home');const stale=await walletProviderEvidence();await page.evaluate(()=>EntryDemo.dispatch('START_OVER'));await route('welcome');await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();await route('approval-waiting');const fresh=await walletProviderEvidence();await ordinaryWalletResult(stale,staleResult);await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),`stale ${staleResult} result mints zero authority`,vp.name);
      if(staleResult==='unknown'){await ordinaryWalletResult(fresh,'unknown');await route('approval-unknown');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'fresh unknown remains unverified',vp.name);await ordinaryWalletResult(fresh,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),'same fresh attempt may resolve unknown to approved',vp.name);}
    }

    // START_OVER/cancel boundaries through the ordinary wallet seam.
    await page.goto(url,{waitUntil:'load'});await startWallet('home');const beforeReset=await walletProviderEvidence();await page.evaluate(()=>EntryDemo.dispatch('START_OVER'));await route('welcome');await page.locator('[data-action=WALLET]').first().click();await page.locator('[data-account=Everyday]').click();await route('approval-waiting');const afterReset=await walletProviderEvidence();check(afterReset.epoch!==beforeReset.epoch,'START_OVER rotates wallet epoch',vp.name);check(afterReset.request!==beforeReset.request,'START_OVER rotates wallet request',vp.name);check(afterReset.providerRequestId!==beforeReset.providerRequestId,'START_OVER rotates wallet provider attempt',vp.name);await ordinaryWalletResult(beforeReset,'approved');await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'START_OVER rejects stale wallet result through ordinary seam',vp.name);await ordinaryWalletResult(afterReset,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),'START_OVER accepts only fresh wallet result',vp.name);

    await page.goto(url,{waitUntil:'load'});await startWallet('home');const beforeCancel=await walletProviderEvidence();await page.locator('[data-action=CANCEL_APPROVAL]').click();await route('wallet');await page.locator('[data-account=Everyday]').click();await route('approval-waiting');const afterCancel=await walletProviderEvidence();check(afterCancel.request!==beforeCancel.request,'cancel rotates wallet request',vp.name);check(afterCancel.providerRequestId!==beforeCancel.providerRequestId,'cancel rotates wallet provider attempt',vp.name);await ordinaryWalletResult(beforeCancel,'approved');await route('approval-waiting');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'cancel rejects delayed old wallet result',vp.name);await ordinaryWalletResult(afterCancel,'approved');check(await page.evaluate(()=>EntryDemo.get().verified),'fresh post-cancel wallet result accepted',vp.name);

    // START_OVER retained email sibling through the ordinary result path.
    await page.goto(url,{waitUntil:'load'});await startEmail('home');const emailBeforeResetProvider=await emailProviderEvidence();const emailBeforeReset=await emailResult();await page.evaluate(()=>EntryDemo.dispatch('START_OVER'));await route('welcome');await page.locator('[data-action=EMAIL]').first().click();await fillEmail('dev@example.com');await route('code');const emailAfterReset=await emailProof();const emailAfterResetProvider=await emailProviderEvidence();check(emailAfterReset.epoch!==emailBeforeReset.epoch,'START_OVER email epoch differs',vp.name);check(emailAfterReset.request!==emailBeforeReset.request,'START_OVER email request differs',vp.name);check(emailAfterResetProvider.providerRequestId!==emailBeforeResetProvider.providerRequestId,'START_OVER email provider identity differs',vp.name);await page.evaluate(e=>EntryDemo.deliverEmailProviderEvidence(e),emailBeforeResetProvider);await fillCode('123456');await route('email');check(!(await page.evaluate(()=>EntryDemo.get().verified)),'START_OVER rejects stale pre-reset provider result through ordinary email form',vp.name);await fillEmail('dev@example.com');await route('code');await fillCode('123456');await route('ready');check(await page.evaluate(()=>EntryDemo.get().verified),'START_OVER accepts only fresh post-reset ordinary email result',vp.name);

    check(pageErrors.length===0,'zero page errors',vp.name);check(consoleErrors.length===0,'zero console errors',vp.name);check(network.length===0,'zero external network requests',vp.name);
    if(pageErrors.length||consoleErrors.length||network.length)failures.push({viewport:vp.name,pageErrors,consoleErrors,network});
    await context.close();
  }
  const evidence={suite:'phase-c1-j01-subject-binding',reviewer_receipt:5710375251,predecessor_builder_handoff:5709655452,security_finding:5709874182,security_packet_delta:5709280243,canonical_predecessor_sha256:canonicalSha,generated_successor_sha256:digest(fs.readFileSync(artifact)),model_checks:modelEvidence.checks,cross_restart_replay:'wallet+email / home+invite / reload+process recreation+START_OVER+cancel / ordinary UI-adapter paths',wallet_result_correlation:'provider-issued opaque attempt identity + request+challenge+subject/account+destination+epoch; APPROVAL_RESULT synthesizes no missing S2 authority fields',public_path_negative:'retain valid S1 wallet provider evidence; recreate S2 same subject+destination; inject S1 into ordinary adapter buffer; ordinary result control mints zero S2 authority; fresh S2 evidence only succeeds',stale_result_ordering:'approved+declined+unknown stale S1 results all remain fail-closed; fresh S2 unknown may resolve only with the same fresh S2-bound evidence',inherited_identity_continuity:'J04/J27/J28 consume only current verified subject/session; no new join/payment authority',viewports,assertions:checks.length,screenshot_count:screenshots.length,screenshots,page_console_network_failures:failures,result:'pass'};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence));
} finally {
  if(browser)await browser.close();
  fs.writeFileSync(artifact,canonicalBytes);
  assert.equal(digest(fs.readFileSync(artifact)),canonicalSha,'approved J01 bytes restored after ephemeral successor render');
}
