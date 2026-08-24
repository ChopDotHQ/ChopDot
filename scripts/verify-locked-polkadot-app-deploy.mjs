import process from 'node:process';
import {withIsolatedDeploymentRuntime} from './lib/release-evidence.mjs';

const evidence = await withIsolatedDeploymentRuntime(process.cwd());
console.log(JSON.stringify({status: 'pass', scope: 'fresh-isolated-deployment-runtime', ...evidence}, null, 2));
