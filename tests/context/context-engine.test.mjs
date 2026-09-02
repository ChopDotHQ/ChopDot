import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { queryContext, inferIntent, classifyAuthority } from '../../scripts/context/query.mjs';

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'chopdot-context-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  const put = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  put('CHOPDOT.md', '# ChopDot\n\n## Product decision lens\nA feature request is a hypothesis, not an implementation order. A use case is not automatically a capability. No new feature is a valid outcome.\n');
  put('PRODUCT_TRUTH.md', '# Product truth\n\n## Money states\nA payer saying paid is not received. Manual payments require receiver confirmation.\n');
  put('product/cards.md', `# Cards\n\n## P-035 - First group\n\`\`\`yaml\nid: P-035\nstatus: building\npriority: 100\nblocked_by: none\njourney: first shared-group creation and intentional invite acceptance\n\`\`\`\n\n## P-030 - Release\n\`\`\`yaml\nid: P-030\nstatus: blocked\npriority: 95\nblocked_by: P-035\n\`\`\`\n\n## P-013 - Baseline\n\`\`\`yaml\nid: P-013\nstatus: building\npriority: 94\nblocked_by: none\n\`\`\`\n\n## P-022 - Home\n\`\`\`yaml\nid: P-022\nstatus: building\npriority: 90\nblocked_by: none\n\`\`\`\n`);
  put('product/decisions.md', '# Decisions\n\n## DEC-006 - Context authority is explicit\nCurrent product sources define priority. Generated read models are not authority.\n');
  put('product/context-authority.json', '{"authority_order":["product-law","current-product-decisions"]}\n');
  put('docs/release/current-release-state.json', '{"status":"pre-candidate","candidate":null}\n');
  put('docs/adr/0003-immutable-testnet-promotion.md', '# Immutable promotion\nBuild once, stage and promote the identical reviewed bytes.\n');
  put('scripts/agent-system/adapters/repo-graph.mjs', 'export function read_context(){ /* wrong_root wrong_branch stale_commit */ }\n');
  put('scripts/agent-system/adapters/exact-source.mjs', 'export function read_context(){ /* exact source fallback wrong_root stale_commit */ }\n');
  put('governance/agent-system/instructions/chopdot-frontend-design.md', '# Frontend\n\n## Exact-worktree preflight\nSame-level source conflict blocks the judgment. Do not choose the newest-looking source.\n');
  put('.github/workflows/agent-governance.yml', 'on: [pull_request, workflow_dispatch]\njobs:\n  pr-outcome:\n    name: PR outcome\n    env:\n      AGENT_LOOP_PROFILE: implementation\n  release-enforcement:\n    if: workflow_dispatch && release_enforcement\n    name: release enforcement immutable accepted outcome\n');
  put('governance/agent-system/policies/adoption-boundary.v1.json', '{"release":"release-outcome"}\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: root });
  return root;
}

test('intent recognises feature requests and priority separately', () => {
  assert.ok(inferIntent('Add a Trip Mode').includes('feature_request'));
  assert.ok(inferIntent('What should we build next in the product?').includes('priority'));
});

test('authority classes keep generated/historical below product law', () => {
  assert.equal(classifyAuthority('PRODUCT_TRUTH.md'), 'product_law');
  assert.equal(classifyAuthority('product/generated/foo.md'), 'generated');
  assert.equal(classifyAuthority('docs/superpowers/plans/old.md'), 'historical_plan');
});

test('feature request receives the product decision lens', () => {
  const root = fixture();
  const r = queryContext({ root, task: 'Add a Trip Mode for friends' });
  assert.equal(r.sources[0].path, 'CHOPDOT.md');
  assert.match(r.sources[0].section, /Product decision lens/i);
});

test('priority query returns top unblocked product cards instead of blocked release', () => {
  const root = fixture();
  const r = queryContext({ root, task: 'What should we build next in the product?' });
  const cardSections = r.sources.filter((x) => x.path === 'product/cards.md').map((x) => x.section);
  assert.deepEqual(cardSections.slice(0, 3), ['P-035 - First group', 'P-013 - Baseline', 'P-022 - Home']);
  assert.ok(!cardSections.some((x) => x.includes('P-030')));
});

test('release query reads release state and immutable decision', () => {
  const root = fixture();
  const r = queryContext({ root, task: 'Ship the exact candidate to public testnet' });
  assert.equal(r.sources[0].path, 'docs/release/current-release-state.json');
  assert.equal(r.sources[1].path, 'docs/adr/0003-immutable-testnet-promotion.md');
});

test('Repo Graph query includes exact-source fallback', () => {
  const root = fixture();
  const r = queryContext({ root, task: 'Use a Repo Graph packet from another checkout' });
  assert.ok(r.sources.some((x) => x.path.endsWith('/repo-graph.mjs')));
  assert.ok(r.sources.some((x) => x.path.endsWith('/exact-source.mjs')));
});

test('PR tasks explicitly request host context and retrieve both PR and release policy', () => {
  const root = fixture();
  const r = queryContext({ root, task: 'PR #13 is red again. Rerun it.' });
  assert.equal(r.needs_host_context, true);
  assert.ok(r.sources.some((x) => x.path === '.github/workflows/agent-governance.yml' && /PR outcome|pull_request/i.test(x.excerpt)));
  assert.ok(r.sources.some((x) => x.path === '.github/workflows/agent-governance.yml' && /release enforcement|release_enforcement/i.test(x.excerpt)));
  assert.ok(r.sources.some((x) => /adoption-boundary/.test(x.path)));
});

test('ordinary fixture queries stay within the default context budget', () => {
  const root = fixture();
  for (const task of ['Add a Trip Mode', 'What should we build next?', 'Ship the exact candidate', 'Use a Repo Graph packet from another checkout']) {
    const r = queryContext({ root, task });
    assert.ok(r.estimated_tokens <= 6000, `${task}: ${r.estimated_tokens}`);
  }
});

test('expected head mismatch fails stale instead of using wrong candidate', () => {
  const root = fixture();
  assert.throws(() => queryContext({ root, task: 'Do work', expectedHead: 'f'.repeat(40) }), /stale_head/);
});
