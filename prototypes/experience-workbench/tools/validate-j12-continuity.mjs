import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const j='journeys/12-complete-settlement';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const hash=s=>createHash('sha256').update(s).digest('hex');
const current=read(`${j}/v1.1-continuity-candidate.html`), prior=read(`${j}/v1-golden-candidate.html`);
const report=json(`${j}/CONTINUITY_QA.json`);
assert.equal(hash(current),report.artifact_sha256,'QA must describe the exact candidate');
const css=s=>s.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1];
assert.equal(css(current),css(prior),'Do not redesign inherited styles');
const ids=s=>[...s.matchAll(/<section\b[^>]*class="[^"]*\bscreen\b[^"]*"[^>]*\bid="([^"]+)"/g)].map(x=>x[1]);
assert.deepEqual(ids(current),ids(prior),'No added or removed screen');
const maps=json(`${j}/UI_EVENT_MAPPING.json`), screens=json(`${j}/SCREEN_STATE_MAPPING.json`);
assert.equal(screens.length,67);
for(const a of maps){
 assert.equal(a.context_policy,'preserve-payment-method-currency-source-result-viewer');
 if(a.domain_event==='PaymentStatusRefreshRequested'){
  assert.equal(a.href,'#'+a.screen,'Refresh fallback must not impersonate the recipient');
  assert.equal(a.result_resolver,'accepted-status-only');
 }
 if(['PaymentRetryRequested','PaymentMethodSelectionOpened'].includes(a.domain_event))assert.equal(a.required_outcome,'verified-not-executed');
}
for(const f of ['continuity-model.cjs','continuity-ui.js'])assert(current.includes(read(`${j}/source/${f}`)),'HTML and structured source drift');
const models=execFileSync(process.execPath,[path.join(root,j,'source/test-continuity.cjs')],{encoding:'utf8'});
assert(models.includes('"checks":30'));
assert(report.ok && report.clicked_paths===20 && report.clicked_actions===174 && report.layout_checks===134);
for(const group of report.checks){assert(group.ok);assert.equal(group.artifact_sha256,hash(current));assert(group.cases.every(x=>x.passed));assert.equal(group.console_errors.length,0);}
for(const layout of report.layout){assert(layout.ok);assert.equal(layout.sha256,hash(current));assert(layout.checks.every(x=>x.passed));}
const golden=read('journeys/11-settle-up/v1.1-golden-candidate.html');
assert.equal(hash(golden),'d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d');
const progress=json('registry/progress.json');assert.equal(progress.golden_count,9);assert.equal(progress.current_journey,'12');
const result={ok:true,artifact_sha256:hash(current),screens:67,screens_added:0,inherited_css_unchanged:true,payment_context_preserved:true,payer_refresh_read_only:true,unknown_timeout_requires_recovery:true,model_checks:30,clicked_paths:20,clicked_actions:174,layout_checks:134,journey_11_sha256:hash(golden),review_status:'review-pending'};
fs.writeFileSync(path.join(root,j,'continuity-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log('J12 CONTINUITY GATE PASSED: same 67 screens, 30 model checks, exact-artifact browser evidence.');
