import assert from 'node:assert/strict';
import { createCanonicalMaterializationState } from './materialization-state.mjs';

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const rejects = (fn, message) => { checks += 1; assert.throws(fn, undefined, message); };

const NAMESPACE = 'phase-c1:live-authority';
const authorizedMoney = { minorUnits: 10000n, currency: 'USD', exponent: 2 };
const money = (units, exponent = 2) => ({ minorUnits: BigInt(units), currency: 'USD', exponent });
const expected = ({ ref, kind, parent = null, spend = 'sp_live', operation = 'op_live' }) => ({
  spend_intent_id: spend,
  operation_id: operation,
  authoritative_effect_ref: ref,
  effect_kind: kind,
  authoritative_parent_effect_ref: parent
});
const apply = (state, { ref, kind, units, parent = null, exponent = 2, spend = 'sp_live', operation = 'op_live' }) =>
  state.materialize({
    state: ['refund', 'reversal'].includes(kind) ? 'reversed' : (kind === 'partial_capture' ? 'partial' : 'captured'),
    proofAccepted: true,
    expected: expected({ ref, kind, parent, spend, operation }),
    effectMoney: money(units, exponent),
    authorizedMoney
  });

const sameHead = (left, right) =>
  left?.head_version === right?.head_version &&
  left?.domain === right?.domain &&
  left?.namespace === right?.namespace &&
  left?.snapshot_version === right?.snapshot_version &&
  left?.generation === right?.generation &&
  left?.lineage_digest === right?.lineage_digest;

const transitionHead = (next, prior) => ({
  ...next,
  prior_generation: prior.generation,
  prior_lineage_digest: prior.lineage_digest,
  owner_scoped_cas_token: `cas:${prior.generation}:${prior.lineage_digest}->${next.generation}:${next.lineage_digest}`
});

const makeFence = ({
  resolveHead,
  publishHead = () => {},
  beforeCommit = () => {},
  loseCas = () => false,
  storageFailure = () => false,
  rejectAfterCommit = () => false,
  onCommit = () => {}
}) => ({ expected_head, next_head, commit }) => {
  if (!sameHead(resolveHead(), expected_head)) return false;
  beforeCommit({ expected_head, next_head });
  if (!sameHead(resolveHead(), expected_head)) return false;
  if (next_head && loseCas()) return false;
  if (next_head && storageFailure()) throw new Error('simulated live materialization fence/storage failure');
  const committed = commit();
  onCommit({ expected_head, next_head });
  if (next_head && rejectAfterCommit()) return false;
  if (committed !== true) return false;
  if (next_head) publishHead(transitionHead(next_head, expected_head));
  return true;
};

const createAcceptedState = ({ snapshot, checkpoint, headRef, fence }) => {
  const state = createCanonicalMaterializationState({
    persistenceNamespace: NAMESPACE,
    resolveAuthoritativeHead: () => headRef.current,
    commitUnderAuthoritativeHeadFence: fence
  });
  eq(state.restore(snapshot, checkpoint), true, 'accepted-state fixture restores under exact authoritative head');
  return state;
};

// Local construction before an authoritative head is accepted is quarantined state.
let seedHead = null;
const seed = createCanonicalMaterializationState({
  persistenceNamespace: NAMESPACE,
  resolveAuthoritativeHead: () => seedHead
});
eq(apply(seed, { ref: 'rail:cap:A', kind: 'capture', units: 1000 }), true, 'quarantined seed may prepare capture A');
eq(apply(seed, { ref: 'rail:cap:B', kind: 'capture', units: 4000 }), true, 'quarantined seed may prepare capture B');
eq(apply(seed, { ref: 'rail:refund:A:600', kind: 'refund', units: 600, parent: 'rail:cap:A' }), true, 'quarantined seed may prepare bounded refund');
const c3Snapshot = seed.snapshot();
const c3Checkpoint = seed.checkpoint();
const c3Head = seed.headCandidate();

