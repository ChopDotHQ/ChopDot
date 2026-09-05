import process from 'node:process';
import {parseArgument, verifyEnvironmentAnchors} from './lib/release-evidence.mjs';

const environment = parseArgument('environment');
if (!environment) throw new Error('Pass --environment=devnet or --environment=paseo-next-v2.');
const verified = await verifyEnvironmentAnchors(process.cwd(), environment);
console.log(JSON.stringify({
  status: 'pass',
  mode: 'read-only',
  writeEnabled: false,
  environment: verified.evidence,
}, null, 2));
