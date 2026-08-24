# Testnet release evidence

This directory contains reviewed release inputs and independently executed
readbacks. It never contains private keys, seed phrases, mnemonics, passwords,
wallet sessions, or other signing secrets.

ChopDot targets two Asset Hub environments that both report EVM chain id
`420420417`. Chain id is therefore never accepted as environment identity.

| Environment | Asset Hub genesis | Para id | Same-endpoint identity |
| --- | --- | --- | --- |
| Products Devnet | `0xd6eec26135305a8ad257a20d003357284c8aa03d0bdb2b357ab0a22371e11ef2` | 1000 | Devnet-specific DotNS address/code set through `https://services.polkadothub-rpc.com/testnet` |
| Paseo Next v2 | `0x23e730eb1c6fecae09c917439a5038cb6122d0d48980e8b9bbf0ff56f94a2ca6` | 1500 | Paseo-specific DotNS address/code set through `https://eth-rpc-paseo-next.polkadot.io` |

`dotns-code-anchors-2026-08-23.json` records the immutable code hashes of every
DotNS contract required by the release path. Every contract deploy or frontend
publish preflight reads those hashes through the exact Ethereum RPC endpoint
that would receive the write. The Substrate genesis read over WSS is a second,
corroborating signal; it is no longer used to make a false claim that two
different endpoints are cryptographically bound.

Run the read-only environment gates at any time:

```text
npm run deploy:preflight:devnet
npm run deploy:preflight:paseo
```

## Locked deployment executable

The worktree pins the official npm package
`@polkadot-community-foundation/polkadot-app-deploy@0.13.1` and its exact npm
integrity in `package-lock.json`. Release commands run the worktree-local binary
through `./scripts/deploy-locked.sh`; a globally installed binary is not release
evidence. Before every release preparation, verification, readback, stage, or
promotion, the runner creates a fresh temporary install outside the ChopDot
directory with `npm ci --ignore-scripts`, rejects any ancestor `node_modules`,
and hashes the complete transitive runtime closure. The reviewed closure is
528 packages and 39,363 files with SHA-256
`804d0831a28d280665dbd5d3480df14229b640bedfcadaa198fd236f689c2c7d`.
Those counts and that aggregate are embedded in `release.json` and the deploy
attestation header; the CLI is executed from that verified isolated install,
which is removed after the synchronous command finishes.

```text
npm ci
npm run deploy:tool:verify
```

The reviewed official environment override is pinned separately because the
CLI's bundled testnet DotNS addresses are older. The wrapper rejects a mismatched
`RELEASE_ENV`, `RELEASE_DOMAIN`, CLI `--env`, positional domain, environment
file, config, build id, or CAR mode before the CLI can perform a write.

## RecoveryHeadIndex

`npm run contract:compile:pvm` creates one canonical `.polkavm` artifact from
the pinned Solidity source, `@parity/resolc@1.4.0`, `solc@0.8.28`, optimizer
settings, and ABI. The PVM manifest binds:

- Solidity source hash;
- ABI hash;
- compiler and optimizer inputs;
- bytecode hash and byte count;
- ordered artifact-set digest.

The release also hashes the compile verifier, independent Hardhat/Polkadot
parity verifier, local Solidity behavior config, and executable behavior test.

```text
npm run contract:verify:pvm
npm run contract:hardhat:pvm
npm run test:recovery-contract:behavior
npm run test:recovery-contract
npm run contract:preflight:devnet
npm run contract:preflight:paseo
```

The behavior test executes the current Solidity source on the local Hardhat EVM
and covers initial/advance, stale compare-and-swap rejection, owner/stream
isolation, and empty-input rejection. PVM byte identity is independently checked
through both supported compiler paths. A live PVM deployment is not proven until
strict verification reads the deployed bytes back from both exact endpoints.
The release manifest also hashes the live deployment script, its caller/finality
verification library, and the release-tooling regression suite. Live finality
rechecks the exact transaction receipt and block hash so an orphaned receipt
cannot become accepted release evidence.

`scripts/recovery-head-deployment.mjs --write` is deliberately not an npm
shortcut. It additionally requires a scoped testnet-only
`CHOPDOT_RECOVERY_DEPLOYER_PRIVATE_KEY` and the exact four-part confirmation
printed by the read-only preflight:

```text
environment:asset-hub-genesis:endpoint-code-anchor-file-sha256:pvm-bytecode-sha256
```

It deploys the already-compiled artifact, reads the code back through the same
anchored ETH endpoint, and records the address, signer public address,
transaction hash, block number/hash, exact bytecode, source, ABI, build-input,
and artifact-set identities. Strict verification also rereads the transaction
receipt and requires it to be a successful contract creation at that exact
address and block. Never place the key in command arguments, source,
logs, a report, or chat.

## Build once, stage once, promote the same CAR

Build only from the clean accepted commit:

```text
npm ci
npm run lint
npm run build:dot-host
npm run e2e:dot-host-preview
npm run security:baseline
npm run verify:dot-host
```

