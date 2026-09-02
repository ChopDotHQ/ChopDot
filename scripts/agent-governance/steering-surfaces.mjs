#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { canonicalize, digestObject, parseArgs, sha256File } from './lib.mjs';
import { validateGovernanceInstance } from '../agent-system/schema.mjs';

export const REGISTRY_PATH = 'governance/agent-system/steering-surface-registry.v1.json';
export const GENERATED_ROOT = '.governance-build';
const FRAMEWORK_SCHEMA_PATH = 'governance/agent-system/contracts/definition-framework.v1.schema.json';
const PROFILE_SCHEMA_PATH = 'governance/agent-system/contracts/definition-profile.v1.schema.json';
const LIFECYCLES = new Set(['candidate', 'active', 'degraded', 'deprecated', 'quarantined', 'superseded', 'retired', 'historical']);
const NON_ACTIVATING = new Set(['quarantined', 'superseded', 'retired']);
const REQUIRED_CONTRACT_FIELDS = new Set([
  'decision_target', 'authoritative_inputs', 'expected_outcome', 'evaluation_criteria',
  'proving_evidence', 'failure_or_blocker', 'owner_and_authority', 'retry_and_exit',
]);
const PACKAGE_MANIFEST_POLICY = Object.freeze({
  excluded_directory_names: Object.freeze(['.cache', '.mypy_cache', '.pytest_cache', '.ruff_cache', '__pycache__']),
  excluded_file_names: Object.freeze(['.DS_Store']),
  excluded_file_suffixes: Object.freeze(['.pyc']),
});

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function gitPaths(root, args) {
  const value = execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return value.split('\0').filter(Boolean).map((entry) => entry.replaceAll('\\', '/')).sort();
}

function unique(values) {
  return [...new Set(values)];
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function safeRelative(value) {
  return typeof value === 'string' && value.length > 0 && !path.isAbsolute(value)
    && !value.split(/[\\/]/u).includes('..') && !value.includes('\0');
}

export function globToRegExp(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*') {
      if (pattern[index + 1] === '*') {
        source += '.*';
        index += 1;
      } else source += '[^/]*';
    } else if (char === '?') source += '[^/]';
    else source += char.replace(/[|\\{}()[\]^$+?.]/gu, '\\$&');
  }
  return new RegExp(`${source}$`, 'u');
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(file));
}

function fileIdentity(root, relative) {
  const file = path.join(root, relative);
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error(`repository steering surface is a symlink: ${relative}`);
  if (!stat.isFile()) throw new Error(`repository steering surface is not a regular file: ${relative}`);
  return { sha256: sha256File(file), bytes: stat.size };
}

function aggregateManifest(entries) {
  const bytes = entries.map((entry) => `${entry.path}\0${entry.sha256}\n`).join('');
  return createHash('sha256').update(bytes).digest('hex');
}

function excludedFromPackageManifest(item, { directory = false } = {}) {
  if (PACKAGE_MANIFEST_POLICY.excluded_file_names.includes(item)) return true;
  if (directory && PACKAGE_MANIFEST_POLICY.excluded_directory_names.includes(item)) return true;
  return !directory && PACKAGE_MANIFEST_POLICY.excluded_file_suffixes.some((suffix) => item.endsWith(suffix));
}

function directoryManifest(directory) {
  const entries = [];
  function visit(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      if (excludedFromPackageManifest(item.name, { directory: item.isDirectory() })) continue;
      const absolute = path.join(current, item.name);
      const relative = path.relative(directory, absolute).replaceAll('\\', '/');
      if (item.isSymbolicLink()) throw new Error(`external package contains a symlink: ${relative}`);
      if (item.isDirectory()) visit(absolute);
      else if (item.isFile()) entries.push({ path: relative, sha256: sha256File(absolute) });
    }
  }
  visit(directory);
  entries.sort((left, right) => compareText(left.path, right.path));
  return { file_count: entries.length, manifest_sha256: aggregateManifest(entries) };
}

function externalLocatorKey(base, relative) {
  return `${base}\0${relative.replaceAll('\\', '/')}`;
}

function walkExternalDiscovery(directory, patterns) {
  const candidates = [];
  const unsafe = [];
  function visit(current) {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, item.name);
      const relative = path.relative(directory, absolute).replaceAll('\\', '/');
      if (item.isSymbolicLink()) {
        unsafe.push(relative);
        continue;
      }
      if (item.isDirectory()) visit(absolute);
      else if (item.isFile() && matchesAny(relative, patterns)) candidates.push(relative);
    }
  }
  visit(directory);
  candidates.sort(compareText);
  unsafe.sort(compareText);
  return { candidates, unsafe };
}

