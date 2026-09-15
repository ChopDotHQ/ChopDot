import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const spend = JSON.parse(fs.readFileSync(path.join(here, 'spend-intent.contract.json'), 'utf8'));
const recovery = spend.recovery;

let checks = 0;
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };

eq(recovery.authoritative_restore_head_required, true, 'restore requires an authoritative head');
eq(recovery.authoritative_restore_head_source, 'independent_of_backup_snapshot', 'head authority is independent of backup/snapshot');
eq(recovery.authoritative_restore_head_domain, 'SPEND-01:materialization', 'head is bound to the SPEND-01 materialization domain');
eq(recovery.authoritative_restore_head_exact_namespace_binding_required, true, 'head requires exact persistence namespace binding');
eq(recovery.authoritative_restore_head_monotonic, true, 'accepted restore head is monotonic');
eq(recovery.older_generation_may_replace_newer_accepted_head, false, 'older generation cannot replace newer accepted head');
eq(recovery.same_generation_different_digest_is_fork, true, 'same-generation different-digest state is a fork');
eq(recovery.restart_must_resolve_current_authoritative_head_before_restore, true, 'restart resolves current head before restore');
eq(recovery.in_process_restore_may_reduce_accepted_frontier, false, 'in-process restore cannot reduce accepted frontier');
eq(recovery.snapshot_or_checkpoint_pair_may_self_authorize, false, 'snapshot/checkpoint pair cannot self-authorize');
eq(recovery.failed_rollback_or_fork_restore_is_atomic, true, 'failed rollback/fork restore is atomic');
eq(recovery.authoritative_head_advancement_is_separate_from_backup_restore, true, 'head advancement is separate from backup restore');
eq(recovery.head_advancement_requires_owner_scoped_cas_or_equivalent, true, 'head advancement requires owner-scoped CAS or equivalent');

console.log(JSON.stringify({ suite: 'phase-c1-restore-authority-contract', checks, result: 'pass' }));
