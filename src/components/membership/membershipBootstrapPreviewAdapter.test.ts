import assert from 'node:assert/strict';
import test from 'node:test';
import {createLimitedDinnerActionPreviewAdapter} from './membershipBootstrapPreviewAdapter.ts';

test('limited action never reaches group membership', async () => {
  const adapter = createLimitedDinnerActionPreviewAdapter();
  assert.equal(adapter.getState(), 'limited_decision');
  await adapter.openLimitedAction();
  assert.equal(adapter.getState(), 'limited_opened');
  await assert.rejects(adapter.grant);
  assert.notEqual(adapter.getState(), 'joined');
});