export function loadSteeringRegistry(root, registryPath = REGISTRY_PATH) {
  const resolved = path.resolve(root, registryPath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function validateOutcome(owner, outcome, issues) {
  if (!outcome || typeof outcome.statement !== 'string' || outcome.statement.length < 15) issues.push(`${owner}: expected outcome statement is missing or subjective`);
  if (!Array.isArray(outcome?.evidence) || !outcome.evidence.length) issues.push(`${owner}: proving evidence is required`);
  if (typeof outcome?.failure !== 'string' || outcome.failure.length < 10) issues.push(`${owner}: failure or blocker behavior is required`);
  if (typeof outcome?.retry_exit !== 'string' || outcome.retry_exit.length < 10) issues.push(`${owner}: retry and exit behavior is required`);
}

function validateAuthority(owner, authority, issues) {
  if (!Array.isArray(authority?.may_influence) || !authority.may_influence.length) issues.push(`${owner}: allowed cognitive influence is required`);
  if (!Array.isArray(authority?.must_not_decide) || !authority.must_not_decide.length) issues.push(`${owner}: forbidden cognitive influence is required`);
}

function validateCommonSurface(surface, issues, { external = false } = {}) {
  if (!surface?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(surface.id)) issues.push(`${surface?.id ?? '(missing id)'}: invalid stable ID`);
  if (!LIFECYCLES.has(surface?.lifecycle)) issues.push(`${surface?.id ?? '(missing id)'}: invalid lifecycle`);
  if (!surface?.accountable_owner) issues.push(`${surface?.id ?? '(missing id)'}: accountable owner is required`);
  if (!Array.isArray(surface?.patterns) || !surface.patterns.length) issues.push(`${surface?.id ?? '(missing id)'}: at least one discovery pattern is required`);
  for (const pattern of surface?.patterns ?? []) if (!safeRelative(pattern)) issues.push(`${surface.id}: pattern must be repository-relative`);
  if (NON_ACTIVATING.has(surface?.lifecycle) && surface.activation_mode !== 'disabled') issues.push(`${surface.id}: ${surface.lifecycle} surfaces must be disabled`);
  if (surface?.lifecycle === 'candidate' && !['explicit_only', 'disabled'].includes(surface.activation_mode)) issues.push(`${surface.id}: candidate surfaces cannot activate automatically`);
  validateAuthority(surface?.id, surface?.authority, issues);
  validateOutcome(surface?.id, surface?.expected_outcome, issues);
  if (external) {
    if (!['optional', 'recommended', 'required'].includes(surface.presence_policy)) issues.push(`${surface.id}: invalid presence policy`);
    if (!['exact_worktree_root', 'canonical_repo_root', 'autobots_root'].includes(surface.locator?.base) || !safeRelative(surface.locator?.path)) issues.push(`${surface.id}: external locator must use an approved logical root and relative path`);
    if (surface.trusted_sha256 !== null && !/^[0-9a-f]{64}$/u.test(surface.trusted_sha256 ?? '')) issues.push(`${surface.id}: invalid trusted SHA-256`);
    if (surface.locator?.path?.endsWith('/SKILL.md') && !/^[0-9a-f]{64}$/u.test(surface.trusted_package_manifest_sha256 ?? '')) issues.push(`${surface.id}: trusted package manifest SHA-256 is required`);
  }
}

function validateExternalDiscovery(discovery, issues) {
  const owner = discovery?.id ?? '(missing external discovery id)';
  if (!discovery?.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(discovery.id)) issues.push(`${owner}: invalid stable ID`);
  if (!discovery?.accountable_owner) issues.push(`${owner}: accountable owner is required`);
  if (discovery?.lifecycle !== 'active' || discovery?.activation_mode !== 'automatic') issues.push(`${owner}: external discovery must be active and automatic`);
  if (!['optional', 'recommended', 'required'].includes(discovery?.presence_policy)) issues.push(`${owner}: invalid presence policy`);
  if (!['exact_worktree_root', 'canonical_repo_root', 'autobots_root'].includes(discovery?.locator?.base)
    || !safeRelative(discovery?.locator?.path)) issues.push(`${owner}: external discovery locator must use an approved logical root and relative path`);
  if (!Array.isArray(discovery?.patterns) || !discovery.patterns.length) issues.push(`${owner}: at least one discovery pattern is required`);
  for (const pattern of discovery?.patterns ?? []) if (!safeRelative(pattern)) issues.push(`${owner}: discovery pattern must be relative`);
  validateAuthority(owner, discovery?.authority, issues);
  validateOutcome(owner, discovery?.expected_outcome, issues);
}

function externalDiscoveryCovers(discovery, surface) {
  if (discovery.locator.base !== surface.locator.base) return false;
  const root = discovery.locator.path.replace(/\/$/u, '');
  if (!surface.locator.path.startsWith(`${root}/`)) return false;
  const relative = surface.locator.path.slice(root.length + 1);
  return matchesAny(relative, discovery.patterns);
}

export function validateSteeringRegistry(registry) {
  const issues = [];
  try {
    const schema = validateGovernanceInstance(registry, 'steering-surface-registry.v1.schema.json');
    for (const issue of schema.issues) issues.push(`registry schema ${issue.path}: ${issue.message}`);
  } catch (error) {
    issues.push(`registry schema validation failed: ${error.message}`);
  }
  if (registry?.schema !== 'chopdot.steering-surface-registry.v1') issues.push('registry schema identity is invalid');
  if (registry?.registry_id !== 'chopdot-steering-surfaces') issues.push('registry ID is invalid');
  if (!/^\d+\.\d+\.\d+$/u.test(registry?.version ?? '')) issues.push('registry semantic version is invalid');
  if (!registry?.accountable_owner) issues.push('registry accountable owner is required');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(registry?.reviewed_on ?? '')) issues.push('registry review date is invalid');
  if (!Number.isInteger(registry?.review_interval_days) || registry.review_interval_days < 1) issues.push('registry review interval is invalid');
  if (!Array.isArray(registry?.discovery_roots) || !registry.discovery_roots.length) issues.push('registry discovery roots are required');
  // Machine-local censuses (.claude, .cursor, .agents) are optional. Private and
  // machine-local material must never be required for normal repository operation.
  if (!Array.isArray(registry?.external_discovery)) issues.push('external discovery censuses must be an array');
  for (const root of registry?.discovery_roots ?? []) if (!safeRelative(root)) issues.push(`discovery root must be relative: ${root}`);
  for (const group of registry?.surface_groups ?? []) validateCommonSurface(group, issues);
  for (const discovery of registry?.external_discovery ?? []) validateExternalDiscovery(discovery, issues);
  for (const surface of registry?.external_surfaces ?? []) validateCommonSurface(surface, issues, { external: true });
  for (const surface of registry?.runtime_classes ?? []) {
    if (!surface?.id) issues.push('runtime class ID is required');
    if (!surface?.accountable_owner) issues.push(`${surface?.id ?? '(runtime)'}: accountable owner is required`);
    validateAuthority(surface?.id, surface?.authority, issues);
    validateOutcome(surface?.id, surface?.expected_outcome, issues);
  }
  const ids = [...(registry?.surface_groups ?? []), ...(registry?.external_discovery ?? []), ...(registry?.external_surfaces ?? []), ...(registry?.runtime_classes ?? [])].map((entry) => entry.id);
  for (const id of unique(ids)) if (ids.filter((entry) => entry === id).length !== 1) issues.push(`duplicate steering surface ID: ${id}`);
  for (const surface of registry?.external_surfaces ?? []) {
    const isCanonicalSkill = surface.locator?.base === 'canonical_repo_root' && surface.locator?.path?.startsWith('.agents/skills/') && surface.locator.path.endsWith('/SKILL.md');
    const isCanonicalClaudeSkill = surface.locator?.base === 'canonical_repo_root' && surface.locator?.path?.startsWith('.claude/skills/') && surface.locator.path.endsWith('/SKILL.md');
    const isCanonicalCursorRule = surface.locator?.base === 'canonical_repo_root' && /^\.cursor\/rules\/[^/]+\.mdc$/u.test(surface.locator?.path ?? '');
    const isChopDotAgent = surface.locator?.base === 'autobots_root' && /^agentops\/registry\/agents\/chopdot.*\.json$/u.test(surface.locator?.path ?? '');
    if ((isCanonicalSkill || isCanonicalClaudeSkill || isCanonicalCursorRule || isChopDotAgent) && !(registry?.external_discovery ?? []).some((entry) => externalDiscoveryCovers(entry, surface))) {
      issues.push(`${surface.id}: external surface is not covered by a declared discovery census`);
    }
  }
  const lifecycleById = new Map([
    ...(registry?.surface_groups ?? []),
    ...(registry?.external_discovery ?? []),
    ...(registry?.external_surfaces ?? []),
    ...(registry?.runtime_classes ?? []),
  ].map((entry) => [entry.id, entry.lifecycle]));
  const reviewIds = (registry?.lifecycle_reviews ?? []).map((entry) => entry.surface_id);
  for (const id of unique(reviewIds)) if (reviewIds.filter((entry) => entry === id).length !== 1) issues.push(`duplicate lifecycle review: ${id}`);
  for (const [id, lifecycle] of lifecycleById) {
    const review = (registry?.lifecycle_reviews ?? []).find((entry) => entry.surface_id === id);
    if (!review) issues.push(`${id}: lifecycle review is required`);
    else if (review.lifecycle !== lifecycle) issues.push(`${id}: lifecycle review state ${review.lifecycle} does not match ${lifecycle}`);
  }
  for (const review of registry?.lifecycle_reviews ?? []) if (!lifecycleById.has(review.surface_id)) issues.push(`${review.surface_id}: lifecycle review targets an unknown surface`);
  const outputPaths = Object.values(registry?.generated_outputs ?? {});
  for (const output of outputPaths) {
    if (!safeRelative(output)) issues.push(`generated output must be relative: ${output}`);
    else if (!output.startsWith(`${GENERATED_ROOT}/`) || output.split('/').includes('..')) {
      issues.push(`generated output must resolve strictly beneath ${GENERATED_ROOT}/: ${output}`);
    }
  }
  // The manifest pin replaces committed-catalog content equality; a group without one
  // is unprotected, so it is invalid rather than merely unpinned.
  for (const group of registry?.surface_groups ?? []) {
    if (!/^[0-9a-f]{64}$/u.test(group?.trusted_manifest_sha256 ?? '')) {
      issues.push(`${group?.id ?? '(group)'}: trusted manifest SHA-256 is required`);
    }
  }
  return { valid: issues.length === 0, issues: unique(issues) };
}

function validateFrameworkAndProfiles(root, repositorySurfaces) {
  const issues = [];
  const frameworkPaths = repositorySurfaces.filter((entry) => entry.control_kind === 'framework').map((entry) => entry.path);
  const profilePaths = repositorySurfaces.filter((entry) => entry.group_id === 'definition-profiles').map((entry) => entry.path);
  const frameworks = new Map();
  for (const relative of frameworkPaths) {
    const value = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (value.schema !== 'chopdot.definition-framework.v1' || value.portable !== true) issues.push(`${relative}: invalid portable framework identity`);
    const fields = new Set(value.required_contract ?? []);
    for (const field of REQUIRED_CONTRACT_FIELDS) if (!fields.has(field)) issues.push(`${relative}: missing generic contract field ${field}`);
    const positiveText = JSON.stringify({ purpose: value.purpose, stages: value.stages });
    if (/scan a receipt|one next action|exactly one action|dashboard|home screen|viewport|brand direction/iu.test(positiveText)) issues.push(`${relative}: generic framework embeds a domain or product answer`);
    if (!value.framework_id || frameworks.has(value.framework_id)) issues.push(`${relative}: missing or duplicate framework ID`);
    else frameworks.set(value.framework_id, { relative, value });
  }
  for (const relative of profilePaths) {
    const value = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    if (value.schema !== 'chopdot.definition-profile.v1') issues.push(`${relative}: invalid definition profile identity`);
    const resolved = path.normalize(path.join(path.dirname(relative), value.framework_ref ?? '')).replaceAll('\\', '/');
    const framework = [...frameworks.values()].find((entry) => entry.relative === resolved);
    if (!framework) issues.push(`${relative}: framework_ref does not resolve to a catalogued framework`);
    const positiveText = JSON.stringify({ required_outputs: value.required_outputs, evaluation_criteria: value.evaluation_criteria, expected_outcome: value.expected_outcome });
    if (/exactly one action|single primary action|one next action/iu.test(positiveText)) issues.push(`${relative}: profile universalizes one action`);
    if (!Array.isArray(value.forbidden_inferences) || value.forbidden_inferences.length < 3) issues.push(`${relative}: profile must declare forbidden inferences`);
  }
  if (!fs.existsSync(path.join(root, FRAMEWORK_SCHEMA_PATH))) issues.push(`missing ${FRAMEWORK_SCHEMA_PATH}`);
  if (!fs.existsSync(path.join(root, PROFILE_SCHEMA_PATH))) issues.push(`missing ${PROFILE_SCHEMA_PATH}`);
  return issues;
}

function repositoryPathSets(root) {
  const tracked = new Set(gitPaths(root, ['ls-files', '-z', '--cached']));
  const visible = gitPaths(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  return { tracked, visible };
}

export function buildSteeringCatalog(rootInput, registry = loadSteeringRegistry(rootInput)) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const validation = validateSteeringRegistry(registry);
  const issues = [...validation.issues];
  const { visible } = repositoryPathSets(root);
  const outputPaths = new Set(Object.values(registry.generated_outputs));
  const groups = registry.surface_groups.map((group) => ({ ...group, regexes: group.patterns.map(globToRegExp), matches: [] }));
  const controlled = (relative) => registry.discovery_roots.some((prefix) => relative.startsWith(prefix));
  const repositorySurfaces = [];
  for (const relative of visible) {
    if (outputPaths.has(relative)) continue;
    const matched = groups.filter((group) => group.regexes.some((regex) => regex.test(relative)));
    if (!matched.length && !controlled(relative)) continue;
    if (!matched.length) {
      issues.push(`unregistered steering surface under a controlled root: ${relative}`);
      continue;
    }
    if (matched.length > 1) {
      issues.push(`steering surface matches multiple groups (${matched.map((entry) => entry.id).join(', ')}): ${relative}`);
      continue;
    }
    const group = matched[0];
    group.matches.push(relative);
    try {
      repositorySurfaces.push({
        surface_id: `repo-${relative.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '').toLowerCase()}`,
        path: relative,
        ...fileIdentity(root, relative),
        group_id: group.id,
        surface_kind: group.surface_kind,
        control_kind: group.control_kind,
        domain: group.domain,
        influence_class: group.influence_class,
        lifecycle: group.lifecycle,
        activation_mode: group.activation_mode,
        accountable_owner: group.accountable_owner,
      });
    } catch (error) { issues.push(error.message); }
  }
  for (const group of groups) if (!group.allow_empty && !group.matches.length) issues.push(`surface group has no discovered files: ${group.id}`);
  const pathIds = repositorySurfaces.map((entry) => entry.surface_id);
  for (const id of unique(pathIds)) if (pathIds.filter((entry) => entry === id).length !== 1) issues.push(`derived repository surface ID collision: ${id}`);
  issues.push(...validateFrameworkAndProfiles(root, repositorySurfaces));
  repositorySurfaces.sort((left, right) => compareText(left.path, right.path));
  const groupsSummary = groups.map(({ regexes: _regexes, matches, ...group }) => ({
    ...group,
    file_count: matches.length,
    // The registry is excluded from every group manifest it would otherwise join.
    // A file cannot contain its own hash: pinning a digest into the registry would
    // change the digest being pinned, and the check could never converge.
    manifest_sha256: aggregateManifest(
      repositorySurfaces.filter((entry) => entry.group_id === group.id && entry.path !== REGISTRY_PATH),
    ),
  })).sort((left, right) => compareText(left.id, right.id));
  const body = {
    schema: 'chopdot.steering-surface-catalog.v1',
    catalog_version: '1.0.0',
    registry: {
      id: registry.registry_id,
      version: registry.version,
      status: registry.status,
      path: REGISTRY_PATH,
      sha256: sha256File(path.join(root, REGISTRY_PATH)),
      semantic_digest: digestObject(registry),
      reviewed_on: registry.reviewed_on,
      review_interval_days: registry.review_interval_days,
    },
    authority: registry.authority,
    discovery: {
      basis: 'Git-index plus visible non-ignored working-tree candidates under declared patterns and controlled roots; generated catalog outputs are excluded to prevent self-hash cycles.',
      controlled_roots: [...registry.discovery_roots].sort(),
      repository_file_count: repositorySurfaces.length,
      repository_manifest_sha256: aggregateManifest(repositorySurfaces),
    },
    lifecycle_summary: Object.fromEntries([...LIFECYCLES].sort().map((lifecycle) => [lifecycle, repositorySurfaces.filter((entry) => entry.lifecycle === lifecycle).length])),
    groups: groupsSummary,
    repository_surfaces: repositorySurfaces,
    external_discovery: registry.external_discovery.map((entry) => canonicalize(entry)).sort((left, right) => compareText(left.id, right.id)),
    external_surfaces: registry.external_surfaces.map((entry) => canonicalize(entry)).sort((left, right) => compareText(left.id, right.id)),
    external_package_manifest_policy: canonicalize(PACKAGE_MANIFEST_POLICY),
    runtime_classes: registry.runtime_classes.map((entry) => canonicalize(entry)).sort((left, right) => compareText(left.id, right.id)),
    lifecycle_reviews: registry.lifecycle_reviews.map((entry) => canonicalize(entry)).sort((left, right) => compareText(left.surface_id, right.surface_id)),
    generated_outputs: registry.generated_outputs,
    validation: { valid: issues.length === 0, issue_count: unique(issues).length, issues: unique(issues) },
  };
  return { ...body, catalog_digest: digestObject(body) };
}

function resolveLogicalRoots(root, env = process.env) {
  let common = git(root, ['rev-parse', '--git-common-dir']);
  if (!path.isAbsolute(common)) common = path.resolve(root, common);
  const canonicalRepoRoot = path.dirname(fs.realpathSync(common));
  const autobotsRoot = env.AUTOBOTS_ROOT
    ? path.resolve(env.AUTOBOTS_ROOT)
    : path.join(path.dirname(canonicalRepoRoot), 'Documents', 'AutoBots');
  return { exact_worktree_root: root, canonical_repo_root: canonicalRepoRoot, autobots_root: autobotsRoot };
}

export function observeExternalDiscovery(rootInput, registry, env = process.env) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const logicalRoots = resolveLogicalRoots(root, env);
  const declaredByLocator = new Map((registry.external_surfaces ?? []).map((surface) => [
    externalLocatorKey(surface.locator.base, surface.locator.path),
    surface.id,
  ]));
  const observations = [];
  const drifts = [];
  for (const discovery of registry.external_discovery ?? []) {
    const base = logicalRoots[discovery.locator.base];
    const directory = path.resolve(base, discovery.locator.path);
    let present = false;
    let regularDirectory = false;
    let contained = false;
    let candidates = [];
    let unsafe = [];
    try {
      contained = fs.realpathSync(directory).startsWith(`${fs.realpathSync(base)}${path.sep}`);
      const stat = fs.lstatSync(directory);
      present = true;
      regularDirectory = stat.isDirectory() && !stat.isSymbolicLink();
      if (regularDirectory && contained) ({ candidates, unsafe } = walkExternalDiscovery(directory, discovery.patterns));
    } catch { /* Missing optional discovery roots are explicit observations. */ }
    const discovered = candidates.map((relative) => {
      const locatorPath = path.posix.join(discovery.locator.path.replaceAll('\\', '/'), relative);
      return {
        locator: { base: discovery.locator.base, path: locatorPath },
        declared_surface_id: declaredByLocator.get(externalLocatorKey(discovery.locator.base, locatorPath)) ?? null,
      };
    });
    const undeclared = discovered.filter((entry) => entry.declared_surface_id === null).map((entry) => entry.locator.path);
    let state = 'eligible';
    if (!present) state = discovery.presence_policy === 'required' ? 'blocked' : 'unavailable';
    else if (!regularDirectory || !contained || unsafe.length || undeclared.length) state = 'blocked';
    observations.push({
      id: discovery.id,
      locator: discovery.locator,
      patterns: discovery.patterns,
      presence_policy: discovery.presence_policy,
      present,
      regular_directory: regularDirectory,
      contained_in_logical_root: contained,
      state,
      discovered,
      unsafe_paths: unsafe,
      undeclared_paths: undeclared,
    });
    if (!present && state === 'blocked') drifts.push(`${discovery.id}: required external discovery root is unavailable`);
    if (present && (!regularDirectory || !contained)) drifts.push(`${discovery.id}: discovery root failed directory or containment checks`);
    for (const relative of unsafe) drifts.push(`${discovery.id}: external discovery contains a symlink: ${relative}`);
    for (const locatorPath of undeclared) drifts.push(`${discovery.id}: undeclared external steering surface: ${locatorPath}`);
  }
  return { logical_roots: canonicalize(logicalRoots), observations, drifts };
}

