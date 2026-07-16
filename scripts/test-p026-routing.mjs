#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { enrichModel, validate } from './generate-product-behavior-map.mjs';

const source = JSON.parse(readFileSync(new URL('../product/path-model.yaml', import.meta.url), 'utf8'));
const clone = () => structuredClone(source);
const lane = (model, id) => model.activeLanes.find((candidate) => candidate.id === id);
const sourcePath = (model, id) => model.journeys.flatMap((journey) => journey.paths ?? []).find((path) => path.id === id);
const path = (model, id) => model.paths.find((candidate) => candidate.id === id);
const validateModel = (model) => validate(enrichModel(model));

function makeAllCheckpointsFresh(model) {
  const now = new Date().toISOString();
  for (const activeLane of model.activeLanes) activeLane.checkpoint.recordedAt = now;
  return model;
}

{
  const model = enrichModel(makeAllCheckpointsFresh(clone()));
  assert.equal(path(model, 'N-009').laneStatus, 'active_elsewhere');
  assert.equal(path(model, 'N-009').recommendedForThisThread, false);
}

{
  const model = makeAllCheckpointsFresh(clone());
  lane(model, 'p025-canonical-integration').checkpoint.recordedAt = '2000-01-01T00:00:00Z';
  const enriched = enrichModel(model);
  assert.equal(path(enriched, 'N-009').laneStatus, 'stale_owner');
  assert.equal(path(enriched, 'N-009').recommendedForThisThread, false);
  assert(enriched.summary.queue.staleOwners.some((candidate) => candidate.id === 'N-009'));
  assert(!enriched.summary.queue.highestRiskUnowned.some((candidate) => candidate.id === 'N-009'));
}

{
  const model = makeAllCheckpointsFresh(clone());
  lane(model, 'programme-a-portable-shell-host-proof').paths.push('N-009');
  const result = validateModel(model);
  assert(result.issues.some((issue) => issue.code === 'duplicate-active-lane-path'));
}

{
  const model = makeAllCheckpointsFresh(clone());
  lane(model, 'p025-canonical-integration').checkpoint.evidenceRefs.push('EV-MISSING');
  const result = validateModel(model);
  assert(result.issues.some((issue) => issue.code === 'unknown-checkpoint-evidence'));
}

{
  const model = makeAllCheckpointsFresh(clone());
  lane(model, 'p025-canonical-integration').releases = [{
    pathId: 'N-009',
    decisionId: 'RELEASE-N-009-TEST',
    decidedAt: new Date().toISOString(),
    evidenceRefs: ['EV-LANE-SYNC-20260716'],
  }];
  const enriched = enrichModel(model);
  assert.equal(path(enriched, 'N-009').laneStatus, 'unowned');
  assert.equal(path(enriched, 'N-009').recommendedForThisThread, true);
}

{
  const model = makeAllCheckpointsFresh(clone());
  sourcePath(model, 'N-009').laneStatus = 'unowned';
  sourcePath(model, 'N-009').recommendedForThisThread = true;
  const enriched = enrichModel(model);
  assert.equal(path(enriched, 'N-009').laneStatus, 'active_elsewhere');
  assert.equal(path(enriched, 'N-009').recommendedForThisThread, false);
}

console.log('P-026 routing regression tests: 6/6 passed');
