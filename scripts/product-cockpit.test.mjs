import assert from 'node:assert/strict';
import test from 'node:test';
import {
  benchmarkBaselineFailures,
  activeProductCardFromMarkdown,
  checkpointCardTransitionFailures,
  checkpointAcceptanceFailures,
  checkpointAcceptanceDurabilityFailures,
  checkpointEvidencePathFailures,
  checkpointProvenanceFailures,
  completionEventBijectionFailures,
  checkoutIdentityFailures,
  conditionalRouteKeyFailures,
  generatedViews,
  kgKnownShapeFailures,
  markdownMetadataFailures,
  outcomePacketReferenceFailures,
  rankCards,
  nextBuildingCard,
  requiredBenchmarkIds,
  releaseBlockerSetFailures,
  releaseVerdictDependencyFailures,
  releaseVerdictShapeFailures,
  requiredReadOrderFailures,
  validateCards,
} from './product-cockpit.mjs';
import { digestObject } from './agent-governance/lib.mjs';

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
  operator_next_action: 'Continue the bounded package',
  audience: 'participant',
  action_scope: 'Existing group with one pending participant action',
  action_scope_universal: 'false',
  delivery_phase: 'phase-1-baseline',
  benchmark_requirements: 'BASE-STATUS-01',
  differentiated_outcome: 'The participant understands the exact authority boundary without infrastructure language.',
  benchmark_evidence_state: 'e1-stale-refresh-required-e2-open',
  benchmark_scope: 'applies',
  score: '9/10',
  expected_outcome: 'The participant completes one observable job.',
  success_evidence: 'A focused test and production-entrypoint journey pass.',
  failure_outcome: 'The action fails closed and remains reviewable.',
  accountable_owner: 'product-assurance',
  exit_condition: 'The journey and failure path pass.',
  priority_basis: 'This card resolves the highest reviewed eligible blocker.',
  alternatives_not_now: 'P-012 and P-022 remain queued behind this dependency.',
  authority: 'Signed event',
  scope: 'bounded',
  out: 'parallel authority',
});

const contextManifest = Object.freeze({
  exact_root: '/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch',
  branch: 'codex/chopdot-v1-launch',
});
const candidateHead = 'ab'.repeat(20);

function governedAcceptanceReceipt() {
  const candidate = {
    root: contextManifest.exact_root,
    branch: contextManifest.branch,
    commit: candidateHead,
    tree: 'cd'.repeat(20),
    git_status: [],
  };
  const base = {
    receipt_version: '1.0.0', receipt_id: 'acceptance_receipt_123456789abc',
    surface: 'product_finish', candidate,
    changed_paths: ['src/example.ts'], changed_path_manifest_digest: '11'.repeat(32),
    changed_path_manifest_sources: [{ source: 'contract-range', starting_head: 'ef'.repeat(20), ending_head: candidate.commit }],
    governed_rules: ['repository-default'], profiles: ['implementation'], evidence_level: 'exact-candidate',
    contracts: [{ path: 'artifacts/contract.json', sha256: '44'.repeat(32), run_id: 'run_fixture_001', contract_digest: '55'.repeat(32), profile: 'implementation' }],
    outcomes: [{ path: 'artifacts/outcome.json', sha256: '22'.repeat(32), run_id: 'run_fixture_001', packet_digest: '33'.repeat(32) }],
    runner_provenance: [{ path: 'artifacts/runner-provenance.json', sha256: '66'.repeat(32), run_directory: 'artifacts/run_fixture_001', provenance_id: 'runner_provenance_fixture', provenance_digest: '77'.repeat(32) }],
    execution_attestations: [{ path: 'artifacts/execution-attestation.json', sha256: '88'.repeat(32), attestation_id: 'execution_attestation_fixture', provider: 'github-actions-oidc' }],
    knowledge_receipts: [{ path: 'artifacts/recall.json', receipt_id: 'knowledge_receipt_fixture', current_outcome_digest: '33'.repeat(32), backend: 'exact-source' }],
    context_receipt: { receipt_version: '1.0.0', receipt_digest: '99'.repeat(32), verdict: 'governed', candidate },
    checks: 8, verdict: 'governed', failures: [], created_at: '2026-08-27T12:00:00.000Z',
  };
  return { ...base, receipt_digest: digestObject(base) };
}

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