export function observeExternalSurfaces(rootInput, registry, env = process.env) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const logicalRoots = resolveLogicalRoots(root, env);
  const observations = [];
  const drifts = [];
  for (const surface of registry.external_surfaces) {
    const base = logicalRoots[surface.locator.base];
    const file = path.resolve(base, surface.locator.path);
    let present = false;
    let observedSha256 = null;
    let packageFileCount = null;
    let observedPackageManifestSha256 = null;
    let regular = false;
    let contained = false;
    try {
      contained = fs.realpathSync(file).startsWith(`${fs.realpathSync(base)}${path.sep}`);
      const stat = fs.lstatSync(file);
      present = true;
      regular = stat.isFile() && !stat.isSymbolicLink();
      if (regular) {
        observedSha256 = sha256File(file);
        if (surface.trusted_package_manifest_sha256) {
          const manifest = directoryManifest(path.dirname(file));
          packageFileCount = manifest.file_count;
          observedPackageManifestSha256 = manifest.manifest_sha256;
        }
      }
    } catch { /* Missing optional local surface is an observation, not an exception. */ }
    const entryDigestMatches = !present || surface.trusted_sha256 === null || observedSha256 === surface.trusted_sha256;
    const packageDigestMatches = !present || !surface.trusted_package_manifest_sha256 || observedPackageManifestSha256 === surface.trusted_package_manifest_sha256;
    const digestMatches = entryDigestMatches && packageDigestMatches;
    let state = 'eligible';
    if (!present) state = surface.presence_policy === 'required' ? 'blocked' : 'unavailable';
    else if (!regular || !contained || !digestMatches) state = 'blocked';
    else if (NON_ACTIVATING.has(surface.lifecycle)) state = 'disabled';
    else if (surface.lifecycle === 'degraded') state = 'degraded';
    observations.push({
      id: surface.id,
      locator: surface.locator,
      lifecycle: surface.lifecycle,
      activation_mode: surface.activation_mode,
      presence_policy: surface.presence_policy,
      present,
      regular_file: regular,
      contained_in_logical_root: contained,
      trusted_sha256: surface.trusted_sha256,
      observed_sha256: observedSha256,
      package_file_count: packageFileCount,
      trusted_package_manifest_sha256: surface.trusted_package_manifest_sha256 ?? null,
      observed_package_manifest_sha256: observedPackageManifestSha256,
      digest_matches: digestMatches,
      state,
    });
    if (state === 'blocked') drifts.push(`${surface.id}: required identity, containment, or digest check failed`);
  }
  return { logical_roots: canonicalize(logicalRoots), observations, drifts };
}

