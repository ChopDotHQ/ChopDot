import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const out = 'gate-a-dist';
const j01 = 'prototypes/experience-workbench/journeys/01-enter-chopdot';
const expectedJ01Sha256 = '97f3da489c78cb842c354390b2e354397a6a6c3843228ec9928efebaf21089e8';

// Gate A must render the exact human-approved J01 successor, not the stale
// predecessor HTML checked into the Golden workbench. Build the browser artifact
// from the approved source material, then fail closed if its bytes drift.
execFileSync(process.execPath, [`${j01}/source/build.mjs`], { stdio: 'inherit' });
const generatedJ01 = readFileSync(`${j01}/v1-candidate.html`);
const actualJ01Sha256 = createHash('sha256').update(generatedJ01).digest('hex');
if (actualJ01Sha256 !== expectedJ01Sha256) {
  throw new Error(`Gate A J01 checksum mismatch: expected ${expectedJ01Sha256}, got ${actualJ01Sha256}`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/prototypes/integrated-product-preview-v2`, { recursive: true });
mkdirSync(`${out}/prototypes/experience-workbench/journeys`, { recursive: true });

cpSync('prototypes/integrated-product-preview-v2', `${out}/prototypes/integrated-product-preview-v2`, { recursive: true });
cpSync(j01, `${out}/prototypes/experience-workbench/journeys/01-enter-chopdot`, { recursive: true });
cpSync('prototypes/experience-workbench/journeys/02-home-orientation', `${out}/prototypes/experience-workbench/journeys/02-home-orientation`, { recursive: true });
cpSync('prototypes/experience-workbench/journeys/03-create-group', `${out}/prototypes/experience-workbench/journeys/03-create-group`, { recursive: true });
cpSync('prototypes/experience-workbench/journeys/05-add-expense', `${out}/prototypes/experience-workbench/journeys/05-add-expense`, { recursive: true });

console.log(`Packaged Golden-faithful V2 Gate A guest-starter slice with approved J01 ${actualJ01Sha256}.`);