test('completed checkpoints durably bind the full governed acceptance receipt', () => {
  const receipt = governedAcceptanceReceipt();
  const event = {
    state: 'done',
    git: {
      root: receipt.candidate.root,
      branch: receipt.candidate.branch,
      head: receipt.candidate.commit,
      tree: receipt.candidate.tree,
    },
    outcomePacket: receipt.outcomes[0].path,
    outcomePacketSha256: receipt.outcomes[0].sha256,
    acceptance: {
      receiptId: receipt.receipt_id,
      receiptDigest: receipt.receipt_digest,
      verdict: receipt.verdict,
      surface: receipt.surface,
    },
    acceptanceReceipt: receipt,
  };
  assert.deepEqual(checkpointAcceptanceFailures(event), []);
  event.acceptanceReceipt.changed_paths = ['src/tampered.ts'];
  assert(checkpointAcceptanceFailures(event).some((failure) => failure.includes('digest does not match')));
});

test('completed checkpoint durability rejects candidate-authored receipt summaries without tracked proof bytes', async () => {
  const receipt = governedAcceptanceReceipt();
  const event = {
    state: 'done',
    git: {
      root: receipt.candidate.root,
      branch: receipt.candidate.branch,
      head: receipt.candidate.commit,
      tree: receipt.candidate.tree,
    },
    outcomePacket: receipt.outcomes[0].path,
    outcomePacketSha256: receipt.outcomes[0].sha256,
    acceptanceReceipt: receipt,
  };
  let replayed = false;
  const failures = await checkpointAcceptanceDurabilityFailures(event, {
    tracked: new Set(),
    replay: async () => { replayed = true; return { valid: true, issues: [] }; },
  });
  assert.equal(replayed, false);
  assert.ok(failures.some((failure) => failure.includes('acceptance contract: file is not tracked')));
  assert.ok(failures.some((failure) => failure.includes('acceptance runner directory: directory is missing')));
});

