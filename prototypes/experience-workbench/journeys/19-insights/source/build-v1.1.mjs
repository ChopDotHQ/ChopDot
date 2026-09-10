import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const journeyDir = path.resolve(import.meta.dirname, '..');
const reviewDir = path.join(journeyDir, 'review-v1.1');
const basePath = path.join(journeyDir, 'v1-candidate.html');
const outPath = path.join(reviewDir, 'v1.1-candidate.html');

const base = fs.readFileSync(basePath, 'utf8');
fs.mkdirSync(reviewDir, { recursive: true });

const svg = (body, extra = '') => `<svg ${extra}viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l4 2"/>',
  user: '<path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="7" r="4"/>',
};

const navIcon = (name) => svg(icons[name], 'class="nav-icon" ');
const correctedTabs = `<footer class="app-footer"><nav aria-label="Main navigation" class="tabbar"><a class="tab" href="#home-preview">${navIcon('grid')}<span>Pots</span></a><a class="tab" href="#people-preview">${navIcon('users')}<span>People</span></a><a aria-label="Add" class="add-tab" href="#add-preview">${svg(icons.plus)}</a><a class="tab" href="#activity-preview">${navIcon('history')}<span>Activity</span></a><a class="tab" href="#you-preview">${navIcon('user')}<span>You</span></a></nav></footer>`;

let html = base;

const existingTabs = html.match(/<footer class="app-footer"><nav class="tabbar">[\s\S]*?<\/nav><\/footer>/g) || [];
if (existingTabs.length !== 3) throw new Error(`Expected 3 overview tab bars, found ${existingTabs.length}`);
html = html.replace(/<footer class="app-footer"><nav class="tabbar">[\s\S]*?<\/nav><\/footer>/g, correctedTabs);

const peoplePreview = `<section id="people-preview" class="screen"><header class="j19-header"><a class="icon-btn" href="#home-preview" aria-label="Back">${svg(icons.back, 'style="width:18px;height:18px" ')}</a><div class="j19-title"><b>People preview</b><span>Insights</span></div><a class="demo-btn" href="#demo">Demo</a></header><main class="j19-content"><div class="j19-note">${svg(icons.users, 'style="width:16px;height:16px" ')}<div>People remains an approved adjacent surface. This preview only demonstrates the global navigation boundary; Journey 19 does not redesign People.</div></div></main><footer class="j19-focus-footer"><a class="j19-primary" href="#overview">Open Insights</a></footer></section>`;

const insertionPoint = '<section id="you-preview" class="screen">';
if (!html.includes(insertionPoint)) throw new Error('Could not find You preview insertion point');
html = html.replace(insertionPoint, `${peoplePreview}${insertionPoint}`);

html = html.replace('<b>Home preview</b>', '<b>Pots / Home preview</b>');
html = html.replace('Home remains an approved adjacent surface. This preview only demonstrates the Insights entry/return boundary.', 'Pots / Home remains an approved adjacent surface. This preview only demonstrates the Insights entry/return boundary.');

const validNeedle = '"home-preview","you-preview","activity-preview"';
if (!html.includes(validNeedle)) throw new Error('Could not find valid-state list');
html = html.replace(validNeedle, '"home-preview","people-preview","you-preview","activity-preview"');

html = html.replaceAll('Insights V1', 'Insights V1.1');
html = html.replace('</head>', '<style id="j19-v1-1-corrections">.j19-row>svg{width:16px;height:16px;color:var(--muted);flex:none}.add-tab svg{width:23px;height:23px}.tabbar .tab svg{width:20px;height:20px}</style></head>');

fs.writeFileSync(outPath, html);
const hash = crypto.createHash('sha256').update(html).digest('hex');
console.log(JSON.stringify({ version: 'v1.1', out: path.relative(journeyDir, outPath), sha256: hash }, null, 2));