// Accept C3, then prove normal post-restore materialization occurs inside the seam
// and advances the independently authoritative head in the same fenced operation.
const authority = { current: c3Head };
let liveFenceCommits = 0;
const normalFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  onCommit: ({ next_head }) => { if (next_head) liveFenceCommits += 1; }
});
const processA = createAcceptedState({ snapshot: c3Snapshot, checkpoint: c3Checkpoint, headRef: authority, fence: normalFence });
eq(apply(processA, { ref: 'rail:reversal:A:400', kind: 'reversal', units: 400, parent: 'rail:cap:A' }), true, 'accepted C3 live mutation succeeds only through authoritative fence');
eq(liveFenceCommits, 1, 'valid post-restore mutation invokes authoritative live fence exactly once');
eq(processA.getEffect('sp_live', 'op_live', 'rail:cap:A').remaining_unadjusted_units, 0n, 'valid fenced mutation exhausts exact parent once');
eq(sameHead(authority.current, processA.headCandidate()), true, 'valid fenced mutation publishes the exact next authoritative head');

eq(apply(processA, { ref: 'rail:refund:B:1', kind: 'refund', units: 1, parent: 'rail:cap:B' }), true, 'C4 to C5 live mutation succeeds under exact-head fence');
const c5Snapshot = processA.snapshot();
const c5Checkpoint = processA.checkpoint();
const c5Head = processA.headCandidate();
eq(sameHead(authority.current, c5Head), true, 'C5 local and independent authoritative heads match');

// Reviewer acceptance case: A restores C5; B advances C5->C6 and consumes parent B;
// stale A must not admit any C5 financial mutation after the fence is released.
const staleA = createAcceptedState({ snapshot: c5Snapshot, checkpoint: c5Checkpoint, headRef: authority, fence: normalFence });
const processB = createAcceptedState({ snapshot: c5Snapshot, checkpoint: c5Checkpoint, headRef: authority, fence: normalFence });
eq(apply(processB, { ref: 'rail:refund:B:3999', kind: 'refund', units: 3999, parent: 'rail:cap:B' }), true, 'competing process B advances C5 to C6 and consumes remaining B capacity');
const c6Snapshot = processB.snapshot();
const c6Checkpoint = processB.checkpoint();
const c6Head = processB.headCandidate();
eq(sameHead(authority.current, c6Head), true, 'independent authority is now C6');
const beforeStaleAttempt = staleA.snapshot();
eq(apply(staleA, { ref: 'rail:refund:B:stale', kind: 'refund', units: 1, parent: 'rail:cap:B' }), false, 'stale C5 post-restore materialization fails closed after authority advances to C6');
eq(staleA.snapshot(), beforeStaleAttempt, 'stale C5 rejection causes zero aggregate/parent/dedupe/effect/generation mutation');
eq(staleA.getEffect('sp_live', 'op_live', 'rail:cap:B').remaining_unadjusted_units, 3999n, 'stale process cannot consume parent capacity already consumed by C6');

// Build a competing C7 head without touching the shared authoritative namespace.
const isolatedAuthority = { current: c6Head };
const isolatedFence = makeFence({
  resolveHead: () => isolatedAuthority.current,
  publishHead: head => { isolatedAuthority.current = head; }
});
const isolated = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: isolatedAuthority, fence: isolatedFence });
eq(apply(isolated, { ref: 'rail:cap:C:competing', kind: 'capture', units: 100 }), true, 'isolated competitor constructs a valid C7 descendant');
const c7Head = isolated.headCandidate();

// Head invalidation inside the fence must block commit with zero local mutation.
authority.current = c6Head;
let injectC7 = false;
const invalidatingFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  beforeCommit: ({ next_head }) => { if (injectC7 && next_head) authority.current = c7Head; }
});
const invalidationProbe = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: authority, fence: invalidatingFence });
const beforeInvalidation = invalidationProbe.snapshot();
injectC7 = true;
eq(apply(invalidationProbe, { ref: 'rail:cap:D:raced', kind: 'capture', units: 100 }), false, 'head invalidation during live materialization fence rejects the stale commit');
eq(invalidationProbe.snapshot(), beforeInvalidation, 'fence invalidation leaves accepted local state byte-for-byte structurally unchanged');