test('done card status and completion events form an exact bijection', () => {
  const cards = [{ id: 'P-001', status: 'done' }, { id: 'P-002', status: 'building' }];
  assert.deepEqual(completionEventBijectionFailures(cards, [{ state: 'done', cards: ['P-001'] }]), []);
  assert(completionEventBijectionFailures(cards, []).some((failure) => failure.includes('P-001')));
  assert(completionEventBijectionFailures(cards, [
    { state: 'done', cards: ['P-001'] },
    { state: 'done', cards: ['P-002'] },
  ]).some((failure) => failure.includes('P-002')));
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

test('GitHub context permits an exact PR head targeting the manifest branch', () => {
  const observed = { root: '/home/runner/work/ChopDot/ChopDot', branch: '', head: candidateHead };
  const environment = {
    GITHUB_ACTIONS: 'true',
    GITHUB_WORKSPACE: observed.root,
    GITHUB_RUN_ID: '33119252695',
    GITHUB_EVENT_NAME: 'pull_request',
    EXPECTED_SHA: candidateHead,
    EXPECTED_BRANCH: 'codex/agent-loop-ci-hook-repair',
    EXPECTED_BASE_BRANCH: contextManifest.branch,
    CONTEXT_PR_VALIDATION: 'true',
  };
  assert.deepEqual(checkoutIdentityFailures(contextManifest, observed, environment).failures, []);
  assert.ok(checkoutIdentityFailures(contextManifest, observed, {
    ...environment,
    EXPECTED_BASE_BRANCH: 'main',
  }).failures.some((failure) => failure.includes('branch mismatch')));
  assert.ok(checkoutIdentityFailures(contextManifest, observed, {
    ...environment,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
  }).failures.length === 0);
  assert.ok(checkoutIdentityFailures(contextManifest, observed, {
    ...environment,
    CONTEXT_PR_VALIDATION: 'false',
  }).failures.some((failure) => failure.includes('branch mismatch')));
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
  assert.equal(nextBuildingCard([p034, p022, p035]).id, 'P-035');
});

test('ContextReceipt selector uses the same blocker-aware next-card contract as product query', () => {
  const markdown = [
    ['P-012', 'Receipt capture', 'priority: 50\nblocker: none'],
    ['P-035', 'Membership repair', 'priority: 100\nblocker: P0-live-first-use'],
  ].map(([id, title, priority]) => `## ${id} - ${title}\n\n\`\`\`yaml\nid: ${id}\nstatus: building\n${priority}\noperator_next_action: Prove ${id}\n\`\`\``).join('\n\n');
  assert.deepEqual(activeProductCardFromMarkdown(markdown), {
    id: 'P-035',
    status: 'building',
    priority: 100,
    operator_next_action: 'Prove P-035',
  });
});

test('generated views keep operator priority separate from a universal user action', () => {
  const card = {
    ...base,
    id: 'P-035',
    title: 'Account, contact and membership lifecycle',
    next_action: 'Create my group',
    operator_next_action: 'Repair and prove shared-group creation',
    action_scope: 'First shared-group creation by a local participant',
    priority: '100',
    blocker: 'P0-live-first-use',
    pillar: 'Management',
  };
  const views = generatedViews([card]);
  assert.match(views.resume, /Current operator priority: P-035/u);
  assert.match(views.resume, /Operator next action: \*\*Repair and prove shared-group creation\*\*/u);
  assert.match(views.resume, /Bounded participant\/card action: \*\*Create my group\*\*/u);
  assert.match(views.resume, /Action audience and scope: participant/u);
  assert.doesNotMatch(views.resume, /First action:/u);
  assert.match(views.resume, /never becomes one universal action for every user/u);
});

test('benchmark baseline requires the stable outcome set and explicit E1/E2 boundary', () => {
  const rows = requiredBenchmarkIds.map((id) => `| ${id} | outcome | comparator | \`E1-public-source\` | Not executed | must-match |`).join('\n');
  const fixture = `# Benchmark\n\n**Kind:** guardrail\n**Status:** active\n**Owner:** product-research\n**Last reviewed:** 2026-08-27\n**Applies to:** chopdot-v1-launch\n**Authority:** category floor only\n\nStale E1 public source review; refresh required.\nE2 hands-on same-journey walkthrough remains open.\ncompetitive-gap-decisions-2026-06-23.md is superseded by DEC-009 and DEC-010.\nCategory language: add expense, who paid, who owes, settle up, recipient confirmed, group summary.\n${rows}`;
  assert.deepEqual(benchmarkBaselineFailures(fixture), []);
  const failures = benchmarkBaselineFailures(`${fixture}\n| BASE-ENTRY-01 | duplicate | comparator | \`E1-public-source\` | Not executed | must-match |\n| BASE-UNKNOWN-01 | unknown | comparator | \`E1-public-source\` | Not executed | must-match |`);
  assert.ok(failures.some((failure) => failure.includes('repeats BASE-ENTRY-01')));
  assert.ok(failures.some((failure) => failure.includes('unknown outcome id BASE-UNKNOWN-01')));
});

test('cards must cite known baseline outcomes and preserve open E2 status', () => {
  const known = new Set(requiredBenchmarkIds);
  const unknown = validateCards([{...base, id: 'P-034', benchmark_requirements: 'BASE-UNKNOWN-01'}], new Date('2026-08-24T12:00:00Z'), known);
  assert.ok(unknown.some((failure) => failure.includes('is not defined by product/benchmark-baseline.md')));
  const omitted = validateCards([{...base, id: 'P-034', benchmark_requirements: 'not-applicable: convenient', delivery_phase: 'phase-1-baseline'}], new Date('2026-08-24T12:00:00Z'), known);
  assert.ok(omitted.some((failure) => failure.includes('participant-facing cards must cite applicable benchmark outcomes')));
  const premature = validateCards([{...base, id: 'P-034', status: 'done'}], new Date('2026-08-24T12:00:00Z'), known);
  assert.ok(premature.some((failure) => failure.includes('E1 evidence with E2 open cannot support done status')));
});

test('card validation rejects a universal action scope', () => {
  for (const actionScope of ['all users', 'all participants', 'every Home state', 'universal route', 'everyone']) {
    const failures = validateCards([{...base, id: 'P-034', action_scope: actionScope}], new Date('2026-08-24T12:00:00Z'));
    assert.ok(failures.some((failure) => failure.includes('action_scope must name a bounded')), actionScope);
  }
});

test('participant cards cannot bypass the benchmark with internal not-applicable language', () => {
  const failures = validateCards([{
    ...base,
    id: 'P-034',
    benchmark_requirements: 'not-applicable: internal',
    benchmark_evidence_state: 'not-applicable-internal',
    benchmark_scope: 'applies',
    delivery_phase: 'phase-0-grounding',
  }], new Date('2026-08-24T12:00:00Z'));
  assert.ok(failures.some((failure) => failure.includes('participant-facing cards must cite applicable benchmark outcomes')));
});

test('the benchmark-registry package preserves its honest E1 and E2 evidence state', () => {
  const failures = validateCards([{
    ...base,
    id: 'P-013',
    audience: 'operator',
    journey: 'The product evaluator defines the category floor.',
    action_scope: 'Product evaluator reviewing the benchmark registry',
    delivery_phase: 'phase-0-grounding',
    benchmark_requirements: 'not-applicable: this package defines the benchmark registry',
    benchmark_scope: 'defines-registry',
  }], new Date('2026-08-24T12:00:00Z'));
  assert.equal(failures.filter((failure) => failure.includes('benchmark')).length, 0, failures.join('; '));
});

test('card audience and action scope must agree', () => {
  const operatorFailures = validateCards([{
    ...base,
    id: 'P-030',
    audience: 'operator',
    journey: 'Mina opens the app.',
    action_scope: 'Open the app',
  }], new Date('2026-08-24T12:00:00Z'));
  assert.ok(operatorFailures.some((failure) => failure.includes('operator cards must name an operator role')));

  const participantFailures = validateCards([{
    ...base,
    id: 'P-034',
    action_scope: 'Release integrator reviewing the frozen candidate',
  }], new Date('2026-08-24T12:00:00Z'));
  assert.ok(participantFailures.some((failure) => failure.includes('participant cards cannot use an operator action_scope')));
});

test('card validation requires the prioritization outcome contract', () => {
  const card = {...base, id: 'P-034'};
  delete card.expected_outcome;
  delete card.exit_condition;
  const failures = validateCards([card], new Date('2026-08-24T12:00:00Z'));
  assert.ok(failures.includes('P-034: missing expected_outcome'));
  assert.ok(failures.includes('P-034: missing exit_condition'));
});

test('card validation requires at least two explicit alternative cards', () => {
  const failures = validateCards([{...base, id: 'P-034', alternatives_not_now: 'P-012 remains later.'}], new Date('2026-08-24T12:00:00Z'));
  assert.ok(failures.includes('P-034: alternatives_not_now must name at least two distinct Cockpit cards'));
});

test('product score remains separate from card ordering', () => {
  const higherScore = {...base, id: 'P-012', score: '10/10', priority: '20'};
  const lowerScore = {...base, id: 'P-035', score: '8/10', priority: '100'};
  assert.equal(rankCards([higherScore, lowerScore])[0].id, 'P-035');
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
