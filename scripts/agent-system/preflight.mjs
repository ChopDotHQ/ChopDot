import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './core.mjs';
import { contractProfileId, contractRoot, loadLoopProfile } from './contract.mjs';
import { validateAgentContract, validateContractProfileAlignment, validateLoopProfile } from './validate.mjs';
import { loadGovernanceJson } from './schema.mjs';
import { assertKnowledgePort, validateKnowledgeContext, validateKnowledgeReceipt } from './adapters/port.mjs';

function gitIdentity(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return { root, branch: run(['branch', '--show-current']), head: run(['rev-parse', 'HEAD']), tree: run(['rev-parse', 'HEAD^{tree}']) };
}

function insideDeclaredScope(candidate, inPaths) {
  const normalized = String(candidate).replace(/^\.\//, '').replace(/\/$/, '');
  return inPaths.some((entry) => normalized === entry.replace(/\/$/, '') || normalized.startsWith(`${entry.replace(/\/$/, '')}/`));
}

export async function executeRunPreflight(contract, options = {}) {
  const issues = [];
  const root = contractRoot(contract);
  const validation = validateAgentContract(contract, { expectedRoot: options.expectedRoot ?? root });
  issues.push(...validation.issues.map((entry) => ({ gate: 'contract_schema', ...entry })));

  let profile = null;
  try {
    profile = loadLoopProfile(contractProfileId(contract));
    const profileValidation = validateLoopProfile(profile);
    issues.push(...profileValidation.issues.map((entry) => ({ gate: 'profile_schema', ...entry })));
    const alignment = validateContractProfileAlignment(contract, profile);
    issues.push(...alignment.issues.map((entry) => ({ gate: 'profile_alignment', ...entry })));
  } catch (error) { issues.push({ gate: 'profile_load', path: 'loop_profile', message: error.message, code: 'missing_profile' }); }

  const retryPolicy = loadGovernanceJson('policies', 'retry-budgets.json');
  const authorityPolicy = loadGovernanceJson('policies', 'authority-boundaries.json');
  const inPaths = contract.scope?.in_paths ?? [];
  for (const candidate of contract.authority?.allowed_writes ?? []) if (!insideDeclaredScope(candidate, inPaths)) issues.push({ gate: 'authority', path: 'authority.allowed_writes', message: `Write scope expansion is forbidden: ${candidate}`, code: 'authority_expansion' });
  const external = (contract.authority?.external_effects ?? []).filter((effect) => effect !== 'none');
  if (external.length && !(contract.authority?.required_approvals ?? []).length) issues.push({ gate: 'authority', path: 'authority.required_approvals', message: 'External effects require an explicit approval boundary', code: 'missing_approval' });
  if (!Array.isArray(authorityPolicy.classes) || !authorityPolicy.classes.length || !Array.isArray(retryPolicy.budgets) || !retryPolicy.budgets.length) issues.push({ gate: 'policy', path: 'policies', message: 'Authority and retry policy catalogs must be non-empty', code: 'empty_policy' });

  try { await access(root); } catch { issues.push({ gate: 'worktree', path: 'scope.root', message: 'Exact root does not exist', code: 'wrong_root' }); }
  let observedIdentity = options.observedIdentity;
  try { observedIdentity ??= gitIdentity(root); }
  catch (error) { issues.push({ gate: 'worktree', path: 'scope', message: `Git identity unavailable: ${error.message}`, code: 'git_unavailable' }); }
  if (observedIdentity) {
    if (observedIdentity.branch !== contract.scope?.branch) issues.push({ gate: 'worktree', path: 'scope.branch', message: `Expected ${contract.scope?.branch}, observed ${observedIdentity.branch}`, code: 'wrong_branch' });
    if (observedIdentity.head !== contract.scope?.starting_head) issues.push({ gate: 'worktree', path: 'scope.starting_head', message: `Expected ${contract.scope?.starting_head}, observed ${observedIdentity.head}`, code: 'stale_head' });
    if (observedIdentity.tree !== contract.scope?.starting_tree) issues.push({ gate: 'worktree', path: 'scope.starting_tree', message: `Expected ${contract.scope?.starting_tree}, observed ${observedIdentity.tree}`, code: 'stale_tree' });
  }

  for (const [index, source] of (contract.context?.governing_sources ?? []).entries()) {
    const absolute = path.resolve(root, source.path);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) { issues.push({ gate: 'context', path: `context.governing_sources.${index}.path`, message: 'Governing source escapes exact root', code: 'cross_root' }); continue; }
    try {
      const bytes = await readFile(absolute);
      if (sha256(bytes) !== source.sha256) issues.push({ gate: 'context', path: `context.governing_sources.${index}.sha256`, message: `Governing source digest changed: ${source.path}`, code: 'stale_source' });
    } catch (error) { issues.push({ gate: 'context', path: `context.governing_sources.${index}.path`, message: `Governing source unavailable: ${source.path} (${error.code ?? error.message})`, code: 'source_unavailable' }); }
    const ageSeconds = (Date.now() - Date.parse(source.observed_at)) / 1_000;
    if (!Number.isFinite(ageSeconds) || ageSeconds > contract.context.max_age_seconds) issues.push({ gate: 'context', path: `context.governing_sources.${index}.observed_at`, message: `Governing source observation is stale: ${source.path}`, code: 'stale_context' });
  }

  let knowledge = null;
  if (contract.knowledge_policy?.preflight_required) {
    if (!options.knowledgeAdapter) issues.push({ gate: 'knowledge', path: 'knowledge_policy.preflight_required', message: 'Knowledge preflight is required but no adapter was configured', code: 'knowledge_adapter_missing' });
    else {
      try {
        const adapter = assertKnowledgePort(options.knowledgeAdapter);
        const health = await adapter.health();
        validateKnowledgeReceipt(health, 'health');
        if (!health.accepted || health.fallback_status === 'unavailable' || contract.knowledge_policy.disallowed_fallbacks.includes(health.fallback_status)) throw new Error(`Health rejected or disallowed fallback: ${health.fallback_status}`);
        const context = await adapter.read_context({ root, branch: contract.scope.branch, commit: contract.scope.starting_head, source_paths: contract.context.governing_sources.map((entry) => entry.path) }, contract.task.objective, 'contract-governing-sources');
        validateKnowledgeContext(context);
        if (path.resolve(context.scope.root) !== root || context.scope.branch !== contract.scope.branch || context.scope.commit !== contract.scope.starting_head) throw new Error('Knowledge context scope does not match requested exact root, branch, and commit');
        if (context.freshness.status !== 'fresh' || context.stale_reasons.length) throw new Error(`Knowledge context is stale: ${context.stale_reasons.join(',')}`);
        if (!context.citations.length || !context.source_identities.length) throw new Error('Knowledge context lacks citations and source identities');
        const sources = new Map(context.source_identities.map((entry) => [entry.source_identity_id, entry]));
        for (const source of context.source_identities) if (path.resolve(source.root) !== root || source.branch !== contract.scope.branch || source.commit !== contract.scope.starting_head) throw new Error(`Cited source identity ${source.source_identity_id} is not bound to the requested exact worktree`);
        const citationIds = new Set();
        for (const citation of context.citations) {
          if (!sources.has(citation.source_identity_id)) throw new Error(`Citation ${citation.citation_id} references an unknown source identity`);
          citationIds.add(citation.citation_id);
        }
        for (const fact of context.facts) for (const citationId of fact.citation_ids ?? []) if (!citationIds.has(citationId)) throw new Error(`Fact ${fact.fact_id} references an unknown citation`);
        knowledge = { health, context };
      } catch (error) { issues.push({ gate: 'knowledge', path: 'knowledge_policy', message: error.message, code: 'knowledge_preflight_failed' }); }
    }
  }
  return { accepted: issues.length === 0, root, profile_id: profile?.profile_id ?? null, identity: observedIdentity ?? null, knowledge, issues };
}
