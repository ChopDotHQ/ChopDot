import process from 'node:process';
import {createRuntimeSecurityEvidence} from './lib/runtime-security-evidence.mjs';

console.log(JSON.stringify(await createRuntimeSecurityEvidence(process.cwd()), null, 2));
