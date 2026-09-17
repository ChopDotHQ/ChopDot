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

for (const copy of ['ChopDot', 'Share &amp; chop.', 'Try as guest', 'Create account', 'Already have an account?', 'Sign in']) {
  if (!html.includes(copy)) throw new Error(`Missing approved front-door copy: ${copy}`);
}

const forbiddenWelcomeCopy = [
  'Bring your people.',
  'Keep things clear.',
  'Start with an email. No wallet needed.',
  'Continue as guest',
  'Use existing account',
];
for (const token of forbiddenWelcomeCopy) {
  if (html.includes(token)) throw new Error(`Rejected welcome copy leaked into Gate A front door: ${token}`);
}

if (!html.includes('id="front-door"')) throw new Error('Minimal front door missing');
if (!html.includes('id="product-frame"')) throw new Error('Golden host iframe missing');
if (!app.includes("state.route === 'home-reference' && state.verified")) {
  throw new Error('J01 verified handoff to real J02 is not explicit');
}
if (!app.includes("openHome(null, 'guest')")) throw new Error('Guest entrance to Home is not explicit');
if (!app.includes("event.target.closest('.start,.add-tab')")) throw new Error('Guest start-splitting account boundary is not explicit');
if (!app.includes('.entry-demobadge,.entry-demohelp{display:none!important}')) throw new Error('Reviewer/demo chrome is not hidden in product mode');

const forbiddenV1Shortcuts = [
  'participant-devinson-001',
  "['⌂','◎','◴','◉'",
];
for (const token of forbiddenV1Shortcuts) {
  if (app.includes(token) || html.includes(token)) throw new Error(`V1 shortcut leaked into V2: ${token}`);
}

console.log('Gate A minimal front-door structural validation passed.');
