import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { validateGovernanceInstance } from '../agent-system/schema.mjs';
import { digestObject, parseArgs, writeReport } from './lib.mjs';

export const EXECUTION_AUDIENCE = 'chopdot-agent-evaluation';
const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_JWKS = `${GITHUB_ISSUER}/.well-known/jwks`;
const REPOSITORY = 'ChopDotHQ/ChopDot';
const WORKFLOW_PREFIX = `${REPOSITORY}/.github/workflows/agent-governance.yml@`;
export const RELEASE_ENVIRONMENT = 'public-testnet-release';
export const RELEASE_REVIEWER = Object.freeze({ login: 'Gizmotronn', id: 31812229 });
export const RELEASE_BRANCHES = Object.freeze(['codex/chopdot-v1-launch', 'main']);

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

function officialRunReadback(runId, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub run readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${REPOSITORY}/actions/runs/${runId}`,
  ], environment);
}

function officialEnvironmentReadback(environmentName, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub environment readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${REPOSITORY}/environments/${encodeURIComponent(environmentName)}`,
  ], environment);
}

function officialEnvironmentBranchPoliciesReadback(environmentName, environment = process.env) {
  const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub environment branch-policy readback token is unavailable');
  return curlJson([
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    `https://api.github.com/repos/${REPOSITORY}/environments/${encodeURIComponent(environmentName)}/deployment-branch-policies`,
  ], environment);
}

export function verifyGithubExecutionAttestation(attestation, expected, options = {}) {
  const failures = [];
  const schema = validateGovernanceInstance(attestation, 'execution-attestation.v1.schema.json');
  failures.push(...schema.issues.map((entry) => `${entry.path} ${entry.message}`));
  let decoded;
  try { decoded = decodeJwt(attestation?.oidc_jwt); } catch (error) { failures.push(error.message); return failures; }
  const { header, claims, signingInput, signature } = decoded;
  try {
    const jwks = options.jwks ?? officialJwks();
    const key = (jwks.keys ?? []).find((entry) => entry.kid === header.kid && entry.kty === 'RSA');
    if (header.alg !== 'RS256' || !key) failures.push('execution attestation has no trusted GitHub RS256 key');
    else if (!verifySignature('RSA-SHA256', Buffer.from(signingInput), createPublicKey({ key, format: 'jwk' }), signature)) failures.push('execution attestation signature is invalid');
  } catch (error) { failures.push(`execution attestation signature verification failed: ${error.message}`); }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== GITHUB_ISSUER) failures.push('execution attestation issuer is not GitHub Actions');
  if (!audiences.includes(EXECUTION_AUDIENCE)) failures.push('execution attestation audience is wrong');
  if (claims.repository !== REPOSITORY) failures.push('execution attestation repository is wrong');
  if (!String(claims.workflow_ref ?? '').startsWith(WORKFLOW_PREFIX)) failures.push('execution attestation workflow is not agent-governance.yml');
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
    if (claims.sub !== `repo:${REPOSITORY}:environment:${expected.environment}`) failures.push('execution attestation subject is not bound to the protected release environment');
  }
  const evaluated = Date.parse(attestation?.evaluated_at ?? '');
  const issued = Number(claims.iat) * 1000;
  const expires = Number(claims.exp) * 1000;
  if (!Number.isFinite(evaluated) || !Number.isFinite(issued) || !Number.isFinite(expires)
    || expires <= issued || expires - issued > 15 * 60_000 || evaluated < issued - 60_000 || evaluated > expires + 60_000) {
    failures.push('execution attestation evaluation time is outside the signed issuance window');
  }
  try {
    const run = options.runReadback ?? officialRunReadback(claims.run_id, options.environment);
    if (String(run.id ?? '') !== String(claims.run_id ?? '')) failures.push('GitHub run readback ID mismatch');
    if (run.head_sha !== expected.candidate?.commit) failures.push('GitHub run readback head SHA mismatch');
    if (run.head_branch !== expected.candidate?.branch) failures.push('GitHub run readback branch mismatch');
    if (run.event !== claims.event_name) failures.push('GitHub run readback event mismatch');
    if (!String(run.path ?? '').endsWith('.github/workflows/agent-governance.yml')) failures.push('GitHub run readback workflow path mismatch');
    if (!['in_progress', 'completed'].includes(run.status)) failures.push('GitHub run readback status is not executable evidence');
  } catch (error) { failures.push(`GitHub run readback failed: ${error.message}`); }
  if (expected.environment) {
    try {
      const environment = options.environmentReadback ?? officialEnvironmentReadback(expected.environment, options.environment);
      if (environment.name !== expected.environment) failures.push('GitHub environment readback name mismatch');
      const reviewers = (environment.protection_rules ?? []).find((entry) => entry.type === 'required_reviewers');
      if (!reviewers || reviewers.prevent_self_review !== true) failures.push('GitHub release environment does not prevent self-review');
      const approvedReviewer = (reviewers?.reviewers ?? []).some((entry) => entry.type === 'User'
        && Number(entry.reviewer?.id) === RELEASE_REVIEWER.id
        && entry.reviewer?.login === RELEASE_REVIEWER.login);
      if (!approvedReviewer) failures.push(`GitHub release environment does not require ${RELEASE_REVIEWER.login}`);
      if (environment.can_admins_bypass !== false) failures.push('GitHub release environment still permits administrator bypass');
      if (environment.deployment_branch_policy?.protected_branches !== false
        || environment.deployment_branch_policy?.custom_branch_policies !== true) {
        failures.push('GitHub release environment does not use the explicit reviewed branch allowlist');
      }
      const policyReadback = options.environmentBranchPolicies
        ?? officialEnvironmentBranchPoliciesReadback(expected.environment, options.environment);
      const observedPolicies = (policyReadback.branch_policies ?? [])
        .filter((entry) => entry.type === 'branch')
        .map((entry) => entry.name)
        .sort();
      if (JSON.stringify(observedPolicies) !== JSON.stringify([...RELEASE_BRANCHES].sort())) {
        failures.push(`GitHub release environment branch allowlist differs from ${RELEASE_BRANCHES.join(', ')}`);
      }
      if (!observedPolicies.includes(expected.candidate?.branch)) failures.push('GitHub release environment does not allow the exact candidate branch');
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
