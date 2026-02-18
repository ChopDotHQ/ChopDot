import fs from 'node:fs';
import path from 'node:path';

const inventoryPath = path.resolve('docs/MVP_ACTION_INVENTORY.md');
const raw = fs.readFileSync(inventoryPath, 'utf8');
const lines = raw.split(/\r?\n/);

const actionRegex = /^- \[ \] MVP-(\d{3}) \| (READY|PARTIAL) \| (.+) \| (Cypress|Manual)$/;
const summaryRegex = /^- `(READY|PARTIAL)`: (\d+)$/;
const totalRegex = /^- Total identified actions: (\d+)$/;

const actions = [];
for (const line of lines) {
  const match = line.match(actionRegex);
  if (!match) continue;
  actions.push({
    id: Number(match[1]),
    status: match[2],
    description: match[3],
    mode: match[4],
  });
}

if (actions.length === 0) {
  console.error('No MVP actions were parsed from docs/MVP_ACTION_INVENTORY.md');
  process.exit(1);
}

const ids = actions.map((a) => a.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  const seen = new Set();
  const dupes = ids.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
  console.error(`Duplicate MVP IDs found: ${[...new Set(dupes)].map((n) => `MVP-${String(n).padStart(3, '0')}`).join(', ')}`);
  process.exit(1);
}

const minId = Math.min(...ids);
const maxId = Math.max(...ids);
const missingIds = [];
for (let id = minId; id <= maxId; id += 1) {
  if (!uniqueIds.has(id)) missingIds.push(id);
}
if (missingIds.length > 0) {
  console.error(
    `MVP ID gaps detected between MVP-${String(minId).padStart(3, '0')} and MVP-${String(maxId).padStart(3, '0')}: ${missingIds
      .map((n) => `MVP-${String(n).padStart(3, '0')}`)
      .join(', ')}`,
  );
  process.exit(1);
}

const partialActions = actions.filter((a) => a.status === 'PARTIAL');
if (partialActions.length > 0) {
  console.error(
    `PARTIAL actions remain: ${partialActions
      .map((a) => `MVP-${String(a.id).padStart(3, '0')}`)
      .join(', ')}`,
  );
  process.exit(1);
}

const manualAllowed = new Set([10, 11, 61, 89, 126, 127, 136, 141, 145, 172, 173, 174, 175]);
const manualActions = actions.filter((a) => a.mode === 'Manual').map((a) => a.id);
const unexpectedManual = manualActions.filter((id) => !manualAllowed.has(id));
const missingManual = [...manualAllowed].filter((id) => !manualActions.includes(id));

if (unexpectedManual.length > 0) {
  console.error(`Unexpected Manual actions: ${unexpectedManual.map((n) => `MVP-${String(n).padStart(3, '0')}`).join(', ')}`);
  process.exit(1);
}

if (missingManual.length > 0) {
  console.error(`Expected Manual actions missing from inventory: ${missingManual.map((n) => `MVP-${String(n).padStart(3, '0')}`).join(', ')}`);
  process.exit(1);
}

const summary = { READY: null, PARTIAL: null, TOTAL: null };
for (const line of lines) {
  const totalMatch = line.match(totalRegex);
  if (totalMatch) summary.TOTAL = Number(totalMatch[1]);
  const statusMatch = line.match(summaryRegex);
  if (statusMatch) summary[statusMatch[1]] = Number(statusMatch[2]);
}

const computedReady = actions.filter((a) => a.status === 'READY').length;
const computedPartial = actions.filter((a) => a.status === 'PARTIAL').length;
const computedTotal = actions.length;

if (summary.TOTAL !== computedTotal || summary.READY !== computedReady || summary.PARTIAL !== computedPartial) {
  console.error(
    `Summary mismatch. Parsed total=${computedTotal}, READY=${computedReady}, PARTIAL=${computedPartial}; documented total=${summary.TOTAL}, READY=${summary.READY}, PARTIAL=${summary.PARTIAL}`,
  );
  process.exit(1);
}

const contradictoryPhrase = 'not exposed in current settle-home UI';
if (raw.includes(contradictoryPhrase)) {
  console.error(`Remove outdated inventory wording: "${contradictoryPhrase}"`);
  process.exit(1);
}

console.log(`MVP inventory verification passed: ${computedTotal} actions, ${computedReady} READY, ${manualActions.length} Manual (allowlisted).`);
