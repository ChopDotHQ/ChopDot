import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [targetName] = process.argv.slice(2);
const approvedTargets = new Set([
  'verify.mjs',
  'verify-restore-integrity.mjs',
  'verify-live-materialization-authority.mjs'
]);
if (!targetName || !approvedTargets.has(targetName)) {
  throw new Error('expected an approved Phase C1 core regression verifier name');
}

const here = path.dirname(new URL(import.meta.url).pathname);
const sourcePath = path.join(here, targetName);
const generatedName = `.generated-core-${targetName}`;
const generatedPath = path.join(here, generatedName);
const source = fs.readFileSync(sourcePath, 'utf8');
const marker = "from './materialization-state.mjs'";
if (!source.includes(marker)) {
  throw new Error(`${targetName} no longer imports the canonical materialization module as expected`);
}

// The generic invariant and restore-integrity suites are preserved core regressions:
// run them directly against the revision-8 external-effect layer so their old assertions
// remain focused on proof/MoneyV1/lineage/conservation/restore behavior. The live-authority
// suite is different: its subject is the PUBLIC materialization wrapper's exact-head fence,
// so bypassing that wrapper would invalidate the test itself.
let transformed = source;
if (targetName !== 'verify-live-materialization-authority.mjs') {
  transformed = source.replace(marker, "from './_authoritative-external-effect-state.mjs'");
  if (transformed === source || transformed.includes(marker)) {
    throw new Error(`${targetName} core-regression transform was incomplete`);
  }
}

// verify.mjs intentionally preserves the complete previously-cleared revision-7 suite.
// The revision-8 successor changes only the contract revision marker here; the new
// external-effect identity family is exercised separately by its focused verifier.
if (targetName === 'verify.mjs') {
  const revisionMarker = "eq(spend.security_revision, 7, 'security revision 7 carries integrated parent conservation');";
  const revisionReplacement = "eq(spend.security_revision, 8, 'security revision 8 carries integrated parent conservation plus authoritative external-effect identity');";
  if (!transformed.includes(revisionMarker)) {
    throw new Error('verify.mjs revision-7 regression marker missing');
  }
  transformed = transformed.replace(revisionMarker, revisionReplacement);
}

// Older restore/live authority fixtures model an already-accepted proof seam and
// predate the revision-8 external namespace fields. Add one deterministic rail-neutral
// verified namespace only to those generated regression fixtures; production code
// still fails closed when adapter_id / rail_identity are absent.
if (targetName === 'verify-restore-integrity.mjs' || targetName === 'verify-live-materialization-authority.mjs') {
  const fixtureMarker = '  authoritative_parent_effect_ref: parent\n});';
  const fixtureReplacement = "  authoritative_parent_effect_ref: parent,\n  adapter_id: 'adapter_fixture',\n  rail_identity: 'fixture_rail'\n});";
  if (!transformed.includes(fixtureMarker)) {
    throw new Error(`${targetName} verified-namespace fixture marker missing`);
  }
  transformed = transformed.replace(fixtureMarker, fixtureReplacement);
}

// The MoneyV1 exactness loop in the preserved restore-integrity regression uses an
// inline proof object instead of the shared fixture helper above. Decorate that generated
// proof with the same deterministic rail-neutral namespace so the old MoneyV1 test keeps
// testing integer/partition/restore behavior rather than failing on the new proof shape.
if (targetName === 'verify-restore-integrity.mjs') {
  const moneyFixtureMarker = "      authoritative_parent_effect_ref: null\n    },\n    effectMoney: { minorUnits: units, currency: 'XTS', exponent },";
  const moneyFixtureReplacement = "      authoritative_parent_effect_ref: null,\n      adapter_id: 'adapter_fixture',\n      rail_identity: 'fixture_rail'\n    },\n    effectMoney: { minorUnits: units, currency: 'XTS', exponent },";
  if (!transformed.includes(moneyFixtureMarker)) {
    throw new Error('verify-restore-integrity.mjs MoneyV1 verified-namespace fixture marker missing');
  }
  transformed = transformed.replace(moneyFixtureMarker, moneyFixtureReplacement);
}

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
