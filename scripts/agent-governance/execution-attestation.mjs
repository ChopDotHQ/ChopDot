import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { validateGovernanceInstance } from '../agent-system/schema.mjs';
import { loadProjectAuthorityProfile, resolveEnvironmentAuthority } from './authority-profile.mjs';
import { digestObject, parseArgs, writeReport } from './lib.mjs';

export const EXECUTION_AUDIENCE = 'chopdot-agent-evaluation';
const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_JWKS = `${GITHUB_ISSUER}/.well-known/jwks`;
export const RELEASE_ENVIRONMENT = 'public-testnet-release';

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function decodeJwt(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/u.test(part))) throw new Error('execution attestation JWT is malformed');
  return { header: decodePart(parts[0]), claims: decodePart(parts[1]), signingInput: `${parts[0]}.${parts[1]}`, signature: Buffer.from(parts[2], 'base64url') };
}

function curlJson(args, environment = process.env) {
  return JSON.parse(execFileSync('curl', ['--fail', '--silent', '--show-error', ...args], {
    encoding: 'utf8', env: environment, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 2_000_000,
  }));
}

export function requestGithubOidcToken(environment = process.env) {
  const requestUrl = environment.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) throw new Error('GitHub OIDC request capability is unavailable');
  const url = new URL(requestUrl);
  url.searchParams.set('audience', EXECUTION_AUDIENCE);
  const response = curlJson(['-H', `Authorization: Bearer ${requestToken}`, url.toString()], environment);
  if (!response.value) throw new Error('GitHub OIDC response did not contain a token');
  return response.value;
}

export function buildGithubExecutionAttestation({ token, candidate, evaluatedAt }) {
  const { claims } = decodeJwt(token);
  const base = {
    attestation_version: '1.0.0',
    provider: 'github-actions-oidc',
    audience: EXECUTION_AUDIENCE,
    oidc_jwt: token,
    candidate,
    workflow_run: {
      repository: claims.repository,
      run_id: String(claims.run_id ?? ''),
      run_attempt: String(claims.run_attempt ?? ''),
      check_run_id: String(claims.check_run_id ?? ''),
      event_name: claims.event_name,
      workflow_ref: claims.workflow_ref,
      actor: claims.actor,
      ref: claims.ref,
      sha: claims.sha,
      environment: claims.environment ?? null,
      subject: claims.sub,
    },
    evaluated_at: evaluatedAt,
  };
  const attestation = { ...base, attestation_id: `execution_attestation_${digestObject(base).slice(0, 12)}` };
  const schema = validateGovernanceInstance(attestation, 'execution-attestation.v1.schema.json');
  if (!schema.valid) throw new Error(`Execution attestation schema invalid: ${schema.issues.map((entry) => `${entry.path} ${entry.message}`).join('; ')}`);
  return attestation;
}

function officialJwks() {
  return curlJson([GITHUB_JWKS]);
}

function officialRunReadback(repository, runId, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub run readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${repository}/actions/runs/${runId}`,
  ], environment);
}

function officialEnvironmentReadback(repository, environmentName, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub environment readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${repository}/environments/${encodeURIComponent(environmentName)}`,
  ], environment);
}

