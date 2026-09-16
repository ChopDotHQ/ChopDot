import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('./app.js');
const html = read('./index.html');

const requiredSources = [
  '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
];

for (const source of requiredSources) {
  if (!app.includes(source)) throw new Error(`Missing canonical Gate A source: ${source}`);
}

if (!html.includes('id="product-frame"')) throw new Error('Golden host iframe missing');
if (!app.includes("state.route === 'home-reference' && state.verified")) {
  throw new Error('J01 verified handoff to real J02 is not explicit');
}

const forbiddenV1Shortcuts = [
  'Continue as guest',
  'Use existing account',
  'participant-devinson-001',
  "['⌂','◎','◴','◉'",
];
for (const token of forbiddenV1Shortcuts) {
  if (app.includes(token) || html.includes(token)) throw new Error(`V1 shortcut leaked into V2: ${token}`);
}

console.log('Gate A structural fidelity validation passed.');
