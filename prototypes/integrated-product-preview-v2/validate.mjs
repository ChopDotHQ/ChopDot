import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('./app.js');
const html = read('./index.html');
const guest = read('./guest-invite.html');

const requiredSources = [
  '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
  './guest-invite.html',
];

for (const source of requiredSources) {
  if (!app.includes(source)) throw new Error(`Missing Gate A source: ${source}`);
}

if (!html.includes('id="product-frame"')) throw new Error('Golden host iframe missing');
if (!app.includes("state.route === 'home-reference' && state.verified")) {
  throw new Error('J01 verified handoff to real J02 is not explicit');
}
if (!app.includes('.entry-demobadge{display:none!important}')) {
  throw new Error('Reviewer Demo chrome is not hidden in normal product mode');
}
if (!app.includes("doc.body.dataset.homeFixture = 'first-use'")) {
  throw new Error('New-person J02 first-use adaptation is missing');
}
if (!guest.includes('Geneva Weekend') || !guest.includes('Devinson invited you · 3 people · CHF')) {
  throw new Error('Guest invite fixture does not match canonical J01 invite context');
}
if (!guest.includes("data-participant-created=\"false\"")) {
  throw new Error('C1 guest page does not fail closed on participant creation');
}

const forbiddenV1Shortcuts = [
  'Continue as guest',
  'Use existing account',
  'participant-devinson-001',
  "['⌂','◎','◴','◉'",
  'phase-c1-guest-v1-candidate.html',
  'Alps weekend',
  'Maya',
];
for (const token of forbiddenV1Shortcuts) {
  if (app.includes(token) || html.includes(token) || guest.includes(token)) {
    throw new Error(`Deprecated or incoherent Gate A token leaked into V2: ${token}`);
  }
}

console.log('Gate A structural continuity/fidelity validation passed.');
