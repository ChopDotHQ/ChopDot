# ChopDot local public-beta assurance record

> **Kind:** historical exact-commit measurement
> **Status:** superseded as current state by `current-release-state.json`
> **Authority:** retains the verification result for its named commit only

Verified: 2026-08-24T09:20:32Z  
Exclusive root: `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`  
Branch: `codex/chopdot-v1-launch`  
Accepted source commit: `1a44c4ceced4ed75168d86d28a5b924925a0c5e6`  
Accepted source tree: `b2963070c5026117f986596f1fd1327a737000b5`  
Remote: `origin/codex/chopdot-v1-launch`  
Pull request: `https://github.com/ChopDotHQ/ChopDot/pull/13`

## Decision: bounded public-beta source is implemented

Status: verified locally.

The production entrypoint contains the receipt-first normal-pot journey and
shared signed authority used by verified contacts, intentional membership,
exact money, payment request/mark/receiver confirmation, ordered history,
recovery, Spend Card, savings circle, emergency pot, and community fund.
This decision is bounded to the committed source and production-entrypoint test
scope. It is not a deployment, reachability, ownership, or real-user claim.

## Decision: accepted local assurance passes

Status: verified locally.

| Verification | Result |
| --- | --- |
| `npm run test:node` | 334 passed, 0 failed |
| `npm run test:release-browser -- --max-failures=1` | 74 passed, 0 failed |
| Focused production-authority suite | 7 passed, 0 failed |
| Named multi-account production-entrypoint suite | 5 passed, 0 failed |
| Membership invitation UI suite | 5 passed, 0 failed |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0; 3,030 modules transformed |
| `npm run security:baseline` | exit 0; 194 files checked |
| `npm run security:runtime-boundary` | exit 0; 0 suspect runtime imports; mainnet disabled |
| `npm run test:recovery-contract` | Solidity behavior 4/4; recovery adapter 6/6 |
| `npm run test:release-tooling` | 15 passed, 0 failed |
| `npm run deploy:tool:verify` | exit 0 |
| Devnet and Paseo contract preflights | pass, read-only, writes disabled |
| Devnet and Paseo deploy preflights | pass, read-only |
| `npm run e2e:dot-host-preview` | 2 passed, 0 failed |

The lockfile SHA-256 is
`eec2a599eb6eb7f8c9f012d1b107b70dcb646478b6e7c9bc759823ebfa671e0c`.
The recovery-contract source SHA-256 is
`2da5178aaa0066512f5e742b43d46597665d474f251e9b860b48a247322781cb`.
The compiled PVM bytecode SHA-256 is
`f73520ea129a07dc5827ce3826fb730930ce4a2a2081bb7b5a3665c243b2b9b2`.
The reviewed deployment-tool runtime aggregate is
`804d0831a28d280665dbd5d3480df14229b640bedfcadaa198fd236f689c2c7d`.

## Decision: release booleans remain separate

Status: current at this record.

| Boolean | Value | Evidence boundary |
| --- | --- | --- |
| `implemented` | true | Accepted source commit and production-entrypoint suites |
| `tested` | true for local accepted source | Exact counts above; clean-candidate and live checks remain |
| `committed` | true | Commit `1a44c4ceced4ed75168d86d28a5b924925a0c5e6` |
| `pushed` | true | Remote branch and PR 13 |
| `candidate_built` | false | The earlier dirty preview is explicitly not the release candidate |
| `staged` | false | No Products Devnet name or content write has occurred |
| `promoted` | false | No public-testnet promotion has occurred |
| `reachable` | false | No accepted candidate URL has been verified |
| `user_owned` | false | No release name has been transferred or read back |
| `user_proven` | false | No real organizer plus two participants have completed acceptance |
| `kg_known` | false pending refresh | This record is the source that the exact-worktree graph must ingest and recall |

## Next gate

Refresh Repo Graph for this exact root and require Context Graph v2 to recall
this record with verified exact-root citations and no fallback. Then freeze and
rebuild one clean deterministic candidate before any contract or DotNS write.
