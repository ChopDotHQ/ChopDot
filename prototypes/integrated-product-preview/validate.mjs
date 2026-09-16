import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JOURNEYS, JOURNEY_BY_ID, JOURNEY_BY_SLUG } from './journeys.js';

const here = dirname(fileURLToPath(import.meta.url));
const required = ['index.html','styles.css','journeys.js','state.js','platform.js','app.js','browser-qa.mjs'];
for (const file of required) readFileSync(resolve(here, file), 'utf8');

for (const file of ['journeys.js','state.js','platform.js','app.js','browser-qa.mjs','validate.mjs']) {
  execFileSync(process.execPath, ['--check', resolve(here, file)], { stdio: 'inherit' });
}

if (JOURNEYS.length !== 28) throw new Error(`Expected 28 journeys, found ${JOURNEYS.length}`);
const ids = new Set(JOURNEYS.map((j) => j.id));
const slugs = new Set(JOURNEYS.map((j) => j.slug));
if (ids.size !== 28 || slugs.size !== 28) throw new Error('Journey IDs and slugs must be unique');
for (let i = 1; i <= 28; i++) {
  const id = String(i).padStart(2, '0');
  if (!JOURNEY_BY_ID.has(id)) throw new Error(`Missing journey ${id}`);
}
for (const journey of JOURNEYS) {
  if (!JOURNEY_BY_SLUG.has(journey.slug)) throw new Error(`Missing slug index for ${journey.slug}`);
  for (const next of journey.next) if (!ids.has(next)) throw new Error(`J${journey.id} points to missing J${next}`);
}

const app = readFileSync(resolve(here, 'app.js'), 'utf8');
for (const journey of JOURNEYS) {
  if (!app.includes(`${journey.slug}:`) && !app.includes(`'${journey.slug}':`)) {
    throw new Error(`No view renderer registered for J${journey.id} ${journey.slug}`);
  }
}

const html = readFileSync(resolve(here, 'index.html'), 'utf8');
if (!html.includes('./app.js') || !html.includes('./styles.css')) throw new Error('Entry point missing preview assets');

console.log(`Integrated Product Preview validation passed: ${JOURNEYS.length}/28 journeys, all routes and syntax checks green.`);