// Competing next-head CAS loss must reject before commit.
authority.current = c6Head;
let loseNextCas = false;
const casFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  loseCas: () => loseNextCas
});
const casProbe = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: authority, fence: casFence });
const beforeCasLoss = casProbe.snapshot();
loseNextCas = true;
eq(apply(casProbe, { ref: 'rail:cap:D:cas-loss', kind: 'capture', units: 100 }), false, 'competing next-head CAS loss rejects live materialization');
eq(casProbe.snapshot(), beforeCasLoss, 'CAS loss leaves aggregate/parent/dedupe/effect/generation unchanged');

// Storage/fence failure and even commit-then-reject both roll local state back.
authority.current = c6Head;
let failStorage = false;
const failingFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  storageFailure: () => failStorage
});
const storageProbe = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: authority, fence: failingFence });
const beforeStorageFailure = storageProbe.snapshot();
failStorage = true;
rejects(() => apply(storageProbe, { ref: 'rail:cap:D:storage', kind: 'capture', units: 100 }), 'live fence/storage failure is surfaced');
eq(storageProbe.snapshot(), beforeStorageFailure, 'live fence/storage failure causes zero accepted local mutation');

authority.current = c6Head;
let rejectAfterCommit = false;
const postCommitRejectFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  rejectAfterCommit: () => rejectAfterCommit
});
const postCommitProbe = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: authority, fence: postCommitRejectFence });
const beforePostCommitReject = postCommitProbe.snapshot();
rejectAfterCommit = true;
eq(apply(postCommitProbe, { ref: 'rail:cap:D:post-commit-reject', kind: 'capture', units: 100 }), false, 'fence rejection after tentative callback commit is treated as failed live materialization');
eq(postCommitProbe.snapshot(), beforePostCommitReject, 'post-commit fence rejection rolls local state back to the exact prior accepted state');

// Duplicate/out-of-order/proof-partition failures stay fail-closed before the fence.
authority.current = c6Head;
let validationFenceCalls = 0;
const validationFence = makeFence({
  resolveHead: () => authority.current,
  publishHead: head => { authority.current = head; },
  onCommit: ({ next_head }) => { if (next_head) validationFenceCalls += 1; }
});
const validationProbe = createAcceptedState({ snapshot: c6Snapshot, checkpoint: c6Checkpoint, headRef: authority, fence: validationFence });
const beforeValidationFailures = validationProbe.snapshot();
eq(apply(validationProbe, { ref: 'rail:refund:B:3999', kind: 'refund', units: 3999, parent: 'rail:cap:B' }), false, 'duplicate authoritative effect cannot rematerialize after restart');
eq(apply(validationProbe, { ref: 'rail:refund:missing-parent', kind: 'refund', units: 1, parent: 'rail:cap:missing' }), false, 'out-of-order adjustment without authoritative parent fails closed');
eq(apply(validationProbe, { ref: 'rail:cap:wrong-partition', kind: 'capture', units: 100, exponent: 3 }), false, 'MoneyV1 partition mismatch fails closed');
eq(validationFenceCalls, 0, 'invalid duplicate/out-of-order/partition candidates never reach the authority fence');
eq(validationProbe.snapshot(), beforeValidationFailures, 'validation failures preserve exact accepted state');

// Normal account of the invariant: a fresh valid effect still works when C6 is current.
eq(apply(validationProbe, { ref: 'rail:cap:C:valid', kind: 'capture', units: 100 }), true, 'valid post-restore live mutation remains available under the exact current-head fence');
eq(validationFenceCalls, 1, 'valid live mutation reaches the fence once');
eq(sameHead(authority.current, validationProbe.headCandidate()), true, 'valid mutation publishes and accepts one exact next head');

console.log(JSON.stringify({ suite: 'phase-c1-live-materialization-authority', checks, result: 'pass' }));
