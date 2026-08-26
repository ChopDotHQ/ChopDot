import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRulesetPacket, REQUIRED_CHECKS } from '../build-ruleset-packet.mjs';
import { validateRulesetReadback } from '../readback-ruleset.mjs';

const branches = ['main', 'codex/chopdot-v1-launch'];

function ruleset() {
  const packet = buildRulesetPacket({ repository: 'ChopDotHQ/ChopDot', sourceHead: 'a'.repeat(40), sourceTree: 'b'.repeat(40), branches });
  return { id: 123, ...packet.payload };
}

test('change packet is approval-gated and digest-bound', () => {
  const packet = buildRulesetPacket({ repository: 'ChopDotHQ/ChopDot', sourceHead: 'a'.repeat(40), sourceTree: 'b'.repeat(40), branches });
  assert.equal(packet.approval_required, true);
  assert.equal(packet.readback_required, true);
  assert.match(packet.packet_digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(packet.payload.rules.find((entry) => entry.type === 'required_status_checks').parameters.required_status_checks.map((entry) => entry.context), REQUIRED_CHECKS);
});

test('active ruleset readback proves all required boundaries', () => {
  const result = validateRulesetReadback([ruleset()], { branches });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.summary.ruleset_id, 123);
});

test('missing check and stale-review controls are non-green', () => {
  const fixture = ruleset();
  fixture.rules.find((entry) => entry.type === 'required_status_checks').parameters.required_status_checks.pop();
  fixture.rules.find((entry) => entry.type === 'pull_request').parameters.dismiss_stale_reviews_on_push = false;
  const result = validateRulesetReadback([fixture], { branches });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('dismiss stale')));
  assert(result.errors.some((error) => error.includes('Missing required status check')));
});

test('ruleset targeting another branch cannot prove protection', () => {
  const fixture = ruleset();
  fixture.conditions.ref_name.include = ['refs/heads/other'];
  const result = validateRulesetReadback([fixture], { branches });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('No active branch ruleset')));
});

test('bypass actors and excluded governed refs cannot report protection', () => {
  const fixture = ruleset();
  fixture.bypass_actors = [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }];
  fixture.conditions.ref_name.exclude = ['refs/heads/main'];
  const result = validateRulesetReadback([fixture], { branches });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('bypass actors')));
  assert(result.errors.some((error) => error.includes('excludes required target ref')));
});
