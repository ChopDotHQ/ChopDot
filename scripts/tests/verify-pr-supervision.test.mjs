import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validatePullRequestBody } from '../verify-pr-supervision.mjs';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'governance/supervision-contract.json'), 'utf8'),
);
const baseSha = '1'.repeat(40);
const headSha = '2'.repeat(40);

function body(overrides = {}) {
  return `## Summary

Adds supervision enforcement.

## Supervision traceability

- **Exact base SHA:** ${overrides.baseSha ?? baseSha}
- **Exact head SHA:** ${overrides.headSha ?? headSha}
- **Change class:** ${overrides.changeClass ?? 'tests'}
- **Affected invariant IDs:** ${overrides.affected ?? 'EVIDENCE-INV-001 PLATFORM-INV-001'}
- **ADRs added/updated:** None
- **Investigations added/updated:** None

## Authority and failure analysis

${overrides.authority ?? 'This changes no financial authority. The verifier fails closed on malformed governance state and cannot mutate product or money state.'}

## Claim-to-evidence table

| Claim | Evidence level | Exact command or artifact | Candidate SHA | Result / gap |
|---|---|---|---|---|
${overrides.claimRow ?? `| The contract verifier rejects invalid promotion | unit | node --test scripts/tests/verify-supervision-contract.test.mjs | ${headSha} | pass |`}

## Side investigations

${overrides.investigations ?? 'None — this is governance-only tooling and no side-investigation trigger changes product behavior.'}

## Supabase independence

- [x] No active provider dependency or runtime reference introduced.
- [x] Historical references remain inactive and archival.

## Verification

- [x] Gate self-tests passed.
- [x] Structural verification passed.

## Release state

Requested decision: ${overrides.decision ?? 'READY_FOR_CODEX_VERIFY'}

Requested promotion, if any: None

Why the available evidence permits that promotion: Unit proof only; no release promotion requested.

## Remaining risk

${overrides.risk ?? 'The PR-body check relies on consistent headings and does not replace technical review or release evidence.'}
`;
}

test('accepts a complete traceable PR body', () => {
  const result = validatePullRequestBody({ body: body(), contract, baseSha, headSha });
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rejects an unknown invariant ID', () => {
  const result = validatePullRequestBody({
    body: body({ affected: 'UNKNOWN-INV-001' }),
    contract,
    baseSha,
    headSha,
  });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Unknown affected invariant ID')));
});

test('rejects a stale declared head SHA', () => {
  const result = validatePullRequestBody({
    body: body({ headSha: '3'.repeat(40) }),
    contract,
    baseSha,
    headSha,
  });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('does not match PR head')));
});

test('rejects an empty claim table', () => {
  const result = validatePullRequestBody({
    body: body({ claimRow: '| | | | | |' }),
    contract,
    baseSha,
    headSha,
  });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('completed claim row')));
});

test('rejects unchecked provider-independence attestations', () => {
  const candidate = body()
    .replaceAll('- [x] No active', '- [ ] No active')
    .replaceAll('- [x] Historical', '- [ ] Historical');
  const result = validatePullRequestBody({ body: candidate, contract, baseSha, headSha });
  assert.equal(result.ok, false);
  assert(
    result.errors.some((error) => error.includes('Supabase-independence attestations')),
  );
});

test('rejects the unchanged decision placeholder', () => {
  const result = validatePullRequestBody({
    body: body({ decision: 'ACCEPT | HOLD' }),
    contract,
    baseSha,
    headSha,
  });
  assert.equal(result.ok, false);
  assert(result.errors.some((error) => error.includes('Requested decision')));
});
