import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workbench = path.resolve(here, '../..');
const j01 = pathToFileURL(path.join(workbench, 'journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html')).href;
const j04 = pathToFileURL(path.join(workbench, 'journeys/04-invite-join/phase-c1-guest-v1-candidate.html')).href;
const out = path.join(here, 'artifacts');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const viewports = [{name:'393x852',width:393,height:852},{name:'430x890',width:430,height:890}];
let assertions = 0; const screenshots=[]; const failures=[];
const check=(v,m)=>{assertions++;assert.ok(v,m)};

const browser = await chromium.launch({headless:true});
for (const vp of viewports) {
  const context = await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page = await context.newPage();
  const pageErrors=[]; const consoleErrors=[]; const external=[];
  page.on('pageerror', e=>pageErrors.push(String(e)));
  page.on('console', m=>{if(m.type()==='error') consoleErrors.push(m.text())});
  page.on('request', r=>{if(/^https?:/.test(r.url())) external.push(r.url())});
  const nav=async(url)=>{await page.goto(url,{waitUntil:'load'});await page.reload({waitUntil:'load'});};
  const snap=async(name)=>{const file=path.join(out,`${vp.name}-${name}.png`);await page.screenshot({path:file,fullPage:true});screenshots.push(path.basename(file));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);check(!overflow,`${vp.name} ${name} has no horizontal overflow`)};

  // J01: normal account path remains; invite path exposes context before J04 consent and creates no participant.
  await nav(`${j01}#root`); check(await page.locator('body').getAttribute('data-state')==='root','J01 root state'); await snap('j01-root');
  await page.click('#account-entry'); check(await page.locator('body').getAttribute('data-state')==='account','J01 account-backed entry reachable'); await page.click('#account-success'); check(await page.locator('body').getAttribute('data-outcome')==='account-home','J01 normal account path works'); await snap('j01-account');
  await nav(`${j01}#root`); await page.click('#invite-entry'); check(await page.locator('body').getAttribute('data-state')==='invite','J01 private invite context reachable'); check((await page.textContent('#invite')).includes('ledger details remain private'),'J01 private-before-join copy'); await snap('j01-invite');
  await page.click('#guest-continue'); check(await page.locator('body').getAttribute('data-state')==='handoff','J01 guest handoff reachable without account'); check((await page.textContent('#handoff-proof')).includes('No Participant exists until'),'J01 does not create member before consent'); await page.click('#handoff-done'); check(await page.locator('body').getAttribute('data-outcome')==='j04-private-invite','J01 hands context to J04'); await snap('j01-handoff');

  // J04 guest happy path: context -> explicit consent -> durable guest participant with participant-controlled authority.
  await nav(`${j04}#preview`); check(await page.locator('body').getAttribute('data-state')==='preview','J04 preview state'); check((await page.textContent('#preview')).includes('stay hidden until you join'),'J04 context-before-consent/private-before-join'); await snap('j04-preview');
  await page.click('#review-join'); check(await page.locator('body').getAttribute('data-state')==='consent','J04 explicit consent state'); const consent=await page.textContent('#consent'); check(consent.includes('without creating a full account'),'J04 guest join does not require full account'); check(consent.includes('current guest capability proof'),'J04 guest control requires current proof'); check(consent.includes('being the organizer is not enough to act as you'),'J04 organizer cannot impersonate guest'); check(consent.includes('Funding, spend signing, membership/admin'),'J04 account-gated authority is explicit'); await snap('j04-consent');
  await page.click('#confirm-guest'); check(await page.locator('body').getAttribute('data-state')==='joined','J04 durable guest created only after consent'); check(await page.textContent('#participant-id')==='grp_alps:p_7f3a','J04 stable participant ID displayed'); const joined=await page.textContent('#joined'); check(joined.includes('Read ledger · submit expense/split input'),'J04 guest read/write capability explicit'); check(joined.includes('Fund/sign spend · admin · settlement'),'J04 guest account-only boundary explicit'); check(joined.includes('saved labels alone never grant authority'),'J04 serialized capability labels are non-authoritative'); await page.click('#group-home'); check(await page.locator('body').getAttribute('data-outcome')==='guest-group-home','J04 guest reaches group home'); await snap('j04-joined');

  // Recovery continuity: participant stays stable, but executable guest authority is revalidated/rotated rather than trusted from storage.
  await nav(`${j04}#joined`); await page.click('#simulate-recovery'); check(await page.locator('body').getAttribute('data-state')==='recovery','J04 recovery path reachable'); const recovery=await page.textContent('#recovery'); check(recovery.includes('grp_alps:p_7f3a'),'recovery preserves participant ID'); check(recovery.includes('Saved capability labels are descriptive only'),'recovery does not trust serialized authority'); check(recovery.includes('writes stay blocked until current proof and policy revalidate or rotate'),'recovery re-establishes current guest authority'); check(recovery.includes('never mints a replacement member'),'recovery forbids replacement identity'); await snap('j04-recovery');

  // Link happy path is temporal: proof -> pending guest -> durable authoritative readback -> linked.
  await nav(`${j04}#joined`); await page.click('#upgrade'); check(await page.locator('body').getAttribute('data-state')==='link','J04 link entry'); check((await page.textContent('#link')).includes('does not make the link complete'),'matching proof is not terminal link success'); await page.click('#link-match'); check(await page.locator('body').getAttribute('data-state')==='link-pending','matching proof enters pending'); const pending=await page.textContent('#link-pending'); check(pending.includes('guest identity is still active') || pending.includes('guest Participant'),'guest remains valid pending'); check(pending.includes('No account-only capability is available yet'),'pending grants no account authority'); check(pending.includes('LINK-ALPS-01'),'pending binds exact link operation identity'); await snap('j04-link-pending');
  await page.click('#link-readback-success'); check(await page.locator('body').getAttribute('data-state')==='linked','verified durable binding reaches linked'); const linked=await page.textContent('#linked'); check(linked.includes('Authoritative readback confirmed the durable binding'),'linked requires durable readback'); check(linked.includes('grp_alps:p_7f3a'),'link preserves participant ID'); check(linked.includes('No second economic member'),'link does not duplicate economic membership'); await snap('j04-linked');

  // Proven pre-effect failure can safely permit a new operation because authoritative no-effect truth is established.
  await nav(`${j04}#joined`); await page.click('#upgrade'); await page.click('#link-match'); await page.click('#link-known-fail'); check(await page.locator('body').getAttribute('data-state')==='link-failed','known pre-effect failure state reachable'); const failed=await page.textContent('#link-failed'); check(failed.includes('proven before any external activation/binding effect'),'failure is explicitly no-effect'); check(failed.includes('grp_alps:p_7f3a'),'failed link preserves participant ID'); check(failed.includes('new link operation may be started'),'only proven no-effect failure permits fresh link'); await snap('j04-link-failed');

  // Possible-effect failure is unknown: preserve guest, no account caps, reconcile same operation before any fresh link.
  await nav(`${j04}#joined`); await page.click('#upgrade'); await page.click('#link-match'); await page.click('#link-timeout'); check(await page.locator('body').getAttribute('data-state')==='link-unknown','timeout becomes unknown'); const unknown=await page.textContent('#link-unknown'); check(unknown.includes('same guest Participant valid'),'unknown preserves guest identity'); check(unknown.includes('grants no account-only capability'),'unknown grants no account authority'); check(unknown.includes('read back') && unknown.includes('LINK-ALPS-01'),'unknown reconciles exact operation'); check(!unknown.includes('Start a new link operation'),'unknown offers no fresh retry'); await snap('j04-link-unknown');
  await page.click('#reconcile-link-no-effect'); check(await page.locator('body').getAttribute('data-state')==='link-no-effect','unknown can reconcile to proven no-effect'); const noEffect=await page.textContent('#link-no-effect'); check(noEffect.includes('Authoritative readback proved LINK-ALPS-01 had no effect'),'reconciliation proves no effect'); check(noEffect.includes('new link operation may now start'),'fresh operation allowed only after no-effect readback'); await snap('j04-link-no-effect');

  // Mismatch/collision fails unresolved and cannot silently merge.
  await nav(`${j04}#joined`); await page.click('#upgrade'); await page.click('#link-mismatch'); check(await page.locator('body').getAttribute('data-state')==='unresolved','J04 mismatch becomes unresolved'); check((await page.textContent('#unresolved')).includes('won’t merge'),'J04 mismatch explicitly refuses merge'); check((await page.textContent('#unresolved')).includes('Guest ledger participation remains intact'),'J04 mismatch preserves guest ledger participation'); await snap('j04-unresolved');

  // Cancellation before effect preserves guest graph.
  await nav(`${j04}#joined`); await page.click('#upgrade'); await page.click('#link-cancel'); check(await page.locator('body').getAttribute('data-state')==='link-cancelled','J04 cancelled link state reachable'); const cancelled=await page.textContent('#link-cancelled'); check(cancelled.includes('before any external effect'),'cancel is known no-effect'); check(cancelled.includes('grp_alps:p_7f3a'),'cancel preserves participant ID'); check(cancelled.includes('no account capability was granted'),'cancel grants no account authority'); await snap('j04-link-cancelled');

  // Normal account-backed join remains functional.
  await nav(`${j04}#preview`); await page.click('#sign-in'); check(await page.locator('body').getAttribute('data-state')==='account','J04 account path reachable'); await page.click('#account-join'); check(await page.locator('body').getAttribute('data-outcome')==='account-group-home','J04 account-backed join works'); check(await page.locator('body').getAttribute('data-participant-state')==='account_backed','J04 account state explicit'); await snap('j04-account');

  check(pageErrors.length===0,`${vp.name} zero page errors`); check(consoleErrors.length===0,`${vp.name} zero console errors`); check(external.length===0,`${vp.name} zero external requests`);
  if(pageErrors.length||consoleErrors.length||external.length) failures.push({viewport:vp.name,pageErrors,consoleErrors,external});
  await context.close();
}
await browser.close();
const evidence={suite:'phase-c1-guest-browser-layout',viewports,assertions,screenshot_count:screenshots.length,screenshots,page_console_network_failures:failures,result:'pass'};
fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
