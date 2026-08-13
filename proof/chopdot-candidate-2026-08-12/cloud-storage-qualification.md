# Cloud Storage 0.10.0 qualification for B1

Date: 2026-08-12  
Programme: B — native truth  
Scope: package/source qualification only; no package install, signing, allowance
request, network write, deploy, or publish was performed  
Candidate: `@parity/product-sdk-cloud-storage@0.10.0`  
Verdict: **PARTIAL**

## Decision

`@parity/product-sdk-cloud-storage@0.10.0` is a credible **replaceable transport
for an already-encrypted checkpoint blob**. It is not a complete B1 recovery
solution and is not qualified for the current portable-shell dependency/real
Desktop line.

It does **not** encrypt, wrap keys, index a member's objects, discover the latest
checkpoint, or recover a CID on a fresh device. A new device that does not
already know the CID (and, for verification, the block/index receipt) cannot use
this SDK to find the checkpoint. The B1 `Replaceable archive seam` and
`Same-account wrapped-key recovery` rows therefore remain `RED` in
[`requirements-matrix.md`](./requirements-matrix.md).

Do not install 0.10.0 directly into the current portable shell. It pins Product
SDK Host 0.15.1 while the shell is on 0.14.1, and the currently observed real
Desktop host is older again. The next safe step is the isolated, zero-write
compatibility canary defined below.

## Method and reproducible package receipt

The npm registry metadata and the published tarballs were inspected. The
package was not installed into either ChopDot worktree.

```text
package: @parity/product-sdk-cloud-storage
version: 0.10.0
tarball: https://registry.npmjs.org/@parity/product-sdk-cloud-storage/-/product-sdk-cloud-storage-0.10.0.tgz
integrity: sha512-Fb/2RNCUltKnO/xBetbcURFhKEsRDSG8DotO4SQT4RZ94bic7dq3jKaJXS3tY8H6ysYgPvnJrcgtfw5pskpzeg==
license: Apache-2.0
module: ESM
package sideEffects flag: false
```

Reproduce the inspection without changing the repo:

```bash
QUAL_DIR="$(mktemp -d)"
npm view @parity/product-sdk-cloud-storage@0.10.0 version dist dependencies --json
npm pack @parity/product-sdk-cloud-storage@0.10.0 --pack-destination "$QUAL_DIR"
tar -xzf "$QUAL_DIR"/parity-product-sdk-cloud-storage-0.10.0.tgz -C "$QUAL_DIR"
find "$QUAL_DIR/package/src" -maxdepth 2 -type f -print
```

Source references below use paths inside that exact tarball, for example
`package/src/client.ts`.

## FACTS

### 1. Exact public capability surface

The 0.10.0 entry point exports `CloudStorageClient`, network presets, CID
helpers, authorization helpers, read helpers, storage verification, a lazy
signer helper, its error family, and the upstream Bulletin builders/types.

| API | What it does | Read/write boundary |
| --- | --- | --- |
| `CloudStorageClient.create({ environment, signer, config? })` | Opens the preset chain-client stack for `paseo` or `devnet`. | Opens host-routed chain connections; does not itself sign. |
| `CloudStorageClient.create({ genesisHash, descriptor, signer, config? })` | Opens an explicit Bulletin descriptor and rejects a mismatched descriptor/genesis pair. | Opens a host-routed Bulletin connection; does not itself sign. |
| `CloudStorageClient.from(inner, api)` | Wraps a caller-owned `AsyncBulletinClient` and typed API. | Side effects belong to the supplied client; caller owns lifecycle. |
| `client.store(bytes)` | Returns the upstream fluent `StoreBuilder`. | Building is local; `.send()` signs/submits. |
| `client.authorizeAccount(...)` / top-level `authorizeAccount(...)` | Builds/submits account quota authorization. | Chain mutation; generally privileged/sudo on managed networks. |
| `client.authorizePreimage(...)` | Pre-authorizes a content hash. | Chain mutation/privileged action. |
| `client.renew(block, index)` | Renews an existing stored transaction. | Signed chain mutation; requires the prior locator. |
| `client.estimateAuthorization(size)` | Estimates transaction/byte quota. | Local/read-only calculation. |
| `client.checkAuthorization(address)` / `checkAuthorization(api,address)` | Reads `TransactionStorage.Authorizations`. | Chain read only. |
| `getBulletinAllowanceStatus(api,address)` | Reads authorization plus current block and derives `usable`/remaining blocks. | Chain read only. |
| `client.fetchBytes(cid)` / `fetchJson(cid)` / `queryBytes` / `queryJson` | Retrieves a **known CID** through the host preimage subscription. | Host/IPFS read; no public gateway fallback. |
| `client.verifyStored(cid,{block,index?})` | Confirms matching CID metadata at a **known block**. | Chain read only; no content retrieval or discovery. |
| `client.destroy()` | Tears down the client's upstream connection hook. | Required lifecycle cleanup. |

