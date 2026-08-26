import assert from 'node:assert/strict';
import test from 'node:test';
import {
  checkpointCardTransitionFailures,
  checkpointEvidencePathFailures,
  checkpointProvenanceFailures,
  checkoutIdentityFailures,
  conditionalRouteKeyFailures,
  kgKnownShapeFailures,
  markdownMetadataFailures,
  outcomePacketReferenceFailures,
  rankCards,
  releaseBlockerSetFailures,
  releaseVerdictDependencyFailures,
  releaseVerdictShapeFailures,
  requiredReadOrderFailures,
  validateCards,
} from './product-cockpit.mjs';

const base = Object.freeze({
  status: 'building',
  priority: '50',
  blocker: 'none',
  blocked_by: 'none',
  reviewed: '2026-08-24',
  applies_to: 'chopdot-v1-launch',
  evidence_type: 'test',
  evidence: 'proof/example.md',
  evidence_sha256: '11'.repeat(32),
  pillar: 'Management',
  journey: 'Mina completes one job.',
  next_action: 'Continue',
  score: '9/10',
  authority: 'Signed event',
  scope: 'bounded',
  out: 'parallel authority',
});

const contextManifest = Object.freeze({
  exact_root: '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch',
  branch: 'codex/chopdot-v1-launch',
});
const candidateHead = 'ab'.repeat(20);

test('local context validation keeps exact root and non-detached branch mandatory', () => {
  assert.deepEqual(checkoutIdentityFailures(contextManifest, {
    root: contextManifest.exact_root,
    branch: contextManifest.branch,
    head: candidateHead,
  }, {}).failures, []);
  const wrongRoot = checkoutIdentityFailures(contextManifest, { root: '/tmp/checkout', branch: contextManifest.branch, head: candidateHead }, {
    EXPECTED_SHA: candidateHead,
    EXPECTED_BRANCH: contextManifest.branch,
  });
  assert.equal(wrongRoot.mode, 'local');
  assert.ok(wrongRoot.failures.some((failure) => failure.includes('context root mismatch')));
  const detached = checkoutIdentityFailures(contextManifest, { root: contextManifest.exact_root, branch: '', head: candidateHead }, {});
  assert.ok(detached.failures.some((failure) => failure.includes('<detached>')));
});

test('GitHub context permits an ephemeral detached checkout only with full exact attestation', () => {
  const observed = { root: '/home/runner/work/ChopDot/ChopDot', branch: '', head: candidateHead };
  const environment = {
    GITHUB_ACTIONS: 'true',
    GITHUB_WORKSPACE: observed.root,
    GITHUB_RUN_ID: '33020253817',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    EXPECTED_SHA: candidateHead,
    EXPECTED_BRANCH: contextManifest.branch,
  };
  const result = checkoutIdentityFailures(contextManifest, observed, environment);
  assert.equal(result.mode, 'github');
  assert.equal(result.canonical_root, contextManifest.exact_root);
  assert.equal(result.declared_branch, contextManifest.branch);
  assert.deepEqual(result.failures, []);
});

test('GitHub context fails closed on missing, short, wrong, or unofficial attestation', () => {
  const observed = { root: '/home/runner/work/ChopDot/ChopDot', branch: '', head: candidateHead };
  const valid = {
    GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: observed.root, GITHUB_RUN_ID: '33020253817',
    GITHUB_EVENT_NAME: 'pull_request', EXPECTED_SHA: candidateHead, EXPECTED_BRANCH: contextManifest.branch,
  };
  for (const [field, value, fragment] of [
    ['EXPECTED_SHA', undefined, 'full 40-character'],
    ['EXPECTED_SHA', candidateHead.slice(0, 12), 'full 40-character'],
    ['EXPECTED_SHA', 'cd'.repeat(20), 'HEAD mismatch'],
    ['EXPECTED_BRANCH', undefined, 'requires EXPECTED_BRANCH'],
    ['EXPECTED_BRANCH', 'main', 'branch mismatch'],
    ['GITHUB_WORKSPACE', '/tmp/other', 'GITHUB_WORKSPACE'],
    ['GITHUB_RUN_ID', '', 'numeric GITHUB_RUN_ID'],
    ['GITHUB_EVENT_NAME', 'push', 'pull_request or workflow_dispatch'],
  ]) {
    const environment = { ...valid, [field]: value };
    const failures = checkoutIdentityFailures(contextManifest, observed, environment).failures;
    assert.ok(failures.some((failure) => failure.includes(fragment)), `${field}=${value ?? '<missing>'} did not fail for ${fragment}`);
  }
  const spoofed = checkoutIdentityFailures(contextManifest, observed, { ...valid, GITHUB_ACTIONS: 'false' });
  assert.equal(spoofed.mode, 'local');
  assert.ok(spoofed.failures.some((failure) => failure.includes('context root mismatch')));
});

