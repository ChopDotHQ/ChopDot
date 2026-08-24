import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(process.cwd());
const planMarkdownPath = 'docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.md';
const planManifestPath = 'docs/superpowers/plans/2026-08-22-chopdot-full-product-dot-devnet-deployment-execution.json';
const matrixPath = 'docs/research/CHOPDOT_FEATURE_INHERITANCE_AND_EXTERNAL_ANALOG_MATRIX.json';
const packagePath = 'package.json';
const outputPath = 'artifacts/agentops/full-product-deployment-plan-verification.json';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sorted = (values) => [...values].sort();
const sameSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const markdown = fs.readFileSync(path.join(root, planMarkdownPath), 'utf8');
const manifestBytes = fs.readFileSync(path.join(root, planManifestPath));
const matrixBytes = fs.readFileSync(path.join(root, matrixPath));
const manifest = JSON.parse(manifestBytes);
const matrix = JSON.parse(matrixBytes);
const packageJson = readJson(packagePath);

const checks = [];
const check = (id, pass, details) => checks.push({ id, pass: Boolean(pass), details });

check('exact-target-root', root === manifest.target.root, { expected: manifest.target.root, actual: root });
check('manifest-kind', manifest.kind === 'chopdot_full_product_dot_devnet_execution_plan', manifest.kind);
check('historical-routing-status', manifest.status === 'superseded_for_current_routing' && Boolean(manifest.superseded_by), {
  status: manifest.status,
  superseded_by: manifest.superseded_by,
});
check('no-supabase-decision', manifest.authority.supabase_v1 === 'rejected' && markdown.includes('Supabase is not part of the v1 runtime or recovery design'), manifest.authority.supabase_v1);
check('participant-held-authority', manifest.authority.core.includes('participant-held') && markdown.includes('participant-held append-only signed event log'), manifest.authority.core);
check('four-pillar-loop', JSON.stringify(manifest.product_loop) === JSON.stringify(['Catch', 'Management', 'Payout', 'History']), manifest.product_loop);

const matrixFamilyIds = matrix.feature_families.map((item) => item.id);
const routedFamilyIds = manifest.workstreams.map((item) => item.family_id);
check('feature-family-coverage', sameSet(matrixFamilyIds, routedFamilyIds), {
  expected_count: matrixFamilyIds.length,
  routed_count: routedFamilyIds.length,
  missing: matrixFamilyIds.filter((id) => !routedFamilyIds.includes(id)),
  extra: routedFamilyIds.filter((id) => !matrixFamilyIds.includes(id))
});
check('one-workstream-per-family', new Set(routedFamilyIds).size === routedFamilyIds.length, routedFamilyIds);

const workstreamById = new Map(manifest.workstreams.map((item) => [item.id, item]));
const matrixCardIds = matrix.cards.map((item) => item.id);
const coveredCardIds = Object.keys(manifest.card_coverage);
check('card-coverage', sameSet(matrixCardIds, coveredCardIds), {
  expected_count: matrixCardIds.length,
  covered_count: coveredCardIds.length,
  missing: matrixCardIds.filter((id) => !coveredCardIds.includes(id)),
  extra: coveredCardIds.filter((id) => !matrixCardIds.includes(id))
});
const misroutedCards = matrix.cards.filter((card) => {
  const workstream = workstreamById.get(manifest.card_coverage[card.id]);
  return !workstream || workstream.family_id !== card.primary_family_id;
}).map((card) => card.id);
check('card-primary-family-routing', misroutedCards.length === 0, { misrouted: misroutedCards });

const matrixPathIds = matrix.paths.map((item) => item.id);
const coveredPathIds = Object.keys(manifest.current_path_coverage);
check('current-path-coverage', sameSet(matrixPathIds, coveredPathIds), {
  expected_count: matrixPathIds.length,
  covered_count: coveredPathIds.length,
  missing: matrixPathIds.filter((id) => !coveredPathIds.includes(id)),
  extra: coveredPathIds.filter((id) => !matrixPathIds.includes(id))
});
const emptyPathWaveMappings = Object.entries(manifest.current_path_coverage)
  .filter(([, waves]) => !Array.isArray(waves) || waves.length === 0)
  .map(([id]) => id);
check('current-path-wave-owners', emptyPathWaveMappings.length === 0, { missing_wave_owner: emptyPathWaveMappings });

