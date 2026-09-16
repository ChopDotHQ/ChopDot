import { cpSync, mkdirSync, rmSync } from 'node:fs';

const out = 'gate-a-dist';
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/prototypes/integrated-product-preview-v2`, { recursive: true });
mkdirSync(`${out}/prototypes/experience-workbench/journeys`, { recursive: true });

cpSync('prototypes/integrated-product-preview-v2', `${out}/prototypes/integrated-product-preview-v2`, { recursive: true });
cpSync('prototypes/experience-workbench/journeys/01-enter-chopdot', `${out}/prototypes/experience-workbench/journeys/01-enter-chopdot`, { recursive: true });
cpSync('prototypes/experience-workbench/journeys/02-home-orientation', `${out}/prototypes/experience-workbench/journeys/02-home-orientation`, { recursive: true });

console.log('Packaged Golden-faithful V2 Gate A review slice.');
