import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const run=(file,args=[])=>execFileSync(process.execPath,[path.join(root,'tools',file),...args],{cwd:root,stdio:'inherit'});
run('materialize-current-state.mjs');
run('build-journey-map.mjs');
run('validate-workbench.mjs');
run('validate-current.mjs');