test('next-card ranking ignores source order and selects explicit P0 priority', () => {
  const p034 = {...base, id: 'P-034', priority: '70'};
  const p035 = {...base, id: 'P-035', priority: '100', blocker: 'P0-live-first-use'};
  const p022 = {...base, id: 'P-022', priority: '90', blocker: 'P1-live-home-hierarchy'};
  assert.equal(rankCards([p034, p022, p035])[0].id, 'P-035');
  assert.equal(rankCards([p035, p034, p022])[0].id, 'P-035');
});

test('card validation rejects ambiguous active priority', () => {
  const cards = [
    {...base, id: 'P-034'},
    {...base, id: 'P-032'},
    {...base, id: 'P-035'},
    {...base, id: 'P-012'},
    {...base, id: 'P-022'},
    {...base, id: 'P-005'},
    {...base, id: 'P-006'},
    {...base, id: 'P-007'},
    {...base, id: 'P-008'},
    {...base, id: 'P-030'},
  ];
  assert.ok(validateCards(cards, new Date('2026-08-24T12:00:00Z')).some((failure) => failure.includes('priority 50 is ambiguous')));
});

test('blocked card must identify another governing card', () => {
  const card = {...base, id: 'P-030', status: 'blocked', blocked_by: 'none'};
  assert.ok(validateCards([card], new Date('2026-08-24T12:00:00Z')).includes('P-030: blocked card must name blocked_by'));
});

test('required read order rejects hidden cross-checkout entries and numbering drift', () => {
  const expected = ['product/context-authority.json', 'PRODUCT_TRUTH.md', 'README.md'];
  const valid = `## Required read order

1. \`product/context-authority.json\`
2. \`PRODUCT_TRUTH.md\`
3. \`README.md\`

## Next
`;
  assert.deepEqual(requiredReadOrderFailures(valid, expected), []);
  const injected = valid.replace('2. `PRODUCT_TRUTH.md`', '2. `/Users/devinsonpena/ChopDot/README.md`\n3. `PRODUCT_TRUTH.md`').replace('3. `README.md`', '4. `README.md`');
  const failures = requiredReadOrderFailures(injected, expected);
  assert.ok(failures.some((failure) => failure.includes('must equal the manifest exactly')));
  assert.ok(failures.some((failure) => failure.includes('absolute paths')));
  const unnumbered = valid.replace('3. `README.md`', '3. `README.md`\n- Also read `/Users/devinsonpena/ChopDot/README.md` first.');
  assert.ok(requiredReadOrderFailures(unnumbered, expected).some((failure) => failure.includes('non-list content')));
  const duplicated = `${valid}\n## Required read order\n\n1. \`/Users/devinsonpena/ChopDot/README.md\`\n`;
  assert.ok(requiredReadOrderFailures(duplicated, expected).some((failure) => failure.includes('exactly one Required read order heading')));
});

test('date validation rejects impossible calendar dates', () => {
  const failures = validateCards([{...base, id: 'P-034', reviewed: '2026-02-30'}], new Date('2026-08-24T12:00:00Z'));
  assert.ok(failures.some((failure) => failure.includes('reviewed date is missing, future, or older')));
});

test('card validation rejects noncanonical blocker labels', () => {
  const failures = validateCards([{...base, id: 'P-034', blocker: 'P0_live-failure'}], new Date('2026-08-24T12:00:00Z'));
  assert.ok(failures.some((failure) => failure.includes('blocker must be none or a canonical')));
});

test('markdown authority metadata is one canonical top block', () => {
  const valid = `# Source\n\n**Kind:** decision\n**Status:** historical\n**Owner:** release\n**Last reviewed:** 2026-08-24\n**Applies to:** chopdot-v1-launch\n**Authority:** dated context only\n\nBody\n`;
  assert.deepEqual(markdownMetadataFailures(valid), []);
  const duplicated = valid.replace('# Source', '# Source\n\n**Status:** historical');
  const failures = markdownMetadataFailures(duplicated);
  assert.ok(failures.some((failure) => failure.includes('exactly one Status line')));
  assert.ok(failures.some((failure) => failure.includes('canonical top block')));
});