`verify:dot-host` is explicitly a candidate-only check. It never grants release
approval. Extract the recorded build id, select one exact domain, and stage on
Devnet while preserving the complete CLI output as evidence:

```text
RELEASE_ENV=devnet
RELEASE_DOMAIN=chopdotapp01.dot
RELEASE_COMMAND_MODE=stage
RELEASE_OWNERSHIP_MODE=direct-devinson
RELEASE_EXPECTED_DEVINSON_OWNER=<public H160 confirmed with Devinson>
RELEASE_SIGNED_IN_ADDRESS=${RELEASE_EXPECTED_DEVINSON_OWNER}
BUILD_ID=<the exact dist-dot-host/release.json buildId>
RELEASE_CAR=deployment/releases/${BUILD_ID}.car
DEVNET_LOG=deployment/readbacks/${BUILD_ID}.devnet.deploy.log
set -o pipefail

DO_NOT_TRACK=1 PAD_UPDATE_CHECK=0 \
RELEASE_ENV=${RELEASE_ENV} RELEASE_DOMAIN=${RELEASE_DOMAIN} \
RELEASE_COMMAND_MODE=${RELEASE_COMMAND_MODE} \
RELEASE_OWNERSHIP_MODE=${RELEASE_OWNERSHIP_MODE} \
RELEASE_EXPECTED_DEVINSON_OWNER=${RELEASE_EXPECTED_DEVINSON_OWNER} \
RELEASE_SIGNED_IN_ADDRESS=${RELEASE_SIGNED_IN_ADDRESS} \
./scripts/deploy-locked.sh \
  dist-dot-host ${RELEASE_DOMAIN} \
  --env ${RELEASE_ENV} \
  --environment-file deployment/pad-environments-2026-08-23.json \
  --config polkadot-app-deploy.config.ts \
  --js-merkle \
  --dump-car=${RELEASE_CAR} \
  --tag ${BUILD_ID} \
  --no-transfer-to-signedin-user 2>&1 | tee ${DEVNET_LOG}
```

Promotion consumes those exact CAR bytes and cannot rebuild:

```text
RELEASE_ENV=paseo-next-v2
RELEASE_COMMAND_MODE=promote
RELEASE_OWNERSHIP_MODE=direct-devinson
RELEASE_CAR_SHA256=<sha256 of the validated Devnet CAR>
PASEO_LOG=deployment/readbacks/${BUILD_ID}.paseo-next-v2.deploy.log
set -o pipefail

DO_NOT_TRACK=1 PAD_UPDATE_CHECK=0 \
RELEASE_ENV=${RELEASE_ENV} RELEASE_DOMAIN=${RELEASE_DOMAIN} \
RELEASE_COMMAND_MODE=${RELEASE_COMMAND_MODE} \
RELEASE_OWNERSHIP_MODE=${RELEASE_OWNERSHIP_MODE} \
RELEASE_EXPECTED_DEVINSON_OWNER=${RELEASE_EXPECTED_DEVINSON_OWNER} \
RELEASE_SIGNED_IN_ADDRESS=${RELEASE_SIGNED_IN_ADDRESS} \
RELEASE_CAR_SHA256=${RELEASE_CAR_SHA256} \
./scripts/deploy-locked.sh \
  --input-car=${RELEASE_CAR} ${RELEASE_DOMAIN} \
  --env ${RELEASE_ENV} \
  --environment-file deployment/pad-environments-2026-08-23.json \
  --config polkadot-app-deploy.config.ts \
  --tag ${BUILD_ID} \
  --no-transfer-to-signedin-user 2>&1 | tee ${PASEO_LOG}
```

### Ownership semantics

Do not infer ownership behavior from the flag name. In the pinned CLI,
`--no-transfer-to-signedin-user` makes the signed-in phone/session signer
perform the DotNS transactions directly. That mode is mandatory for this
release: executable-manifest publication occurs after content publication, so
a worker that transfers the name first is no longer authorized to finish the
resolver and text-record writes. The locked wrapper rejects the transfer mode
before any write. Never clear or replace a user's session silently merely to
obtain worker ownership.

Login and signing are user ceremonies. Record only the public recipient address.

## Independent live readback and promotion evidence

Release proof is fail-closed and is not satisfied by CLI-shaped JSON or copied
arguments. The locked wrapper accepts only two command shapes:

- `RELEASE_COMMAND_MODE=stage` with `RELEASE_ENV=devnet`, positional
  `dist-dot-host <domain>`, `--js-merkle`, and the exact
  `deployment/releases/<buildId>.car` dump path.
- `RELEASE_COMMAND_MODE=promote` with `RELEASE_ENV=paseo-next-v2`, positional
  `<domain>`, and that exact CAR as `--input-car`. The wrapper reconstructs the
  UnixFS DAG, verifies every release-manifested path and byte hash, rejects
  unreachable/unmanifested blocks, and requires `RELEASE_CAR_SHA256` before it
  invokes the CLI.

