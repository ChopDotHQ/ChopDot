import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),j='journeys/09-manage-people';
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),json=p=>JSON.parse(read(p));
const hash=s=>createHash('sha256').update(s).digest('hex');
const a=json('registry/support-candidate.json'),qa=json(`${j}/QA_SUMMARY.json`),b=json(`${j}/visual-qa/browser-qa.json`);
const html=read(`${j}/v1-candidate.html`),sha=hash(html);
assert.equal(sha,'715077633a17cf37ef587988c0aee7f4906403a030d8e0d17d1b0c46aa6cb37d');
assert.equal(a.journey,'09');assert.equal(a.prototype_sha256,sha);assert.equal(qa.artifact_sha256,sha);assert.equal(b.artifact_sha256,sha);
const css=s=>s.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1];
assert.equal(css(html),css(read('journeys/01-enter-chopdot/v1-candidate.html')),'Inherited Golden stylesheet changed');
assert.equal(hash(css(html)),qa.inherited_css_sha256);
for(const source of ['model.cjs','ui.js'])assert(html.includes(read(`${j}/source/${source}`)),'Inline HTML/source drift');
const result=JSON.parse(execFileSync(process.execPath,[path.join(root,j,'source/test-model.cjs')],{encoding:'utf8'}));
assert(result.ok);assert.equal(result.checks,67);
assert(qa.ok&&b.ok);assert.equal(b.scenarios,32);assert.equal(b.clicks,110);assert.equal(b.layout_checks,36);
assert.equal(b.checks.length,32);assert(b.checks.every(c=>c.passed));assert.deepEqual(b.page_errors,[]);
assert.equal(b.layouts.length,36);assert(b.layouts.every(c=>c.passed&&c.nonblank&&!c.overflow&&!c.headerOverlap&&!c.footerOverlap&&c.footerVisible&&c.clipped===0));
const screens=json(`${j}/SCREEN_STATE_MAPPING.json`),actions=json(`${j}/UI_EVENT_MAPPING.json`);
assert.equal(screens.length,18);assert.equal(new Set(screens.map(s=>s.screen)).size,18);assert.equal(actions.length,87);
for(const action of actions){assert(action.domain_event&&action.guard);assert(screens.some(s=>s.screen===action.route));}
for(const doc of ['spec.md','STATE_AND_AUTHORITY.md','GIVEN_WHEN_THEN.md','UI_TO_DOMAIN_EVENTS.md','STATE_INVENTORY.md','VISUAL_QA.md'])assert(read(`${j}/${doc}`).trim().length>100);
// Historical review-stage assertions; final approvals and progress are checked after all overlays.
const journeys=json('registry/journeys.json'),p=json('registry/progress.json');
assert.equal(p.golden_count,11);assert.equal(p.current_journey,'09');assert.equal(p.remaining_overall,17);
assert.equal(journeys.find(x=>x.id==='01').golden_number,11);assert.equal(journeys.find(x=>x.id==='01').status,'golden');
assert.equal(journeys.find(x=>x.id==='09').status,'current');assert.equal(journeys.find(x=>x.id==='09').approval,'review-pending');
const locks=json('registry/golden-artifact-locks.json');
assert(locks.length===11||locks.length===12,'Unexpected Golden lock count');
if(locks.length===12){assert.equal(json('registry/approvals/09-v1.json').prototype_sha256,sha);assert.equal(locks.find(x=>x.journey==='09')?.sha256,sha);}
for(const lock of locks)assert.equal(hash(read(lock.path)),lock.sha256,`Golden changed: ${lock.path}`);
assert.equal(json('registry/approvals/01-v1.json').deferred_note.change_now,false);
const validation={ok:true,candidate_sha256:sha,states:18,model_assertions:67,browser_scenarios:32,product_clicks:110,state_layout_checks:36,mapped_actions:87,inherited_css_unchanged:true,all_golden_locks_pass:true,golden_count:11,current_journey:'09',review_status:'review-pending',typography_note:'TYPO-01 deferred',limitations:'Simulated data and Playwright inline Chromium. Boundary previews are not cross-journey execution; no real service, payment, invitation or backend integration.'};
fs.writeFileSync(path.join(root,j,'validation.json'),JSON.stringify(validation,null,2)+'\n');
console.log('J09 historical QA passed: 67 model assertions and checksum-bound browser evidence. Final approval checked by j09:freeze-check.');