test('conditional context routes require unique nonempty when keys', () => {
  assert.deepEqual(conditionalRouteKeyFailures([{when: 'native'}, {when: 'architecture'}]), []);
  const failures = conditionalRouteKeyFailures([{when: 'native'}, {when: 'native'}, {when: ' '}]);
  assert.ok(failures.some((failure) => failure.includes('duplicated: native')));
  assert.ok(failures.some((failure) => failure.includes('empty when key')));
});

test('release blockers must exactly cover unresolved P0 and P1 Cockpit cards', () => {
  const cards = [
    {...base, id: 'P-035', blocker: 'P0-live-first-use'},
    {...base, id: 'P-022', blocker: 'P1-live-home-hierarchy'},
  ];
  assert.deepEqual(releaseBlockerSetFailures(cards, [
    {severity: 'P0', card: 'P-035'},
    {severity: 'P1', card: 'P-022'},
  ]), []);
  assert.ok(releaseBlockerSetFailures(cards, [{severity: 'P0', card: 'P-035'}])[0].includes('must equal'));
});

test('positive release verdicts keep their dependency chain', () => {
  const failures = releaseVerdictDependencyFailures({
    tested: 'failed',
    candidate_built: true,
    storage_uploaded: true,
    byte_reachable: true,
    staged: false,
    promoted: true,
    user_journey_reachable: true,
    user_owned: true,
    user_proven: true,
  });
  assert.ok(failures.some((failure) => failure.includes('promoted cannot be true')));
  assert.ok(failures.some((failure) => failure.includes('user_owned=true requires')));
  assert.ok(failures.some((failure) => failure.includes('failed testing cannot coexist')));
});

test('kg_known shape requires active v2, no fallback, exact lineage, and citations', () => {
  const expected = {root: '/exact/worktree', branch: 'codex/chopdot-v1-launch', head: 'ab'.repeat(20)};
  const valid = {
    current_outcome_known: true,
    requested_read_path: 'v2',
    active_read_path: 'context_graph_v2',
    fallback_used: false,
    fact_count: 2,
    citation_count: 2,
    repo_root: expected.root,
    branch: expected.branch,
    latest_packet_commit: expected.head,
    packet_digest: 'cd'.repeat(32),
    runtime: {kind: 'current_interpreter', python: '/python'},
    cited_source_paths: ['/exact/worktree/PRODUCT_TRUTH.md'],
  };
  assert.deepEqual(kgKnownShapeFailures(valid, expected), []);
  assert.ok(kgKnownShapeFailures({...valid, fallback_used: true, latest_packet_commit: 'ef'.repeat(20)}, expected).length >= 2);
});

test('release verdicts reject string booleans, unsupported statuses, and missing notes', () => {
  const verdicts = {
    implemented: 'partial',
    tested: 'failed',
    committed: true,
    pushed: true,
    candidate_built: true,
    storage_uploaded: true,
    staged: false,
    promoted: false,
    byte_reachable: true,
    user_journey_reachable: false,
    user_owned: false,
    user_proven: false,
    kg_known: false,
  };
  const notes = Object.fromEntries(Object.keys(verdicts).map((field) => [field, `${field} evidence`]));
  assert.deepEqual(releaseVerdictShapeFailures(verdicts, notes), []);
  const failures = releaseVerdictShapeFailures({...verdicts, promoted: 'yes', kg_known: 'yes', implemented: 'looks-good'}, notes);
  assert.ok(failures.some((failure) => failure.includes('implemented must use the declared status enum')));
  assert.ok(failures.some((failure) => failure.includes('promoted must be boolean')));
  assert.ok(failures.some((failure) => failure.includes('kg_known must be boolean')));
});

