import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { contractCreatorId, contractProfileId, contractRoot, digestContract } from './contract.mjs';
import { readJson, writeJsonAtomic } from './core.mjs';
import { markInterruptedEffects } from './effects.mjs';
import {
  acquireLease, appendEvent, budgetStatus, checkpoint, rebuildSnapshot,
  releaseLease, terminate,
} from './ledger.mjs';
import { validateAgentContract } from './validate.mjs';
import { executeRunPreflight } from './preflight.mjs';

export async function startRun(contract, options = {}) {
  const exactRoot = contractRoot(contract);
  const preflight = await executeRunPreflight(contract, options);
  if (!preflight.accepted) throw new Error(`Agent preflight failed: ${preflight.issues.map((entry) => `${entry.gate}:${entry.path}: ${entry.message}`).join('; ')}`);
  const runsRoot = path.resolve(options.runsRoot ?? path.join(exactRoot, 'output', 'agent-runs'));
  const runDirectory = path.join(runsRoot, contract.run_id);
  await mkdir(runsRoot, { recursive: true });
  try { await access(runDirectory); throw new Error(`Run already exists: ${contract.run_id}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(runDirectory, { recursive: false });
  const contractDigest = digestContract(contract);
  await writeJsonAtomic(path.join(runDirectory, 'contract.json'), contract);
  await appendEvent(runDirectory, {
    run_id: contract.run_id,
    event_type: 'declared',
    actor: options.actor ?? contractCreatorId(contract),
    payload: { contract_digest: contractDigest, exact_root: exactRoot, loop_profile: contractProfileId(contract) },
  });
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'preflight_passed', payload: { exact_root: exactRoot, identity: preflight.identity, knowledge_receipt_ids: [preflight.knowledge?.health?.receipt_id, preflight.knowledge?.context?.request_id].filter(Boolean) } });
  await appendEvent(runDirectory, { run_id: contract.run_id, event_type: 'work_started', payload: { iteration: 0 } });
  return { run_directory: runDirectory, snapshot: await rebuildSnapshot(runDirectory, contract.run_id), preflight };
}

export async function resumeRun(runDirectory, options = {}) {
  const contract = await readJson(path.join(runDirectory, 'contract.json'));
  const validation = validateAgentContract(contract, { expectedRoot: options.expectedRoot ?? contractRoot(contract) });
  if (!validation.valid) throw new Error(`Cannot resume invalid contract: ${validation.issues.map((entry) => entry.message).join('; ')}`);
  const declared = await rebuildSnapshot(runDirectory, contract.run_id);
  if (!declared.contract_digest || declared.contract_digest !== digestContract(contract)) throw new Error('Cannot resume: persisted contract differs from the immutable declared contract digest');
  const lease = await acquireLease(runDirectory, { holder: options.holder, ttlMs: options.leaseTtlMs, now: options.now });
  try {
    let snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
    if (snapshot.terminal_state) return { contract, lease, snapshot, resumable: false, unresolved_effects: [] };
    const reconciled = await markInterruptedEffects(runDirectory, contract, options.actor);
    snapshot = reconciled.snapshot;
    const budget = budgetStatus(contract, snapshot, options.now);
    if (budget.exhausted.length) {
      await terminate(runDirectory, contract.run_id, 'budget_exhausted', { budget }, options.actor ?? 'runner', { now: options.now });
      snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
    }
    const unresolved = Object.values(snapshot.effects).filter((effect) => effect.state === 'unknown_needs_reconciliation');
    return { contract, lease, snapshot, resumable: !snapshot.terminal_state && unresolved.length === 0, unresolved_effects: unresolved };
  } catch (error) {
    await releaseLease(runDirectory, lease);
    throw error;
  }
}

export async function finishResume(runDirectory, lease) {
  await releaseLease(runDirectory, lease);
}

export async function cancelRun(runDirectory, options = {}) {
  const contract = await readJson(path.join(runDirectory, 'contract.json'));
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  if (snapshot.terminal_state) return snapshot;
  await markInterruptedEffects(runDirectory, contract, options.actor);
  await terminate(runDirectory, contract.run_id, 'cancelled', { reason: options.reason ?? 'operator_cancelled' }, options.actor ?? 'operator');
  return rebuildSnapshot(runDirectory, contract.run_id);
}

export async function terminateRun(runDirectory, terminalState, options = {}) {
  const allowed = ['failed_verification', 'blocked', 'approval_required', 'budget_exhausted', 'cancelled'];
  if (!allowed.includes(terminalState)) throw new Error('Direct termination permits non-success terminal states only; succeeded requires accepted evaluation finalization');
  const contract = await readJson(path.join(runDirectory, 'contract.json'));
  const snapshot = await rebuildSnapshot(runDirectory, contract.run_id);
  if (snapshot.terminal_state) throw new Error(`Run is already terminal: ${snapshot.terminal_state}`);
  if (terminalState === 'approval_required' && !Object.values(snapshot.approvals).some((approval) => approval.state === 'pending')) throw new Error('approval_required needs a pending recorded approval');
  if (terminalState === 'budget_exhausted') {
    const budget = budgetStatus(contract, snapshot, options.now);
    if (!budget.exhausted.length && !budget.exceeded.length) throw new Error('budget_exhausted needs an exhausted recorded budget');
  }
  await markInterruptedEffects(runDirectory, contract, options.actor);
  await terminate(runDirectory, contract.run_id, terminalState, options.details ?? {}, options.actor ?? 'operator', { now: options.now });
  return rebuildSnapshot(runDirectory, contract.run_id);
}

export async function checkpointRun(runDirectory, actor, options = {}) {
  const contract = await readJson(path.join(runDirectory, 'contract.json'));
  await checkpoint(runDirectory, contract.run_id, actor, options);
  return rebuildSnapshot(runDirectory, contract.run_id);
}