Evidence: `package/src/client.ts:39-51,126-181,184-272`,
`package/src/index.ts`, and `package/src/authorization.ts:54-174,258-300`.

The upstream `StoreBuilder` also exposes:

```text
withCodec
withHashAlgorithm
withWaitFor
withCallback
withChunkSize
withManifest
send
sendUnsigned
```

`sendUnsigned()` is not a free or no-side-effect bypass. It still submits to the
chain and only applies when content was pre-authorized by hash. Chunked stores
are explicitly non-atomic: if a later chunk fails, earlier chunks can remain
stored. The first write canary must therefore use one small ciphertext blob,
not a large/chunked real checkpoint.

Evidence: published `@parity/bulletin-sdk@0.3.0`
`package/dist/index.d.ts:580-617,796-814`.

### 2. Signer, account, host, and allowance requirements

Every `CloudStorageClient.create` shape requires a `PolkadotSigner`; the source
states that every store needs a signer. The Cloud Storage SDK does not discover
or choose ChopDot's actor account. ChopDot must obtain and freeze the correct
account/signer before the operation.

Inside the Product host, the relevant account path is:

```text
getProductAccount(dotNsIdentifier, derivationIndex)
  -> getProductAccountSigner(productAccount)
  -> CloudStorageClient.create({ ..., signer })
```

Using `createLazySigner` would resolve a signer per call. That convenience is
unsafe for an actor-bound archive if the active account can change between
preflight, store, and receipt handling. The B1 adapter must freeze one Product
Account/signer for the operation and bind the resulting CID/block/index receipt
to that account and candidate version.

Writes require a usable **Bulletin account authorization/quota**. This is a
different host resource from the shell's current `StatementStoreAllowance`.
The host SDK shows the Bulletin request shape as:

```ts
requestResourceAllocation([
  { tag: "BulletinAllowance", value: undefined },
])
```

Cloud Storage does not call this for ChopDot automatically. An allocation
request prompts the user and can change external allowance state; it is not
part of a read-only canary. `authorize_account` is additive while unexpired, so
a retry after an acknowledgment is lost can accidentally double the quota. A
caller must re-read authorization state before any retry.

Evidence: `package/src/client.ts:46-51,126-170,186-209`,
`package/src/authorization.ts:21-99,102-174,176-239`; published Product SDK Host
0.15.1 `package/src/accounts.ts:142-187,253-303` and
`package/src/truapi.ts:193-224`. The current shell only requests
`StatementStoreAllowance` at
`src/environment/polkadotHostBridge.ts:300-306`.

### 3. Devnet and container support

Version 0.10.0 includes a `devnet` Bulletin preset with genesis:

```text
0xe101f0fa4627d29a257645e02be86d80378fea1a2bf8fa6a918d150ebc760a59
```

The bundled chain-client marks `paseo` and public products `devnet` as currently
available. Polkadot and Kusama presets are not currently usable because the
required Bulletin/Individuality descriptor set is not live there.

All chain providers are obtained from Product SDK Host. There is no direct
WebSocket fallback, and reads deliberately have no public IPFS gateway fallback.
Outside a Polkadot Browser/Desktop container the host provider/preimage manager
path fails.

The environment shorthand opens the preset multi-chain shape (Asset Hub,
Bulletin, and Individuality), even though this use only needs Bulletin. The
explicit `{ genesisHash, descriptor, signer }` form opens only the supplied
Bulletin descriptor and is the narrower B1 adapter candidate.

