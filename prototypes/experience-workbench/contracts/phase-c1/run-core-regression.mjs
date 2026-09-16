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
if (!source.includes(marker)) throw new Error(`${targetName} no longer imports the canonical materialization module as expected`);

// Generic invariant/restore suites stay lower-core regressions so revision-9
// execution ownership does not rewrite previously-cleared proof/MoneyV1/lineage
// assertions. The live-authority suite continues to test the PUBLIC wrapper and is
// decorated below with a deterministic adapter ownership authority.
let transformed = source;
if (targetName !== 'verify-live-materialization-authority.mjs') {
  transformed = source.replace(marker, "from './_authoritative-external-effect-state.mjs'");
  if (transformed === source || transformed.includes(marker)) throw new Error(`${targetName} core-regression transform was incomplete`);
}

if (targetName === 'verify.mjs') {
  const revisionMarker = "eq(spend.security_revision, 7, 'security revision 7 carries integrated parent conservation');";
  const revisionReplacement = "eq(spend.security_revision, 9, 'security revision 9 preserves integrated parent conservation under durable execution ownership');";
  if (!transformed.includes(revisionMarker)) throw new Error('verify.mjs revision-7 regression marker missing');
  transformed = transformed.replace(revisionMarker, revisionReplacement);
}

// Older restore/live fixtures predate adapter/rail/request ownership. Generated
// regression copies get one deterministic rail-neutral namespace; source regressions
// remain byte-stable and production code still fails closed when these fields/seams
// are absent.
if (targetName === 'verify-restore-integrity.mjs' || targetName === 'verify-live-materialization-authority.mjs') {
  const fixtureMarker = '  authoritative_parent_effect_ref: parent\n});';
  const fixtureReplacement = "  authoritative_parent_effect_ref: parent,\n  adapter_id: 'adapter_fixture',\n  rail_identity: 'fixture_rail',\n  execution_request_ref: `req:${spend}:${operation}:${ref}`\n});";
  if (!transformed.includes(fixtureMarker)) throw new Error(`${targetName} verified-namespace fixture marker missing`);
  transformed = transformed.replace(fixtureMarker, fixtureReplacement);
}

if (targetName === 'verify-restore-integrity.mjs') {
  const moneyFixtureMarker = "      authoritative_parent_effect_ref: null\n    },\n    effectMoney: { minorUnits: units, currency: 'XTS', exponent },";
  const moneyFixtureReplacement = "      authoritative_parent_effect_ref: null,\n      adapter_id: 'adapter_fixture',\n      rail_identity: 'fixture_rail',\n      execution_request_ref: 'req:sp_e' + exponent + ':op_e' + exponent + ':rail:e' + exponent\n    },\n    effectMoney: { minorUnits: units, currency: 'XTS', exponent },";
  if (!transformed.includes(moneyFixtureMarker)) throw new Error('verify-restore-integrity.mjs MoneyV1 verified-namespace fixture marker missing');
  transformed = transformed.replace(moneyFixtureMarker, moneyFixtureReplacement);
}

if (targetName === 'verify-live-materialization-authority.mjs') {
  const importMarker = "import { createCanonicalMaterializationState } from './materialization-state.mjs';";
  const importReplacement = "import { createCanonicalMaterializationState as createRevision9MaterializationState, createInMemoryExecutionOwnershipAuthority } from './materialization-state.mjs';\n\nconst __financialAuthorityNamespace = 'phase-c1:financial-authority:live-regression';\nconst __executionOwnership = createInMemoryExecutionOwnershipAuthority();\nconst createCanonicalMaterializationState = options => createRevision9MaterializationState({\n  ...options,\n  financialAuthorityNamespace: __financialAuthorityNamespace,\n  executionOwnershipAuthority: __executionOwnership\n});\nconst __prepareExecutionOwnership = effect => {\n  const correlation = {\n    financial_authority_namespace: __financialAuthorityNamespace,\n    execution_request_ref: effect.execution_request_ref,\n    spend_intent_id: effect.spend_intent_id,\n    operation_id: effect.operation_id,\n    adapter_id: effect.adapter_id,\n    rail_identity: effect.rail_identity,\n    status: 'pending'\n  };\n  if (!__executionOwnership.reserveCorrelation(correlation)) throw new Error('live regression execution correlation rejected');\n  if (!__executionOwnership.bindAuthoritativeExternalEffect({\n    financial_authority_namespace: __financialAuthorityNamespace,\n    execution_request_ref: effect.execution_request_ref,\n    external_effect_identity: {\n      adapter_id: effect.adapter_id,\n      rail_identity: effect.rail_identity,\n      authoritative_effect_ref: effect.authoritative_effect_ref\n    }\n  })) throw new Error('live regression external ownership binding rejected');\n  return effect;\n};";
  if (!transformed.includes(importMarker)) throw new Error('live-authority public import marker missing');
  transformed = transformed.replace(importMarker, importReplacement);
  const expectedMarker = '    expected: expected({ ref, kind, parent, spend, operation }),';
  const expectedReplacement = '    expected: __prepareExecutionOwnership(expected({ ref, kind, parent, spend, operation })),';
  if (!transformed.includes(expectedMarker)) throw new Error('live-authority expected fixture marker missing');
  transformed = transformed.replace(expectedMarker, expectedReplacement);
}

try {
  fs.writeFileSync(generatedPath, transformed);
  await import(`${pathToFileURL(generatedPath).href}?run=${Date.now()}`);
} finally {
  if (fs.existsSync(generatedPath)) fs.unlinkSync(generatedPath);
}
