import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_AUTHORITY_PROFILE_PATH = 'governance/agent-system/project-authority.v1.json';

const REQUIRED_ENVIRONMENTS = Object.freeze({
  'public-testnet-release': 'release',
});

const SUPPORTED_IDENTITY_MODES = new Set(['delegated-owner-principal']);
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const BRANCH = /^(?!\/)(?!.*\.\.)(?!.*(?:^|\/)\.)(?!.*[~^:?*\[\\\s])(?!.*\/$).+$/u;
const BRANCH_PATTERN = /^(?!\/)(?!.*\.\.)(?!.*(?:^|\/)\.)(?!.*[~^:?\[\\\s])(?!.*\/$).+$/u;
const REQUIRED_HOSTED_CHECKS = Object.freeze([
  'Agent contract', 'Agent runner', 'Knowledge adapters', 'Repo governance',
  'Application fast assurance', 'PR outcome',
]);

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateProjectAuthorityProfile(profile) {
  const failures = [];
  if (!plainObject(profile)) return ['Project authority profile must be an object'];
  if (profile.profile_version !== '1.0.0') failures.push('Project authority profile version must be 1.0.0');
  if (profile.kind !== 'project_authority_profile') failures.push('Project authority profile kind must be project_authority_profile');
  if (typeof profile.repository !== 'string' || !REPOSITORY.test(profile.repository)) failures.push('Project authority profile repository must be owner/name');
  if (!SUPPORTED_IDENTITY_MODES.has(profile.identity_mode)) failures.push('Project authority profile identity_mode is unsupported');

  const owner = profile.human_owner;
  if (!plainObject(owner)) failures.push('Project authority profile must declare one human_owner');
  else {
    if (owner.type !== 'User') failures.push('Project authority profile human_owner type must be User');
    if (typeof owner.login !== 'string' || !GITHUB_LOGIN.test(owner.login)) failures.push('Project authority profile human_owner login is invalid');
    if (!Number.isSafeInteger(owner.id) || owner.id <= 0) failures.push('Project authority profile human_owner id must be a positive integer');
  }
  if (!plainObject(profile.agent_principal) || profile.agent_principal.acts_as !== 'human_owner') {
    failures.push('Project authority profile agent_principal must explicitly act as human_owner');
  }
  if (profile.independent_human_review_required !== false) {
    failures.push('Project authority profile must explicitly record that independent human review is not required');
  }

  if (!plainObject(profile.environments)) failures.push('Project authority profile environments must be an object');
  else {
    for (const environmentName of Object.keys(profile.environments)) {
      if (!(environmentName in REQUIRED_ENVIRONMENTS)) failures.push(`Project authority profile contains unexpected environment ${environmentName}`);
    }
    for (const [environmentName, purpose] of Object.entries(REQUIRED_ENVIRONMENTS)) {
      const policy = profile.environments[environmentName];
      if (!plainObject(policy)) {
        failures.push(`Project authority profile is missing ${environmentName}`);
        continue;
      }
      if (policy.purpose !== purpose) failures.push(`${environmentName} purpose must be ${purpose}`);
      if (!Array.isArray(policy.required_reviewers)) failures.push(`${environmentName} required_reviewers must be an array`);
      else {
        if (new Set(policy.required_reviewers).size !== policy.required_reviewers.length) failures.push(`${environmentName} required_reviewers must be unique`);
        for (const reviewer of policy.required_reviewers) {
          if (reviewer !== 'human_owner') failures.push(`${environmentName} contains an unknown reviewer authority`);
        }
      }
      if (typeof policy.prevent_self_review !== 'boolean') failures.push(`${environmentName} prevent_self_review must be boolean`);
      if (profile.identity_mode === 'delegated-owner-principal' && policy.prevent_self_review !== false) {
        failures.push(`${environmentName} cannot require self-review separation in delegated-owner-principal mode`);
      }
      if (policy.can_admins_bypass !== false) failures.push(`${environmentName} must disable administrator bypass`);
      if (!Array.isArray(policy.branches) || policy.branches.length === 0) failures.push(`${environmentName} must declare an explicit branch allowlist`);
      else {
        if (new Set(policy.branches).size !== policy.branches.length) failures.push(`${environmentName} branch allowlist must be unique`);
        for (const branch of policy.branches) {
          if (typeof branch !== 'string' || !BRANCH.test(branch)) failures.push(`${environmentName} contains an invalid branch`);
        }
      }
    }
  }

  const surfaces = profile.surfaces;
  if (!plainObject(surfaces)) failures.push('Project authority profile surfaces must be an object');
  else {
    const branchMerge = surfaces.branch_merge;
    if (!plainObject(branchMerge)) failures.push('Project authority profile is missing branch_merge surface');
    else {
      if (branchMerge.required_approving_review_count !== 0) failures.push('branch_merge required_approving_review_count must be 0 in delegated-owner-principal mode');
      if (branchMerge.require_code_owner_review !== false) failures.push('branch_merge require_code_owner_review must be false in delegated-owner-principal mode');
      if (branchMerge.require_last_push_approval !== false) failures.push('branch_merge require_last_push_approval must be false in delegated-owner-principal mode');
      if (branchMerge.required_review_thread_resolution !== true) failures.push('branch_merge must require review thread resolution');
      if (!Array.isArray(branchMerge.required_status_checks)
        || JSON.stringify(branchMerge.required_status_checks) !== JSON.stringify(REQUIRED_HOSTED_CHECKS)) {
        failures.push('branch_merge must require the exact six hosted governance checks');
      }
    }

    const prAcceptance = surfaces.pr_acceptance;
    if (!plainObject(prAcceptance)) failures.push('Project authority profile is missing pr_acceptance surface');
    else {
      if (!Array.isArray(prAcceptance.required_reviewers) || prAcceptance.required_reviewers.length !== 0) failures.push('pr_acceptance must not require a human reviewer');
      if (prAcceptance.independent_human_review_required !== false) failures.push('pr_acceptance must not claim independent human review');
      if (!Array.isArray(prAcceptance.branch_patterns) || prAcceptance.branch_patterns.length === 0) failures.push('pr_acceptance must declare branch_patterns');
      else {
        if (new Set(prAcceptance.branch_patterns).size !== prAcceptance.branch_patterns.length) failures.push('pr_acceptance branch_patterns must be unique');
        for (const pattern of prAcceptance.branch_patterns) {
          if (typeof pattern !== 'string' || !BRANCH_PATTERN.test(pattern)) failures.push('pr_acceptance contains an invalid branch pattern');
        }
      }
    }

    const release = surfaces.release;
    if (!plainObject(release)) failures.push('Project authority profile is missing release surface');
    else {
      if (release.environment !== 'public-testnet-release') failures.push('release must use public-testnet-release');
      if (!Array.isArray(release.required_reviewers) || release.required_reviewers.length !== 0) failures.push('release must not require a human reviewer');
      if (release.independent_human_review_required !== false) failures.push('release must not claim independent human review');
      if (!Array.isArray(release.branches) || release.branches.length === 0) failures.push('release must declare exact branches');
      else if (profile.environments?.['public-testnet-release']
        && JSON.stringify([...release.branches].sort()) !== JSON.stringify([...profile.environments['public-testnet-release'].branches].sort())) {
        failures.push('release surface branches must equal the public-testnet-release environment allowlist');
      }
    }
  }
  return [...new Set(failures)];
}

export function loadProjectAuthorityProfile(root) {
  const profilePath = path.join(fs.realpathSync(path.resolve(root)), PROJECT_AUTHORITY_PROFILE_PATH);
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  } catch (error) {
    throw new Error(`Project authority profile could not be read at ${profilePath}: ${error.message}`);
  }
  const failures = validateProjectAuthorityProfile(profile);
  if (failures.length) throw new Error(`Project authority profile is invalid: ${failures.join('; ')}`);
  return profile;
}

export function resolveEnvironmentAuthority(profile, environmentName) {
  const failures = validateProjectAuthorityProfile(profile);
  if (failures.length) throw new Error(`Project authority profile is invalid: ${failures.join('; ')}`);
  const policy = profile.environments[environmentName];
  if (!policy) throw new Error(`Project authority profile does not govern environment ${environmentName}`);
  return {
    name: environmentName,
    purpose: policy.purpose,
    required_reviewers: policy.required_reviewers.map((reviewer) => {
      if (reviewer === 'human_owner') return { ...profile.human_owner };
      throw new Error(`Project authority profile contains unknown reviewer authority ${reviewer}`);
    }),
    prevent_self_review: policy.prevent_self_review,
    can_admins_bypass: policy.can_admins_bypass,
    branches: [...policy.branches],
  };
}

function deepFreeze(value) {
  if (plainObject(value) || Array.isArray(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function authorityPolicyForSurface(surface, profile = PROJECT_AUTHORITY) {
  const failures = validateProjectAuthorityProfile(profile);
  if (failures.length) throw new Error(`Project authority profile is invalid: ${failures.join('; ')}`);
  const policy = profile.surfaces[surface];
  if (!policy) throw new Error(`Project authority profile does not govern surface ${surface}`);
  const resolved = structuredClone(policy);
  if (resolved.environment) resolved.environment_authority = resolveEnvironmentAuthority(profile, resolved.environment);
  return resolved;
}

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PROJECT_AUTHORITY_PROFILE_ABSOLUTE_PATH = path.join(moduleRoot, PROJECT_AUTHORITY_PROFILE_PATH);
export const PROJECT_AUTHORITY_PROFILE_SHA256 = createHash('sha256').update(fs.readFileSync(PROJECT_AUTHORITY_PROFILE_ABSOLUTE_PATH)).digest('hex');
export const PROJECT_AUTHORITY = deepFreeze(loadProjectAuthorityProfile(moduleRoot));