Evidence: `package/src/networks.ts:19-41`, `package/src/client.ts:126-170`, and
published chain-client 0.10.0 `package/src/presets.ts` and
`package/src/providers.ts`.

### 4. What is stored and who provides confidentiality

The package accepts opaque `Uint8Array` data and calculates a CID. It does not
encrypt the bytes, wrap a group key, authenticate a member envelope, or validate
a ChopDot checkpoint. The chain records storage metadata; content bytes are
surfaced from IPFS through the host's preimage manager.

Therefore B1 must pass an already-encrypted, authenticated
`EncryptedGroupCheckpointV1` payload to `store()`. The CID will address the
ciphertext. Possession of a CID is not a confidentiality control; the security
boundary remains ChopDot's member-specific key/envelope and checkpoint
validation.

The older year-long app must not be copied blindly as the B1 implementation. Its
current adapter serializes a receipt directly into bytes before `store()`,
defaults to `paseo`, silently falls back unless strict mode is selected, and
does not destroy its created client after the store:

- `/Users/devinsonpena/ChopDot/src/chopdot-dot/polkadotSession.ts:2072-2107`
- `/Users/devinsonpena/ChopDot/src/chopdot-dot/polkadotSession.ts:2137-2148`

That adapter is a useful seam prototype, not encrypted checkpoint or recovery
proof.

### 5. Read, verification, retention, and discovery limits

`fetchBytes` and `fetchJson` require a known CID. The host lookup subscribes to
a CID-derived preimage key, defaults to a 30-second timeout, keeps polling after
a `null` result, and always unsubscribes on completion/interruption. DAG-PB
manifests are automatically fetched and reassembled from their chunk CIDs.

`verifyStored` additionally requires the known block number (and optionally the
index) from the store receipt. The package explicitly does not support a
full-chain scan. Verification only proves matching metadata at that location;
it does not retrieve the bytes or discover a checkpoint.

The package exposes no API equivalent to any of the following:

- list objects stored by this Product Account;
- find the latest object for a group/member;
- look up by ChopDot group ID, member ID, tag, or checkpoint frontier;
- discover a CID from a Product Account;
- enumerate a member's CID/block/index receipts;
- recover an encryption key or member envelope.

Authorization state is a quota record, not an object index. A CID receipt kept
only in local storage disappears with the device, and a receipt sent only
through the shell's 300-second Statement Store channel does not satisfy recovery
beyond 300 seconds. Retention/renewal policy must also be proved against the
live devnet runtime; package presence does not establish that the ciphertext
will remain available for ChopDot's recovery period.

**Conclusion on locator discovery:** **NO** — Cloud Storage 0.10.0 does not solve
fresh-device locator discovery. B1 still needs a separate durable,
account-discoverable locator carrying at minimum the encrypted checkpoint CID,
block/index receipt, group/key version, frontier, and integrity binding. That
locator must itself be recoverable without already knowing the group secret or
the device's old local state.

Evidence: `package/src/query.ts:14-43,67-123`,
`package/src/resolve-query.ts:16-102`, and `package/src/verify.ts:3-17,47-65,92-147`.

### 6. Version compatibility with the current shell/host

Current portable-shell line:

| Package/surface | Current version |
| --- | --- |
| `@parity/product-sdk-host` | 0.14.1 |
| resolved `@parity/truapi` | 0.5.1 |
| `@parity/product-sdk-statement-store` | 0.6.2 |
| `@parity/host-api-test-sdk` | 0.10.0 |
| observed real Desktop | 0.1.2 |
| observed real Desktop host-papp | 0.8.10 |

Evidence: portable-shell `package.json:41-56`, lockfile/install resolution, and
`../chopdotproof02-v0.5.6-native-readiness-2026-08-11/REPORT.md:64-82`.

Cloud Storage 0.10.0 line:

| Direct dependency | Required version |
| --- | --- |
| `@parity/product-sdk-host` | **0.15.1** |
| `@parity/product-sdk-chain-client` | 0.10.0 |
| `@parity/product-sdk-descriptors` | 0.9.0 |
| `@parity/product-sdk-tx` | 0.4.1 |
| `@parity/bulletin-sdk` | `^0.3.0` |
| host 0.15.1 -> `@parity/truapi` | `^0.7.0` |

