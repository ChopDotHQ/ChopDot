import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import { digestObject, normalizeRoot } from './core.mjs';
import { contractRoot } from './contract.mjs';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

export function observeCandidateIdentity(rootInput) {
  const root = normalizeRoot(rootInput);
  const gitRoot = normalizeRoot(git(root, ['rev-parse', '--show-toplevel']));
  if (realpathSync(gitRoot) !== realpathSync(root)) throw new Error(`Git top-level differs from requested root: ${gitRoot}`);
  const observedRoot = root;
  const branch = git(root, ['branch', '--show-current']);
  const commit = git(root, ['rev-parse', 'HEAD']);
  const tree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const statusText = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  const gitStatus = statusText ? statusText.split('\n') : [];
  const identity = { root: observedRoot, branch, commit, tree, git_status: gitStatus };
  return { ...identity, clean: gitStatus.length === 0, candidate_digest: digestObject(identity) };
}

export function validateCandidateIdentity(identity, options = {}) {
  const issues = [];
  if (!identity || typeof identity !== 'object') return { valid: false, issues: ['candidate identity is missing'] };
  if (!identity.root || !path.isAbsolute(identity.root) || normalizeRoot(identity.root) !== identity.root) issues.push('candidate root is not normalized and absolute');
  if (!identity.branch) issues.push('candidate branch is missing or detached');
  for (const field of ['commit', 'tree']) if (!/^[0-9a-f]{40}$/.test(identity[field] ?? '')) issues.push(`candidate ${field} is not a 40-character Git SHA`);
  if (!Array.isArray(identity.git_status) || identity.git_status.some((entry) => typeof entry !== 'string' || !entry)) issues.push('candidate Git status is incomplete');
  if (options.expectedRoot && normalizeRoot(identity.root) !== normalizeRoot(options.expectedRoot)) issues.push('candidate root differs from contract root');
  if (options.expectedBranch && identity.branch !== options.expectedBranch) issues.push('candidate branch differs from contract branch');
  if (options.requireClean && identity.git_status.length) issues.push(`candidate worktree is dirty (${identity.git_status.length} path entries)`);
  const unsigned = { root: identity.root, branch: identity.branch, commit: identity.commit, tree: identity.tree, git_status: identity.git_status };
  if (identity.candidate_digest && identity.candidate_digest !== digestObject(unsigned)) issues.push('candidate identity digest mismatch');
  return { valid: issues.length === 0, issues, candidate_digest: digestObject(unsigned) };
}

export function assertCurrentCandidate(contract, options = {}) {
  const observed = observeCandidateIdentity(contractRoot(contract));
  const validation = validateCandidateIdentity(observed, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: options.requireClean });
  if (!validation.valid) throw new Error(`Candidate identity rejected: ${validation.issues.join('; ')}`);
  if (options.expected) {
    const expectedValidation = validateCandidateIdentity(options.expected, { expectedRoot: contractRoot(contract), expectedBranch: contract.scope.branch, requireClean: options.requireClean });
    if (!expectedValidation.valid) throw new Error(`Explicit candidate identity rejected: ${expectedValidation.issues.join('; ')}`);
    if (validation.candidate_digest !== expectedValidation.candidate_digest) throw new Error('Explicit candidate identity does not match current worktree readback');
  }
  return observed;
}

export function persistedCandidateIdentity(identity) {
  return { root: identity.root, branch: identity.branch, commit: identity.commit, tree: identity.tree, git_status: [...identity.git_status] };
}