function candidateIdentity(root) {
  return {
    root,
    branch: git(root, ['branch', '--show-current']),
    commit: git(root, ['rev-parse', 'HEAD']),
    tree: git(root, ['rev-parse', 'HEAD^{tree}']),
  };
}

function steeringWorktreeState(root, catalog) {
  const generated = new Set(Object.values(catalog.generated_outputs ?? {}));
  const paths = new Set([
    ...catalog.repository_surfaces.map((entry) => entry.path),
    ...generated,
  ]);
  const tracked = new Set(gitPaths(root, ['ls-files', '-z', '--cached']));
  // Only steering *sources* participate in the promoted-source requirement. Generated
  // outputs are derived and untracked by design, so requiring them to be committed
  // would fail every clean checkout under --require-promoted. They stay in `paths`,
  // so if one is deliberately tracked its dirty state is still reported.
  const unpromoted = [...paths].filter((entry) => !tracked.has(entry) && !generated.has(entry)).sort();
  const trackedDirty = unique([
    ...gitPaths(root, ['diff', '--name-only', '-z', '--']),
    ...gitPaths(root, ['diff', '--cached', '--name-only', '-z', '--']),
  ]).filter((entry) => paths.has(entry)).sort(compareText);
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).map((line) => ({ code: line.slice(0, 2), path: line.slice(3).split(' -> ').at(-1) }));
  return {
    unpromoted,
    tracked_dirty: trackedDirty,
    changed: status.filter((entry) => paths.has(entry.path)).sort((left, right) => compareText(left.path, right.path)),
    working_tree_manifest_sha256: aggregateManifest([...paths].sort(compareText).map((relative) => {
      try { return { path: relative, sha256: fileIdentity(root, relative).sha256 }; }
      catch (error) { return { path: relative, sha256: createHash('sha256').update(`unreadable\0${error.message}`).digest('hex') }; }
    })),
  };
}

