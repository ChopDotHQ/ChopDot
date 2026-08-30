import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PROJECT_AUTHORITY, PROJECT_AUTHORITY_PROFILE_SHA256, authorityPolicyForSurface,
  loadProjectAuthorityProfile, resolveEnvironmentAuthority, validateProjectAuthorityProfile,
} from '../authority-profile.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('project authority delegates the human owner principal without collaborator authority', () => {
  const profile = loadProjectAuthorityProfile(repositoryRoot);
  assert.deepEqual(validateProjectAuthorityProfile(profile), []);
  assert.equal(profile.identity_mode, 'delegated-owner-principal');
  assert.deepEqual(profile.human_owner, { type: 'User', login: 'Devpen787', id: 23641846 });
  assert.deepEqual(profile.agent_principal, { acts_as: 'human_owner' });
  assert.equal(profile.independent_human_review_required, false);
  assert.match(PROJECT_AUTHORITY_PROFILE_SHA256, /^[0-9a-f]{64}$/u);
  assert(Object.isFrozen(PROJECT_AUTHORITY));
  assert(Object.isFrozen(PROJECT_AUTHORITY.human_owner));
});

test('surface policies resolve portable human and environment authority', () => {
  const branchMerge = authorityPolicyForSurface('branch_merge');
  assert.deepEqual(branchMerge, {
    required_approving_review_count: 0,
    require_code_owner_review: false,
    require_last_push_approval: false,
    required_review_thread_resolution: true,
    required_status_checks: [
      'Agent contract', 'Agent runner', 'Knowledge adapters', 'Repo governance',
      'Application fast assurance', 'PR outcome',
    ],
  });
  const pr = authorityPolicyForSurface('pr_acceptance');
  assert.deepEqual(pr.required_reviewers, []);
  assert.equal(pr.independent_human_review_required, false);
  assert.deepEqual(pr.branch_patterns, ['codex/*']);
  const release = authorityPolicyForSurface('release');
  assert.equal(release.environment, 'public-testnet-release');
  assert.deepEqual(release.required_reviewers, []);
  assert.equal(release.independent_human_review_required, false);
  assert.deepEqual(release.branches, ['codex/chopdot-v1-launch', 'main']);
  assert.deepEqual(release.environment_authority.required_reviewers, []);
  assert.equal(release.environment_authority.prevent_self_review, false);
  assert.equal(release.environment_authority.can_admins_bypass, false);
});

test('release environment has no required reviewer and keeps exact non-bypass branches', () => {
  const profile = loadProjectAuthorityProfile(repositoryRoot);
  const release = resolveEnvironmentAuthority(profile, 'public-testnet-release');
  assert.deepEqual(release.required_reviewers, []);
  assert.equal(release.prevent_self_review, false);
  assert.equal(release.can_admins_bypass, false);
  assert.deepEqual(release.branches, ['codex/chopdot-v1-launch', 'main']);
  assert.throws(() => resolveEnvironmentAuthority(profile, 'unconfigured-environment'), /does not govern environment/u);
});

test('authority profile fails closed under hostile identity and bypass mutations', () => {
  const mutations = [
    (value) => { value.human_owner.login = ''; },
    (value) => { value.human_owner.id = -1; },
    (value) => { value.identity_mode = 'implicit-collaborator'; },
    (value) => { value.agent_principal.acts_as = 'collaborator'; },
    (value) => { value.independent_human_review_required = true; },
    (value) => { value.environments['unexpected-human-gate'] = structuredClone(value.environments['public-testnet-release']); },
    (value) => { value.environments['public-testnet-release'].required_reviewers = ['collaborator']; },
    (value) => { value.environments['public-testnet-release'].can_admins_bypass = true; },
    (value) => { value.environments['public-testnet-release'].prevent_self_review = true; },
    (value) => { value.surfaces.branch_merge.required_approving_review_count = 1; },
    (value) => { value.surfaces.branch_merge.required_status_checks = []; },
    (value) => { value.surfaces.pr_acceptance.required_reviewers = ['human_owner']; },
    (value) => { value.surfaces.release.branches = ['main']; },
  ];
  for (const mutate of mutations) {
    const hostile = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'governance/agent-system/project-authority.v1.json')));
    mutate(hostile);
    assert(validateProjectAuthorityProfile(hostile).length > 0);
  }
  assert.throws(() => authorityPolicyForSurface('unknown'), /does not govern surface/u);
});
