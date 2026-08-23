import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const workflowPath = path.join(root, '.github/workflows/supervision-gate.yml');
const exactRef = 'ref: ${{ github.event.pull_request.head.sha || github.sha }}';
const exactAssertion = 'test "$(git rev-parse HEAD)" = "$EXPECTED_SHA"';

test('supervision jobs checkout and assert the exact candidate SHA', () => {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  assert.equal(
    workflow.split(exactRef).length - 1,
    2,
    'both structural and release jobs must checkout the exact candidate SHA',
  );
  assert.equal(
    workflow.split(exactAssertion).length - 1,
    2,
    'both structural and release jobs must assert the checked-out SHA',
  );
});