function reviewDue(registry, now) {
  const reviewed = new Date(`${registry.reviewed_on}T23:59:59.999Z`);
  const due = new Date(reviewed.getTime() + registry.review_interval_days * 86_400_000);
  return { due_at: due.toISOString(), stale: now.getTime() > due.getTime() };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function renderSteeringHealth(catalog) {
  const lifecycle = Object.entries(catalog.lifecycle_summary).filter(([, count]) => count > 0)
    .map(([state, count]) => `| ${state} | ${count} |`).join('\n');
  const groups = catalog.groups.map((group) => `| ${group.id} | ${group.lifecycle} | ${group.file_count} | ${group.manifest_sha256} |`).join('\n');
  const degradedGroups = catalog.groups.filter((group) => group.lifecycle === 'degraded').map((group) => `\`${group.id}\``);
  return `# Steering surface health\n\n`+
    `**Kind:** generated read model\n**Authority:** inventory and monitoring only; never product law, priority, approval, or release proof\n`+
    `**Registry:** \`${catalog.registry.path}\` v${catalog.registry.version} (${catalog.registry.status})\n`+
    `**Registry semantic digest:** \`${catalog.registry.semantic_digest}\`\n`+
    `**Repository manifest aggregate:** \`${catalog.discovery.repository_manifest_sha256}\`\n`+
    `**Catalog digest:** \`${catalog.catalog_digest}\`\n\n`+
    `This file is deterministic. Current branch, dirty state, optional machine-local availability, and hash drift are reported by \`npm run agent:steering:report\`. `+
    `Update sources deliberately, run \`npm run agent:steering:build\`, review the diff, then run \`npm run agent:steering:check\`. The monitor never rewrites authority during a check.\n\n`+
    `## Baseline\n\n`+
    `- Repository surfaces: ${catalog.discovery.repository_file_count}\n`+
    `- External discovery censuses declared: ${catalog.external_discovery.length}\n`+
    `- External surfaces declared: ${catalog.external_surfaces.length}\n`+
    `- Runtime classes declared: ${catalog.runtime_classes.length}\n`+
    `- Catalog validation issues: ${catalog.validation.issue_count}\n`+
    `- Registry reviewed: ${catalog.registry.reviewed_on}; interval: ${catalog.registry.review_interval_days} days\n\n`+
    `External skill-package manifests exclude only deterministic incidental paths: directories ${PACKAGE_MANIFEST_POLICY.excluded_directory_names.map((entry) => `\`${entry}\``).join(', ')}, files ${PACKAGE_MANIFEST_POLICY.excluded_file_names.map((entry) => `\`${entry}\``).join(', ')}, and suffixes ${PACKAGE_MANIFEST_POLICY.excluded_file_suffixes.map((entry) => `\`${entry}\``).join(', ')}. All other package files are identity-bearing.\n\n`+
    `Degraded repository groups: ${degradedGroups.join(', ') || 'none'}. These remain visible but cannot produce a \`pass\` verdict.\n\n`+
    `## Lifecycle census\n\n| Lifecycle | Repository files |\n|---|---:|\n${lifecycle}\n\n`+
    `## Governed groups\n\n| Group | Lifecycle | Files | Ordered manifest SHA-256 |\n|---|---|---:|---|\n${groups}\n\n`+
    `## Expected monitor outcomes\n\n`+
    `- **Pass:** registry and catalog are current; repository hashes, framework/profile bindings, and present external digests match.\n`+
    `- **Degraded:** an optional external surface is unavailable or an explicitly degraded surface remains guarded.\n`+
    `- **Blocked:** registry/schema semantics fail, a controlled file is uncatalogued, generated outputs are stale, an external digest changes, or a required surface is missing.\n`+
    `- **Upgrade:** change lifecycle or trusted identity only in the registry, with an accountable owner and reviewed evidence; regenerate and re-run hostile tests.\n`+
    `- **Retire:** disable activation first, name the replacement or reason, preserve historical evidence, then move to superseded or retired.\n`;
}