test('outcome packet references reject unsuccessful, wrong-root, stale, and self-reviewed packets', () => {
  const head = 'ab'.repeat(20);
  const packet = {
    outcome_version: '1.0.0',
    root: '/exact/worktree',
    branch: 'codex/chopdot-v1-launch',
    ending_head: head,
    run_id: 'run_cockpit_reference_001',
    terminal_state: 'failed_verification',
    evaluation_summary: {failed: 1, blocked: 0, hard_failures: ['ASSERT-FAIL'], independent_review_satisfied: false},
    requirements: [{status: 'failed'}],
    artifacts: [],
    evidence_index: [],
    effects: [{state: 'unknown_needs_reconciliation'}],
    packet_digest: '00'.repeat(32),
  };
  const failures = outcomePacketReferenceFailures(packet, {
    root: '/different/worktree',
    branch: 'other-branch',
    head: 'cd'.repeat(20),
    runId: 'run_other_reference_001',
  });
  for (const fragment of ['terminal state is not succeeded', 'wrong exact worktree root', 'wrong branch', 'stale for the current HEAD', 'run ID disagrees', 'independent review']) {
    assert.ok(failures.some((failure) => failure.includes(fragment)), `missing failure for ${fragment}`);
  }
});

test('outcome-backed checkpoints bind canonical root, branch, candidate tree, and named card requirements', () => {
  const tree = 'cd'.repeat(20);
  const event = {git: {root: '/other/checkout', branch: 'other', tree: 'ef'.repeat(20)}};
  const provenance = checkpointProvenanceFailures(event, {
    root: '/exact/worktree',
    branch: 'codex/chopdot-v1-launch',
  }, tree);
  for (const fragment of ['canonical exact worktree', 'canonical release branch', 'candidate commit']) {
    assert.ok(provenance.some((failure) => failure.includes(fragment)), `missing provenance failure for ${fragment}`);
  }
  const packet = {
    outcome_version: '1.0.0',
    root: '/exact/worktree',
    branch: 'codex/chopdot-v1-launch',
    ending_head: 'ab'.repeat(20),
    ending_tree: tree,
    run_id: 'run_card_reference_001',
    terminal_state: 'succeeded',
    requirements: [{requirement_id: 'OTHER-REQ', status: 'accepted'}],
    evaluation_summary: {independent_review_satisfied: true},
  };
  const failures = outcomePacketReferenceFailures(packet, {
    root: packet.root,
    branch: packet.branch,
    head: packet.ending_head,
    tree,
    runId: packet.run_id,
    cardIds: ['P-032'],
  });
  assert.ok(failures.some((failure) => failure.includes('named card requirement P-032')));
});

test('checkpoint evidence commits permit only the cited packet, evidence, card read model, and checkpoint files', () => {
  const event = {
    evidence: 'docs/investigations/pilot.md',
    outcomePacket: 'artifacts/agentops/outcomes/run_pilot/outcome.json',
  };
  const accepted = [
    '.knowns/tasks',
    'product/board.html',
    'product/cards.md',
    'product/generated/product-resume.md',
    'product/history/events/0003-p-032.json',
    event.evidence,
    event.outcomePacket,
  ];
  assert.deepEqual(checkpointEvidencePathFailures(accepted, event, 'product/history/events/0003-p-032.json'), []);
  assert.ok(checkpointEvidencePathFailures([...accepted, 'src/App.tsx'], event, 'product/history/events/0003-p-032.json')
    .some((failure) => failure.includes('non-evidence path src/App.tsx')));
});

test('checkpoint card transitions reject product-scope mutation and changes to unrelated cards', () => {
  const before = [
    {...base, id: 'P-032', status: 'building', blocker: 'P1-proof', blocked_by: 'P-035'},
    {...base, id: 'P-035', status: 'building'},
  ];
  const valid = [
    {...before[0], status: 'done', blocker: 'none', blocked_by: 'none', reviewed: '2026-08-26'},
    before[1],
  ];
  const event = {state: 'done', cards: ['P-032']};
  assert.deepEqual(checkpointCardTransitionFailures(before, valid, event), []);
  const alteredScope = [{...valid[0], scope: 'new authority'}, valid[1]];
  assert.ok(checkpointCardTransitionFailures(before, alteredScope, event)
    .some((failure) => failure.includes('P-032.scope')));
  const alteredOther = [valid[0], {...valid[1], status: 'done'}];
  assert.ok(checkpointCardTransitionFailures(before, alteredOther, event)
    .some((failure) => failure.includes('P-035.status')));
  const buildingEvent = {state: 'building', cards: ['P-032']};
  const clearedBlocker = [{...before[0], blocker: 'none', blocked_by: 'none', status: 'building'}, before[1]];
  assert.ok(checkpointCardTransitionFailures(before, clearedBlocker, buildingEvent)
    .some((failure) => failure.includes('P-032.blocker')));
});