const zeroPathJourneyIds = matrix.journeys.filter((item) => item.path_count === 0).map((item) => item.id);
const futureJourneyIds = Object.keys(manifest.future_journey_requirements);
check('future-journey-coverage', sameSet(zeroPathJourneyIds, futureJourneyIds), {
  expected: zeroPathJourneyIds,
  covered: futureJourneyIds
});
const futureCounts = Object.fromEntries(Object.entries(manifest.future_journey_requirements).map(([id, paths]) => [id, paths.length]));
check('future-journey-minimum-paths', Object.values(futureCounts).every((count) => count >= 8), futureCounts);
const futurePathIds = Object.values(manifest.future_journey_requirements).flat();
check('future-path-id-unique', new Set(futurePathIds).size === futurePathIds.length, { count: futurePathIds.length });

const expectedDimensions = ['implemented', 'tested', 'committed', 'merged', 'candidate_built', 'published', 'reachable', 'user_proven'];
check('release-dimensions-separated', JSON.stringify(manifest.release_dimensions) === JSON.stringify(expectedDimensions), manifest.release_dimensions);

const waveIds = manifest.waves.map((item) => item.id);
check('wave-sequence', JSON.stringify(waveIds) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), waveIds);
const invalidWaves = manifest.waves.filter((wave) =>
  !wave.name || !wave.artifact || !wave.rollback_or_stop ||
  !Array.isArray(wave.depends_on) || wave.depends_on.some((dependency) => dependency >= wave.id || !waveIds.includes(dependency))
).map((wave) => wave.id);
check('wave-contracts', invalidWaves.length === 0, { invalid_waves: invalidWaves });

const requiredExperimentIds = ['R1', 'R2', 'R3', 'R4'];
check('architecture-experiments', sameSet(manifest.experiments.map((item) => item.id), requiredExperimentIds), manifest.experiments);

const existingScriptNames = manifest.existing_commands
  .map((command) => command.match(/^npm run ([^\s]+)/)?.[1])
  .filter(Boolean);
const missingExistingScripts = existingScriptNames.filter((name) => !packageJson.scripts?.[name]);
check('declared-existing-scripts-exist', missingExistingScripts.length === 0, { checked: existingScriptNames.length, missing: missingExistingScripts });

const plannedScriptNames = manifest.commands_to_add
  .map((command) => command.match(/(?:^|\s)npm run ([^\s]+)/)?.[1])
  .filter(Boolean);
const plannedScriptState = Object.fromEntries(plannedScriptNames.map((name) => [name, Boolean(packageJson.scripts?.[name])]));
check('planned-native-command-contract', sameSet(plannedScriptNames, ['build:dot-host', 'preview:dot-host', 'e2e:dot-host-preview', 'verify:dot-host']), plannedScriptState);

for (const section of ['## 1. Executive decision', '## 5. No-Supabase architecture decision lock', '## 6. Full-product mode contract', '## 8. Ordered execution waves', '## 13. Definition of full-product release', '## 15. Immediate next move']) {
  check(`markdown-section:${section}`, markdown.includes(section), section);
}
for (const token of ['Spend Card', 'Savings circle', 'Emergency pot', 'Community fund', 'Group cards', 'fresh-device', 'action-time approval']) {
  check(`markdown-token:${token}`, markdown.toLowerCase().includes(token.toLowerCase()), token);
}

const failedChecks = checks.filter((item) => !item.pass);
const result = {
  schema_version: 1,
  kind: 'chopdot_full_product_deployment_plan_verification',
  authority: 'historical_bundle_consistency_only',
  current_routing_eligible: false,
  superseded_by: manifest.superseded_by,
  generated_at: new Date().toISOString(),
  status: failedChecks.length === 0 ? 'pass' : 'fail',
  target: manifest.target,
  actual_root: root,
  counts: {
    checks: checks.length,
    passed: checks.length - failedChecks.length,
    failed: failedChecks.length,
    feature_families: matrixFamilyIds.length,
    cards: matrixCardIds.length,
    current_paths: matrixPathIds.length,
    future_journeys: futureJourneyIds.length,
    required_future_paths: futurePathIds.length,
    waves: manifest.waves.length,
    release_dimensions: manifest.release_dimensions.length
  },
  hashes: {
    plan_markdown_sha256: sha256(markdown),
    plan_manifest_sha256: sha256(manifestBytes),
    source_matrix_sha256: sha256(matrixBytes),
    ordered_plan_bundle_sha256: sha256(`${planMarkdownPath}\0${sha256(markdown)}\n${planManifestPath}\0${sha256(manifestBytes)}\n${matrixPath}\0${sha256(matrixBytes)}\n`)
  },
  planned_native_script_state: plannedScriptState,
  checks
};

fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
fs.writeFileSync(path.join(root, outputPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, counts: result.counts, hashes: result.hashes, output: outputPath }, null, 2));
process.exitCode = failedChecks.length === 0 ? 0 : 1;
