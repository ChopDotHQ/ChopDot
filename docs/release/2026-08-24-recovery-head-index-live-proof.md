# RecoveryHeadIndex live public-testnet proof

Recorded: 2026-08-24

Exclusive root: `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`

Branch: `codex/chopdot-v1-launch`

Accepted implementation and evidence commit:
`87da71efb65cdc0b841bb5beebc4c9261d12bed4`

This record makes the bounded live recovery-contract result citable by the
exact-worktree Repo Graph and Context Graph v2. It does not claim that the
frontend release has been staged, promoted, named, transferred, or completed
by real users.

## Decision: Products Devnet RecoveryHeadIndex is deployed and behavior-proven at 0x391DBCF8267f6AeCd4BE5DD84039dF588EC337EC

The deployment transaction
`0x2d49753699012b494a0b71979ee0a0ec1e5acb95bc78b2c2ba8722424b93eade`
is recorded in finalized block `12603206`, block hash
`0x4ad0b1745ae3d4f09fc8dee7b940bdde7c5483e95c86b159ee0d1ddfc77d87b2`.
The 5,561-byte readback hash is
`f73520ea129a07dc5827ce3826fb730930ce4a2a2081bb7b5a3665c243b2b9b2`,
equal to the reviewed PVM artifact hash.

The accepted behavior transaction
`0x66407e6931f32ec323897e5a2d2845ea1ac79f9cee2418c5c2a913bfed8f33a3`
is recorded in block `12603218`. Its canonical finalized receipt and state
readback prove successful compare-and-swap advance, the exact event and state,
stale-advance rejection, owner isolation, and stream isolation.

Primary evidence:

- `deployment/recovery-head-index/devnet.json`, SHA-256
  `4de1c9cdf52d022e27924f8a2fdcb5050375c05c01b3139143ba69687bfafe41`
- `deployment/recovery-head-index/devnet.behavior.json`, SHA-256
  `6893b155db00a6ec7ac6fbed23380eb73e32257b7f78f59eb464f6375e0f79b4`

## Decision: Paseo Next v2 RecoveryHeadIndex is deployed and behavior-proven at 0xaD2DaC1E4d41260677e565Fb8Eb1810e13ca5c69

The deployment transaction
`0xaba6281c9220064fa0b01d9dd08231583efcf67cd100815e035b9d8d8546fb05`
is recorded in finalized block `518094`, block hash
`0xb90cea3e5d84a28e17c9011c8682b0bfc70a978b74bd289603caec47bc4a91ad`.
The 5,561-byte readback hash is the same reviewed PVM artifact hash:
`f73520ea129a07dc5827ce3826fb730930ce4a2a2081bb7b5a3665c243b2b9b2`.

The accepted behavior transaction
`0x98f615ce9f80209c1c6d242b58fcf46d429af5d79d3333daf88a6e68b6bed89e`
is recorded in finalized block `518126`, block hash
`0x1de780798e608573000574de894452a566b9d3c091873ce660f31571c3da310a`.
Its canonical finalized receipt and state readback prove the same five
assertions. The accepted isolated test stream advanced from sequence 1 to 2
because the first transaction, which exceeded the earlier local wait window,
later finalized; neither transaction touched a product or user stream.

Primary evidence:

- `deployment/recovery-head-index/paseo-next-v2.json`, SHA-256
  `083a96cb0554d63e948b186f9c5cea551af047e07f568d30d5ae1a44281f1a8a`
- `deployment/recovery-head-index/paseo-next-v2.behavior.json`, SHA-256
  `f803f02a41536775f261752e960b639a46044484a59d2ad4a6e0eb549b3385a8`

## Decision: both public-testnet deployments use identical reviewed source, ABI, and PVM bytecode

The common source SHA-256 is
`2da5178aaa0066512f5e742b43d46597665d474f251e9b860b48a247322781cb`.
The ABI SHA-256 is
`fdd95bedb42457a020f387b430f0e1d861efaa5204119069b8b56d5ca9ec42b1`.
The PVM bytecode SHA-256 is
`f73520ea129a07dc5827ce3826fb730930ce4a2a2081bb7b5a3665c243b2b9b2`.
Both live readbacks equal that PVM hash.

## Decision: the recovery contract remains a bounded non-authority index

`RecoveryHeadIndex` binds each stream head to `msg.sender` and exposes only
`readHead` and compare-and-swap `advanceHead`. It has no admin, upgrade,
delegate, membership, money, delete, custody, or external-call authority.
Its live presence does not make it membership authority or money authority.

## Verification: live finality and regression gates pass

The accepted verifier waits up to 240 seconds for finalized head progression,
then rereads the canonical receipt and requires the expected transaction hash,
block number, block hash, and successful status before recording proof. The
signer-bound stale compare-and-swap test passes with the recorded owner rather
than the zero address.

The accepted post-repair results are:

- `npm run test:release-tooling`: 17 passed, 0 failed.
- `npm run test:recovery-contract`: Solidity behavior 4 passed, 0 failed;
  TypeScript recovery tests 6 passed, 0 failed; PVM source/ABI and parity gates
  passed.
- `npm run contract:hardhat:pvm && npm run test:recovery-contract:behavior && npm run lint`:
  exit 0 with no telemetry or editor prompt.

## Release boundary: recovery deployment is proven but the frontend candidate is not yet staged

At this checkpoint: `implemented=true`, local `tested=true`, `committed=true`,
and `pushed=true`. `candidate_built=false`, `staged=false`, `promoted=false`,
`reachable=false`, `user_owned=false`, and `user_proven=false`. `kg_known`
becomes true only when the exact-worktree Repo Graph refresh and Context Graph
v2 cited-recall gate pass against this record without fallback.