export function runSteeringMonitor(rootInput, options = {}) {
  const root = fs.realpathSync(path.resolve(rootInput));
  const registry = options.registry ?? loadSteeringRegistry(root);
  const catalog = buildSteeringCatalog(root, registry);
  // The catalog and health report are derived, not durable evidence: they are built
  // on demand into a gitignored path and uploaded as CI artifacts for diagnostics.
  // Drift is now detected from the registry itself — declared digests and undeclared
  // surfaces under the discovery roots — so an ordinary documentation edit no longer
  // has to rebuild a governance artifact.
  const expectedCatalog = serialize(catalog);
  const expectedHealth = renderSteeringHealth(catalog);
  const outputDrifts = [];
  // Content-change detection for tracked steering surfaces. Each group may pin the
  // aggregate digest of its matched files; a mismatch means an instruction an agent
  // obeys changed without the registry being updated to acknowledge it. This replaces
  // the committed-catalog equality check, which could not distinguish an edited
  // instruction from an edited research file.
  const catalogGroups = new Map(catalog.groups.map((entry) => [entry.id, entry]));
  for (const group of registry.surface_groups) {
    const trusted = group.trusted_manifest_sha256;
    if (!trusted) continue;
    const observed = catalogGroups.get(group.id)?.manifest_sha256;
    if (observed !== trusted) {
      outputDrifts.push(`${group.id}: steering surface content changed; expected manifest ${trusted}, observed ${observed ?? '(missing)'}`);
    }
  }
  const externalDiscovery = observeExternalDiscovery(root, registry, options.env);
  const external = observeExternalSurfaces(root, registry, options.env);
  const worktree = steeringWorktreeState(root, catalog);
  const review = reviewDue(registry, options.now ?? new Date());
  const lifecycleReviews = registry.lifecycle_reviews.map((entry) => ({ surface_id: entry.surface_id, ...reviewDue(entry, options.now ?? new Date()) }));
  const drifts = [...catalog.validation.issues, ...outputDrifts, ...externalDiscovery.drifts, ...external.drifts];
  if (review.stale) drifts.push(`registry review is stale; due ${review.due_at}`);
  for (const entry of lifecycleReviews.filter((item) => item.stale)) drifts.push(`${entry.surface_id}: lifecycle review is stale; due ${entry.due_at}`);
  if (options.requirePromoted && worktree.unpromoted.length) drifts.push(`${worktree.unpromoted.length} steering surfaces are untracked/unpromoted`);
  if (options.requirePromoted && worktree.tracked_dirty.length) drifts.push(`${worktree.tracked_dirty.length} tracked steering surfaces have uncommitted changes`);
  const unavailableOptional = [
    ...externalDiscovery.observations.filter((entry) => entry.state === 'unavailable').map((entry) => entry.id),
    ...external.observations.filter((entry) => entry.state === 'unavailable').map((entry) => entry.id),
  ];
  const guarded = external.observations.filter((entry) => ['disabled', 'degraded'].includes(entry.state)).map((entry) => entry.id);
  const degradedGroups = catalog.groups.filter((entry) => entry.lifecycle === 'degraded').map((entry) => entry.id);
  const nonActiveRegistry = registry.status === 'active' ? [] : [`registry:${registry.status}`];
  const degradedSurfaceIds = unique([...unavailableOptional, ...guarded, ...degradedGroups, ...nonActiveRegistry]);
  const verdict = drifts.length ? 'blocked' : (degradedSurfaceIds.length ? 'degraded' : 'pass');
  return {
    schema: 'chopdot.steering-surface-health.v1',
    candidate: candidateIdentity(root),
    registry: catalog.registry,
    catalog: {
      path: registry.generated_outputs.catalog,
      digest: catalog.catalog_digest,
      repository_manifest_sha256: catalog.discovery.repository_manifest_sha256,
      repository_file_count: catalog.discovery.repository_file_count,
    },
    verdict,
    checks: catalog.discovery.repository_file_count + registry.external_discovery.length + registry.external_surfaces.length + registry.runtime_classes.length + 10,
    eligible_surface_ids: external.observations.filter((entry) => entry.state === 'eligible').map((entry) => entry.id),
    disabled_surface_ids: unique([...unavailableOptional, ...guarded]),
    degraded_surface_ids: degradedSurfaceIds,
    external_discovery: externalDiscovery.observations,
    observations: external.observations,
    external_package_manifest_policy: canonicalize(PACKAGE_MANIFEST_POLICY),
    worktree,
    freshness: { ...review, lifecycle_reviews: lifecycleReviews },
    drifts: unique(drifts),
    limitations: [
      'Runtime-injected prompt text and actual skill activation are not fully observable from repository code.',
      'A passing monitor proves registry integrity and declared identity, not product correctness, implementation, deployment, or live use.',
    ],
    _generated: { catalog: expectedCatalog, health: expectedHealth },
  };
}

