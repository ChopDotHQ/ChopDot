import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const run=(file,args=[])=>execFileSync(process.execPath,[path.join(root,'tools',file),...args],{cwd:root,stdio:'inherit'});
const j18HistoryPath=path.join(root,'journeys/18-activity-notifications/source/decision-history.md');
const canonicalJ18History=fs.readFileSync(j18HistoryPath,'utf8');
if(!canonicalJ18History.includes('**Coverage:**')) throw new Error('Canonical J18 decision history snapshot must use current structured format');

const authorityOverlayPaths=[
  'registry/progress.json',
  'registry/active-candidate.json',
  'START_HERE.md',
  'GOLDEN_SCREENS.md'
];
const authorityOverlay=new Map(authorityOverlayPaths.map(p=>[p,fs.readFileSync(path.join(root,p))]));

run('reset-post-j17-replay-baseline.mjs');
run('materialize-current-state.mjs');
run('materialize-savings-review-candidates.mjs');
run('apply-savings-golden-freeze.mjs');
fs.mkdirSync(path.dirname(j18HistoryPath),{recursive:true});
fs.writeFileSync(j18HistoryPath,canonicalJ18History);
run('materialize-j18-j19.mjs');
run('apply-j18-golden-j19-current.mjs');
run('validate-j18-j19.mjs');
run('apply-j19-golden-j20-current.mjs');
run('decision-history.mjs');
run('build-journey-map.mjs');
run('build-golden-manifest.mjs');
run('validate-workbench.mjs');
run('validate-j19-j20.mjs');

for(const [relative,bytes] of authorityOverlay){
  const target=path.join(root,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,bytes);
}

const liveProgressBytes=authorityOverlay.get('registry/progress.json');
const liveProgress=JSON.parse(liveProgressBytes.toString('utf8'));
const newerThanJ20=Number(liveProgress.golden_count)>=21;
if(newerThanJ20){
  const compat={...liveProgress,last_approved_journey:'20'};
  fs.writeFileSync(path.join(root,'registry/progress.json'),JSON.stringify(compat,null,2)+'\n');
}
run('apply-j20-golden-j21-current.mjs');
if(newerThanJ20) fs.writeFileSync(path.join(root,'registry/progress.json'),liveProgressBytes);

run('apply-j21-golden-j22-current.mjs');
run('apply-j22-golden-j23-current.mjs');
run('apply-j23-golden-j24-current.mjs');
run('apply-j24-golden-j25-current.mjs');
run('bind-j24-qa.mjs');
run('apply-j25-golden-j26-current.mjs');
run('bind-j25-qa.mjs');
run('apply-j26-golden-j27-current.mjs');
run('bind-j26-qa.mjs');
run('apply-j27-golden-j28-current.mjs');
run('decision-history.mjs');
run('build-journey-map.mjs');
run('build-golden-manifest.mjs');
run('validate-workbench.mjs');
run('validate-current-authority.mjs');
run('decision-history.mjs',['--check']);
run('build-golden-manifest.mjs',['--check']);