function officialEnvironmentBranchPoliciesReadback(repository, environmentName, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub environment branch-policy readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${repository}/environments/${encodeURIComponent(environmentName)}/deployment-branch-policies`,
  ], environment);
}

export function verifyGithubExecutionAttestation(attestation, expected, options = {}) {
  const failures = [];
  const schema = validateGovernanceInstance(attestation, 'execution-attestation.v1.schema.json');
  failures.push(...schema.issues.map((entry) => `${entry.path} ${entry.message}`));
  let decoded;
  try { decoded = decodeJwt(attestation?.oidc_jwt); } catch (error) { failures.push(error.message); return failures; }
  const { header, claims, signingInput, signature } = decoded;
  let authorityProfile;
  let environmentAuthority;
  try {
    authorityProfile = options.authorityProfile ?? loadProjectAuthorityProfile(expected.candidate?.root);
    if (expected.environment) environmentAuthority = resolveEnvironmentAuthority(authorityProfile, expected.environment);
  } catch (error) {
    failures.push(error.message);
  }
  const repository = authorityProfile?.repository;
  const workflowPrefix = repository ? `${repository}/.github/workflows/agent-governance.yml@` : null;
  try {
    const jwks = options.jwks ?? officialJwks();
    const key = (jwks.keys ?? []).find((entry) => entry.kid === header.kid && entry.kty === 'RSA');
    if (header.alg !== 'RS256' || !key) failures.push('execution attestation has no trusted GitHub RS256 key');
    else if (!verifySignature('RSA-SHA256', Buffer.from(signingInput), createPublicKey({ key, format: 'jwk' }), signature)) failures.push('execution attestation signature is invalid');
  } catch (error) { failures.push(`execution attestation signature verification failed: ${error.message}`); }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== GITHUB_ISSUER) failures.push('execution attestation issuer is not GitHub Actions');
  if (!audiences.includes(EXECUTION_AUDIENCE)) failures.push('execution attestation audience is wrong');
  if (!repository || claims.repository !== repository) failures.push('execution attestation repository differs from the project authority profile');
  if (!workflowPrefix || !String(claims.workflow_ref ?? '').startsWith(workflowPrefix)) failures.push('execution attestation workflow is not agent-governance.yml in the governed repository');
  for (const key of ['repository', 'event_name', 'workflow_ref', 'actor', 'ref', 'sha']) {
    if (attestation?.workflow_run?.[key] !== claims[key]) failures.push(`execution attestation ${key} metadata differs from signed claims`);
  }
  for (const key of ['run_id', 'run_attempt', 'check_run_id']) {
    if (attestation?.workflow_run?.[key] !== String(claims[key] ?? '')) failures.push(`execution attestation ${key} metadata differs from signed claims`);
  }
  if (attestation?.workflow_run?.environment !== (claims.environment ?? null)) failures.push('execution attestation environment metadata differs from signed claims');
  if (attestation?.workflow_run?.subject !== claims.sub) failures.push('execution attestation subject metadata differs from signed claims');
  for (const key of ['root', 'branch', 'commit', 'tree']) {
    if (attestation?.candidate?.[key] !== expected.candidate?.[key]) failures.push(`execution attestation candidate ${key} mismatch`);
  }
  if (attestation?.candidate?.git_status?.length) failures.push('execution attestation candidate is dirty');
  if (claims.event_name === 'workflow_dispatch' && claims.sha !== expected.candidate?.commit) failures.push('execution attestation workflow_dispatch SHA does not match candidate commit');
  if (expected.environment) {
    if (claims.environment !== expected.environment) failures.push(`execution attestation environment is not ${expected.environment}`);
    if (!repository || claims.sub !== `repo:${repository}:environment:${expected.environment}`) failures.push('execution attestation subject is not bound to the protected governed environment');
  }
  const evaluated = Date.parse(attestation?.evaluated_at ?? '');
  const issued = Number(claims.iat) * 1000;
  const expires = Number(claims.exp) * 1000;
  if (!Number.isFinite(evaluated) || !Number.isFinite(issued) || !Number.isFinite(expires)
    || expires <= issued || expires - issued > 15 * 60_000 || evaluated < issued - 60_000 || evaluated > expires + 60_000) {
    failures.push('execution attestation evaluation time is outside the signed issuance window');
  }
  try {
    if (!repository) throw new Error('project authority repository is unavailable');
    const run = options.runReadback ?? officialRunReadback(repository, claims.run_id, options.environment);
    if (String(run.id ?? '') !== String(claims.run_id ?? '')) failures.push('GitHub run readback ID mismatch');
    if (run.head_sha !== expected.candidate?.commit) failures.push('GitHub run readback head SHA mismatch');
    if (run.head_branch !== expected.candidate?.branch) failures.push('GitHub run readback branch mismatch');
    if (run.event !== claims.event_name) failures.push('GitHub run readback event mismatch');
    if (!String(run.path ?? '').endsWith('.github/workflows/agent-governance.yml')) failures.push('GitHub run readback workflow path mismatch');
    if (!['in_progress', 'completed'].includes(run.status)) failures.push('GitHub run readback status is not executable evidence');
  } catch (error) { failures.push(`GitHub run readback failed: ${error.message}`); }
  if (expected.environment) {
    try {
      if (!repository || !environmentAuthority) throw new Error('governed environment authority is unavailable');
      const environment = options.environmentReadback ?? officialEnvironmentReadback(repository, expected.environment, options.environment);
      if (environment.name !== expected.environment) failures.push('GitHub environment readback name mismatch');
      const reviewerRule = (environment.protection_rules ?? []).find((entry) => entry.type === 'required_reviewers');
      const observedReviewers = (reviewerRule?.reviewers ?? [])
        .map((entry) => ({ type: entry.type, id: Number(entry.reviewer?.id), login: entry.reviewer?.login }))
        .sort((left, right) => `${left.type}:${left.id}:${left.login}`.localeCompare(`${right.type}:${right.id}:${right.login}`));
      const expectedReviewers = environmentAuthority.required_reviewers
        .map((entry) => ({ type: entry.type, id: Number(entry.id), login: entry.login }))
        .sort((left, right) => `${left.type}:${left.id}:${left.login}`.localeCompare(`${right.type}:${right.id}:${right.login}`));
      if (reviewerRule && reviewerRule.prevent_self_review !== environmentAuthority.prevent_self_review) {
        failures.push(`GitHub governed environment prevent_self_review differs from project authority policy ${environmentAuthority.prevent_self_review}`);
      }
      if (JSON.stringify(observedReviewers) !== JSON.stringify(expectedReviewers)) {
        failures.push(`GitHub governed environment required reviewers differ from project authority policy; unexpected required reviewer or missing configured reviewer`);
      }
      if (environment.can_admins_bypass !== environmentAuthority.can_admins_bypass) {
        failures.push(`GitHub governed environment administrator bypass differs from project authority policy ${environmentAuthority.can_admins_bypass}`);
      }
      if (environment.deployment_branch_policy?.protected_branches !== false
        || environment.deployment_branch_policy?.custom_branch_policies !== true) {
        failures.push('GitHub governed environment does not use the explicit reviewed branch allowlist');
      }
      const policyReadback = options.environmentBranchPolicies
        ?? officialEnvironmentBranchPoliciesReadback(repository, expected.environment, options.environment);
      const observedPolicies = (policyReadback.branch_policies ?? [])
        .filter((entry) => entry.type === 'branch')
        .map((entry) => entry.name)
        .sort();
      const expectedBranches = [...environmentAuthority.branches].sort();
      if (JSON.stringify(observedPolicies) !== JSON.stringify(expectedBranches)) {
        failures.push(`GitHub governed environment branch allowlist differs from ${expectedBranches.join(', ')}`);
      }
      if (!observedPolicies.includes(expected.candidate?.branch)) failures.push('GitHub governed environment does not allow the exact candidate branch');
    } catch (error) { failures.push(`GitHub environment readback failed: ${error.message}`); }
  }
  return [...new Set(failures)];
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

async function main() {
  const [command = '', ...argv] = process.argv.slice(2);
  if (command !== 'create') throw new Error('Execution attestation supports only the create command');
  const options = parseArgs(argv);
  const root = fs.realpathSync(path.resolve(options.root ?? process.cwd()));
  const commit = git(root, ['rev-parse', 'HEAD']);
  const branch = git(root, ['branch', '--show-current']);
  const tree = git(root, ['rev-parse', 'HEAD^{tree}']);
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (options.expected_sha && options.expected_sha !== commit) throw new Error(`Execution attestation expected ${options.expected_sha}; observed ${commit}`);
  if (options.expected_branch && options.expected_branch !== branch) throw new Error(`Execution attestation expected branch ${options.expected_branch}; observed ${branch}`);
  if (status) throw new Error(`Execution attestation candidate is dirty: ${status.replaceAll('\n', '; ')}`);
  const attestation = buildGithubExecutionAttestation({
    token: requestGithubOidcToken(),
    candidate: { root, branch, commit, tree, git_status: [] },
    evaluatedAt: new Date().toISOString(),
  });
  if (!options.json_out) throw new Error('Execution attestation create requires --json-out=PATH');
  writeReport(path.resolve(options.json_out), attestation);
  process.stdout.write(`${JSON.stringify({ ok: true, attestation_id: attestation.attestation_id, output: path.resolve(options.json_out) }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