function publicResult(result) {
  const { _generated: _ignored, ...value } = result;
  return value;
}

// Generated outputs are derived and must never be written anywhere but the ignored
// build directory. Resolve and contain before any filesystem write, so a registry
// that names an in-tree path or escapes with traversal fails without touching disk.
export function resolveGeneratedOutput(root, relative, label) {
  if (typeof relative !== 'string' || !relative) throw new Error(`${label} must be a repository-relative path`);
  if (path.isAbsolute(relative)) throw new Error(`${label} must be repository-relative, not absolute: ${relative}`);
  const container = path.resolve(root, GENERATED_ROOT);
  const resolved = path.resolve(root, relative);
  if (resolved === container || !resolved.startsWith(`${container}${path.sep}`)) {
    throw new Error(`${label} must resolve strictly beneath ${GENERATED_ROOT}/: ${relative}`);
  }
  return resolved;
}

function writeFileChecked(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

async function main() {
  const [command = 'check', ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const root = fs.realpathSync(path.resolve(options.root ?? process.cwd()));
  const result = runSteeringMonitor(root, {
    requirePromoted: Boolean(options.require_promoted),
    now: options.as_of ? new Date(options.as_of) : new Date(),
  });
  if (command === 'pin') {
    // The supported way to acknowledge an intentional change to a protected steering
    // surface. Never compute a digest by hand: run this, then review the registry diff
    // in the pull request alongside the instruction change it accompanies.
    const registryFile = path.join(root, REGISTRY_PATH);
    const registry = loadSteeringRegistry(root);
    const catalog = buildSteeringCatalog(root, registry);
    const observed = new Map(catalog.groups.map((entry) => [entry.id, entry.manifest_sha256]));
    const changed = [];
    for (const group of registry.surface_groups) {
      const next = observed.get(group.id);
      if (next && group.trusted_manifest_sha256 !== next) {
        changed.push({ group: group.id, from: group.trusted_manifest_sha256 ?? null, to: next });
        group.trusted_manifest_sha256 = next;
      }
    }
    if (changed.length) fs.writeFileSync(registryFile, `${JSON.stringify(registry, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ pinned: changed }, null, 2)}\n`);
    return;
  }
  if (command === 'build') {
    const registry = loadSteeringRegistry(root);
    // Resolve both targets before either write, so a rejected path leaves no partial output.
    const catalogFile = resolveGeneratedOutput(root, registry.generated_outputs.catalog, 'generated catalog');
    const healthFile = resolveGeneratedOutput(root, registry.generated_outputs.health_report, 'generated health report');
    writeFileChecked(catalogFile, result._generated.catalog);
    writeFileChecked(healthFile, result._generated.health);
    const rebuilt = runSteeringMonitor(root, { requirePromoted: Boolean(options.require_promoted), now: options.as_of ? new Date(options.as_of) : new Date() });
    process.stdout.write(`${JSON.stringify(publicResult(rebuilt), null, 2)}\n`);
    if (rebuilt.verdict === 'blocked') process.exitCode = 1;
  } else if (command === 'check' || command === 'report') {
    process.stdout.write(`${JSON.stringify(publicResult(result), null, 2)}\n`);
    if (options.json_out) writeFileChecked(path.resolve(options.json_out), serialize(publicResult(result)));
    if (command === 'check' && result.verdict === 'blocked') process.exitCode = 1;
  } else throw new Error(`Unknown steering-surface command: ${command}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