Because both host versions are exact direct requirements, installing Cloud
Storage 0.10.0 beside the shell's host 0.14.1 yields two Host SDK/TruAPI lines,
not a safe dedupe. Source-level similarity of `getPreimageManager` does not prove
wire compatibility.

This is a material protocol change: Host 0.15.1 wraps Product Account
`derivationIndex` in the newer tagged `DerivationIndex` selector, whereas 0.14.1
sends the plain numeric field. The newer currently published matching line is
Statement Store 0.6.4 and host-api-test-sdk 0.12.0; the latter depends on host API
`^0.9.1`. The observed real Desktop host-papp is 0.8.10. The current real-host
proof already fails at the older 0.14.1/TruAPI 0.5.1 allowance boundary with
`Unknown enum discriminant: 92`.

Consequently:

- the existing main app's Cloud Storage 0.8.1 + Host 0.14.1 installation does
  not qualify Cloud Storage 0.10.0;
- upgrading only Cloud Storage would create a split host codec stack;
- upgrading the complete product-side line can be simulator-tested, but must
  not be called compatible with the installed real Desktop;
- a real Desktop upgrade/compatibility answer is required before a live write.

### 7. Side-effect map

| Operation | Effect | Allowed in this qualification? |
| --- | --- | --- |
| npm metadata/tarball inspection | Registry read and temporary local files | Yes; performed. |
| CID calculation / authorization estimate | Local computation | Yes; not needed for the verdict. |
| Mock query/store adapter | Local memory only | Yes; proposed for canary C0. |
| `CloudStorageClient.create` | Opens host-routed chain connection(s) | No; not performed. |
| `checkAuthorization` / `getBulletinAllowanceStatus` | Devnet reads | No; reserved for C1. |
| `fetchBytes` / `fetchJson` | Host-managed IPFS/preimage read | No; reserved for known-CID canary. |
| `requestResourceAllocation(BulletinAllowance)` | User prompt and external allowance allocation | No. |
| `store(...).send()` | Signs, consumes quota, submits, stores metadata/content | No. |
| `sendUnsigned()` | Submits pre-authorized content | No. |
| `authorizeAccount` / `authorizePreimage` | Privileged/additive chain mutation | No. |
| `renew(block,index)` | Signed chain mutation | No. |
| deploy/publish/register | External release mutation | No. |

The package's `"sideEffects": false` field is bundler tree-shaking metadata. It
does not mean client creation, host queries, uploads, authorization, or renewal
are side-effect free.

## INFERENCES

1. The SDK fits behind a `CheckpointArchive` port with operations such as
   `putCiphertext`, `getKnownCiphertext`, and `verifyKnownReceipt`. It must not
   own checkpoint authority, encryption, key recovery, or latest-locator logic.
2. The explicit devnet Bulletin descriptor is preferable to the environment
   shorthand because it opens only the chain B1 needs and narrows cleanup and
   failure modes.
3. A store receipt should be accepted only after CID, finalized block/index,
   frozen Product Account, checkpoint frontier/hash, crypto/key version, and
   exact candidate build are bound into ChopDot's signed locator record.
4. Silent fallback from a failed cloud write to a process-local map would make
   the product claim recovery it does not have. B1 must expose an honest local-
   only/retry state or fail closed.
5. Even a successful upload/fetch canary proves only archive transport. It does
   not turn same-account new-device recovery green until a device with no prior
   CID can discover the locator, unwrap only its member envelope, and converge.

## ASSUMPTIONS AND OPEN QUESTIONS

- The devnet preset and descriptor match the host's currently routed public
  products devnet; this is package-declared, not real-Desktop-proved here.
- The installed Desktop may be upgraded by Parity, but no compatible release or
  date is assumed.
- Exact devnet retention, renewal cost/quota, maximum practical one-blob size,
  and public readability of a known CID must be measured, not inferred.
- It is not yet decided which durable account-discoverable native surface will
  hold the latest locator. Cloud Storage itself cannot make that decision true.
