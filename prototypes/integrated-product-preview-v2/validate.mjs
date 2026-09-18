import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('./app.js');
const html = read('./index.html');

const requiredSources = [
  '../experience-workbench/journeys/01-enter-chopdot/v1-candidate.html',
  '../experience-workbench/journeys/01-enter-chopdot/phase-c1-guest-v1-candidate.html',
  '../experience-workbench/journeys/02-home-orientation/v1.4-inherited-icons.html',
  '../experience-workbench/journeys/03-create-group/v2-golden-candidate.html',
  '../experience-workbench/journeys/05-add-expense/source/core.html#entry',
];

for (const source of requiredSources) {
  if (!app.includes(source)) throw new Error(`Missing canonical Gate A dependency: ${source}`);
}

for (const copy of ['ChopDot', 'Share &amp; chop.', 'Continue as guest', 'Create account', 'Already have an account?', 'Sign in']) {
  if (!html.includes(copy)) throw new Error(`Missing approved front-door copy: ${copy}`);
}

for (const copy of ['Ready to share?', 'Create your ChopDot account to invite people.', "Everything you've done stays."]) {
  if (!html.includes(copy)) throw new Error(`Missing approved guest-conversion copy: ${copy}`);
}

const forbiddenWelcomeCopy = [
  'Bring your people.',
  'Keep things clear.',
  'Start with an email. No wallet needed.',
  'Try as guest',
  'Use existing account',
];
for (const token of forbiddenWelcomeCopy) {
  if (html.includes(token)) throw new Error(`Rejected welcome copy leaked into Gate A front door: ${token}`);
}

if (!html.includes('id="front-door"')) throw new Error('Minimal front door missing');
if (!html.includes('id="account-wall"')) throw new Error('Guest account-conversion wall missing');
if (!html.includes('id="product-frame"')) throw new Error('Golden host iframe missing');
if (!app.includes("state.route === 'home-reference' && state.verified")) {
  throw new Error('J01 verified handoff to real J02 is not explicit');
}
if (!app.includes("openHome(null, 'guest')")) throw new Error('Guest entrance to Home is not explicit');
if (!app.includes("openGuestCreateGroup")) throw new Error('Guest local group creation handoff missing');
if (!app.includes("openGuestExpense")) throw new Error('Guest local expense handoff missing');
if (!app.includes("showAccountWall()")) throw new Error('Invite/share account boundary missing');
if (!app.includes("Saved on this device")) throw new Error('Local-only truth is not explicit');
if (!app.includes("saveGuestState({ accountCreated: true })")) throw new Error('Guest-to-account preservation marker missing');
if (!app.includes('.entry-demobadge,.entry-demohelp{display:none!important}')) throw new Error('Reviewer/demo chrome is not hidden in product mode');

const forbiddenV1Shortcuts = [
  'participant-devinson-001',
  "['⌂','◎','◴','◉'",
];
for (const token of forbiddenV1Shortcuts) {
  if (app.includes(token) || html.includes(token)) throw new Error(`V1 shortcut leaked into V2: ${token}`);
}

console.log('Gate A guest-first structural validation passed.');