The official three-section CAR adds exactly one internal path,
`.bulletin-deploy/manifest.json`. The verifier permits only that deploy metadata
file, requires its v3 index to match every immutable release path, reproduces
the exact ordered CAR bytes, and independently derives the outer Bulletin
storage CID. That published storage CID is kept distinct from the CAR's inner
UnixFS directory root.

Both modes require `DO_NOT_TRACK=1`, `PAD_UPDATE_CHECK=0`, the reviewed config
and environment files, one explicit ownership mode, and an explicit public
address in both `RELEASE_EXPECTED_DEVINSON_OWNER` and
`RELEASE_SIGNED_IN_ADDRESS`. The values must match. Dangerous override
variables and all unlisted flags are rejected before endpoint preflight or CLI
invocation. No secret belongs in arguments or evidence.

Final readback requires `--expected-devinson-owner=0x...`. It independently
requires both DotNS owners to equal that address, exact root/executable manifest
shapes, the CAR root as the published CID, transaction/block inclusion carrying
the exact resolver calldata, the icon bytes, and every `release.files` byte on
both the named browser gateway and direct IPFS gateway. Promotion recording
requires the same expected owner on Devnet and Paseo. Strict verification also
requires the operator-supplied `DOT_EXPECTED_DEVINSON_OWNER`; an arbitrary
equal nonzero owner is never accepted as user ownership.

`release.json` includes deterministic `sbom.json` and `licenses.json` evidence
derived from the exact lockfile. `npm run verify:dot-host:rebuild` builds into
two fresh output directories and requires both outputs and the candidate to be
byte-identical. Each tracked source archive is streamed directly into its own
`tar` extractor, so repository size cannot exhaust Node's synchronous child-
process output buffer. The locally installed deployment CLI attestation covers all
package-owned files (not only the launcher), package integrity, and runtime
version output.

The wrapper never logs in. Login is an explicit user-assisted prerequisite used
only to learn and confirm the public address. These scripts do not deploy,
publish, transfer, or sign during ordinary tests or preflights.

CID-shaped arguments are not evidence. For each environment,
`release:readback` independently performs all of the following:

- parses every CAR block, reconstructs the one-root UnixFS DAG, and proves the
  exact bytes and hash of every manifested application file plus `release.json`;
- binds the log to the locked local CLI, environment, domain, build id, and CAR;
- verifies each recorded transaction hash is present in the independently read
  finalized block and that the extrinsic carries the exact anchored resolver,
  base/app node, and contenthash call bytes;
- reads base-name owner, app-subname owner, resolvers, contenthashes, and manifest
  text records from the anchored ETH endpoint;
- parses both contenthashes as real CIDs and requires base/app equality;
- fetches and hashes every manifested HTML, JavaScript, CSS, asset, SBOM,
  license inventory, and `release.json` file through both the named browser
  gateway and direct IPFS gateway.

```text
npm run release:readback -- \
  --environment=devnet \
  --domain=${RELEASE_DOMAIN} \
  --car=${RELEASE_CAR} \
  --deploy-log=${DEVNET_LOG} \
  --expected-devinson-owner=${RELEASE_EXPECTED_DEVINSON_OWNER} \
  --output=deployment/readbacks/${BUILD_ID}.devnet.json

npm run release:readback -- \
  --environment=paseo-next-v2 \
  --domain=${RELEASE_DOMAIN} \
  --car=${RELEASE_CAR} \
  --deploy-log=${PASEO_LOG} \
  --expected-devinson-owner=${RELEASE_EXPECTED_DEVINSON_OWNER} \
  --output=deployment/readbacks/${BUILD_ID}.paseo-next-v2.json
```

Only then may the promotion attestation be created. The recorder re-executes
both live readbacks; it accepts no CID, owner, transaction, or block as a raw
shape-only argument.

```text
npm run release:record-promotion -- \
  --car=${RELEASE_CAR} \
  --expected-devinson-owner=${RELEASE_EXPECTED_DEVINSON_OWNER} \
  --devnet-readback=deployment/readbacks/${BUILD_ID}.devnet.json \
  --paseo-readback=deployment/readbacks/${BUILD_ID}.paseo-next-v2.json

DOT_EXPECTED_DEVINSON_OWNER=${RELEASE_EXPECTED_DEVINSON_OWNER} \
  npm run verify:dot-host:strict
```

Strict verification is a live release proof. It fails closed unless the source
tree was clean, compiler/behavior checks rerun, both recovery contracts have
endpoint-bound byte readback and transaction/block evidence, the one CAR is
intact, both independent DotNS/gateway readbacks still match, both networks
resolve the same content CID, and no unexplained dirty paths remain.

At repository time, no contract deployment, frontend publication, transfer, or
login is implied by these tools. Those states exist only after their strict live
evidence files are present and pass.

Primary sources:

- <https://github.com/paritytech/revive>
- <https://github.com/paritytech/hardhat-polkadot>
- <https://docs.polkadot.com/smart-contracts/connect>
- <https://github.com/paritytech/polkadot-app-deploy>