- Product Account continuity across a truly fresh Desktop profile/device
  remains a Gate 0 real-host requirement, not a property of this package.

## Next steps — exact safe canaries

### C0 — next safe canary (zero host/network/signing mutations)

Run this first in a disposable compatibility branch or temporary fixture, with
separate approval for package-file changes. Do not install into the current
candidate tree casually.

1. Resolve one coherent product-side line: Cloud Storage 0.10.0, Host 0.15.1,
   Statement Store 0.6.4, and host-api-test-sdk 0.12.0. Abort if `npm ls` shows
   more than one Host SDK or TruAPI version.
2. Compile/bundle the portable shell without changing runtime behavior.
3. Use the package's mock/exported pure surfaces with a synthetic
   **already-encrypted** checkpoint fixture:
   - calculate the ciphertext CID;
   - resolve it through an injected in-memory query strategy;
   - decrypt and validate with ChopDot's checkpoint/key layer;
   - prove wrong key, tamper, wrong group, and wrong frontier fail;
   - scan the fixture/log/output and prove no plaintext group data or key was
     emitted.
4. Prove every client created by the adapter is destroyed in `finally` and
   that cloud failure cannot silently claim durable recovery.
5. Record exact lockfile, dependency tree, test output, and bundle hash under a
   new proof subfolder. Do not copy the main app's 0.8.1 adapter result.

**C0 pass means only:** the coherent 0.10.0 line and encrypted archive seam are
safe to take to read-only host qualification. It does not qualify the installed
real Desktop or B1 discovery.

### C1 — real Desktop, read-only compatibility canary

Only after C0 and an upstream-supported Desktop/package combination exist:

1. Open the exact app build in one real Desktop profile and record Desktop,
   host-papp, Host SDK, TruAPI, Cloud Storage, descriptor, and build versions.
2. Obtain the product account and a signer object, but do not invoke a sign
   method.
3. Feature-detect the devnet Bulletin host provider and preimage manager.
4. Open the explicit devnet Bulletin client, read only
   `getBulletinAllowanceStatus`, then destroy it in `finally`.
5. Abort on any decode/discriminant/transport error. Do not request an
   allowance and do not retry an approval loop.

Required evidence: screen recording/screenshot of exact Desktop/profile,
redacted console log, versions, address binding, call/result/exit status, and
proof that no approval/signature/allocation sheet appeared.

### C2 — smallest write/readback canary (requires fresh action-time approval)

After C1 passes, preflight the Bulletin allowance. If it is not already usable,
stop; do not request or grant one automatically.

With explicit approval, submit exactly one single-chunk synthetic ciphertext
(no ChopDot participant/group data), wait for finalization, capture
CID/block/index/account, call `verifyStored`, fetch the same CID, compare exact
ciphertext bytes, decrypt the fixture, and destroy the client in `finally`.
No retry after an unknown submission acknowledgment.

Even a C2 pass leaves B1 recovery `RED` until an isolated fresh device/profile
that starts with **no CID, block, index, local state, or group secret** discovers
the durable locator through the chosen account-bound channel and converges once.

## Qualification verdict

| Question | Result |
| --- | --- |
| Can 0.10.0 store/retrieve an opaque encrypted blob on declared devnet? | **Potentially yes; source-qualified, not host-proved.** |
| Does it encrypt or validate ChopDot checkpoints? | **No.** |
| Does it provide Product Account signer/account selection? | **No; ChopDot/Host must provide it.** |
| Does it automatically obtain Bulletin allowance? | **No.** |
| Does it solve fresh-device CID/locator discovery? | **No.** |
| Is it compatible with the current portable-shell/real-Desktop stack? | **Not qualified; current lines conflict.** |
| Should it be rejected outright? | **No; preserve it as a replaceable archive candidate.** |
| Overall | **PARTIAL.** |

## Documentation impact

This file records package qualification evidence only. It does not adopt an
architecture, change the B1 gate, modify product behavior, or prove runtime
compatibility. No wiki or ADR update is required now. If Cloud Storage is
selected after C0/C1, document the archive/locator split, encryption/key
boundary, allowance behavior, retention/renewal policy, and version matrix in
the relevant source wiki/ADR before calling the adapter implemented.
