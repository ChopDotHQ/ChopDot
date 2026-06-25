# Polkadot Native External Dependencies Audit

Status: `active`  
Last updated: 2026-06-16  
Evidence ledger refs: `EXT-001`, `EXT-002`, `EXT-003`, `EXT-004`

## Purpose

Document non-Parity dependencies that materially affect ChopDot's fully-native migration path: import chains, failure modes, pin strategy, and fallback behaviour.

## EXT-001: `@polkadot-api/json-rpc-provider`

### Import chain

```text
@parity/product-sdk-host
  -> @novasamatech/host-api-wrapper@0.8.9
    -> @polkadot-api/json-rpc-provider (isResponse import)
```

ChopDot does not import this package directly in app source; it appears transitively when host-wrapper is loaded at runtime.

### Known failure mode

- `@novasamatech/host-api-wrapper` imports `isResponse` from `@polkadot-api/json-rpc-provider`.
- Installed provider version in some trees does not export `isResponse`.
- Result: host signing preflight fails in normal browser bundling context.

### Evidence

- [product-account-signer-spike-report.md](./product-account-signer-spike-report.md)
- `ChopDot/package-lock.json` dependency tree

### Pin / mitigation strategy

- Pin compatible `@polkadot-api/json-rpc-provider` version in host container builds.
- Keep runtime dynamic import + `likelyInsideProductHost` guard in ChopDot.
- Do not promote Product Account signing beyond spike until host-container proof passes.

### Fallback

- `demo-blake2` signer in `polkadotSession.ts` for non-host contexts.

---

## EXT-002: `@novasamatech/host-api` + `host-api-wrapper`

### Import chain

```text
ChopDot/package.json
  -> @parity/product-sdk-host@^0.10.1
    -> @novasamatech/host-api-wrapper@0.8.9
      -> @novasamatech/host-api@0.8.9
```

ChopDot integration surfaces:

- `src/chopdot-dot/polkadotSession.ts` (`ProductAccountDotSessionSignerAdapter`, `likelyInsideProductHost`)
- `src/components/screens/ChapterHome.tsx` (native signer selection)

### Known failure modes

- Host unavailable outside Polkadot Desktop/Mobile/Web host container.
- Package compatibility mismatch (see EXT-001).
- Signer manager initialization race if host bridge not ready.

### Pin strategy

- Lock `product-sdk-host`, `host-api`, and `host-api-wrapper` versions together.
- Re-verify on every Product SDK minor bump.

### Fallback

- Demo signer adapter; user-facing copy unchanged.

---

## EXT-003: Wallet extension + WalletConnect stacks

### Import chain

```text
AccountContext
  -> useExtensionConnect / useWalletConnectFlow
    -> services/chain/polkadot.ts (extension signer)
    -> services/chain/walletconnect.ts (dual-namespace)
capabilities.ts
  -> canSettleOnAssetHub
  -> canCloseoutOnPolkadotHub (injected EVM provider)
```

### Known failure modes

- Session persistence loops on mobile WalletConnect return.
- Split capability model: settlement vs closeout use different provider stacks.
- `evmAddress` required for closeout readiness in `pvmCloseout.ts`.

### Pin strategy

- Keep WalletConnect and extension SDK versions aligned with `@polkadot/api` in lockfile.
- Track `polkadot-onboard` compatibility notes.

### Fallback

- Simulation flag `VITE_SIMULATE_PVM_CLOSEOUT=1` for closeout lab paths.

### ChopDot posture

- **Hybrid by design today**; parallel to Product Account native path during migration.

---

## EXT-004: Delivery channels (email / chat / push)

### Role

- Invite distribution and user notifications.
- No Polkadot protocol-native replacement in audited stack.

### ChopDot mapping

- Catch pillar: participant acquisition and invite acceptance UX.
- Must not become truth authority; signed invite envelope remains kernel truth.

### Failure modes

- Delivery delay or loss does not invalidate signed invite semantics.
- Abuse/spam requires app-layer controls (rate limits, revocation propagation).

### Fallback

- Manual deep-link share URL.

---

## EXT-005: Indexer / search / analytics / ops (declared external)

### Role

- Product analytics, BI, full-text search, incident monitoring.
- Not part of native truth core.

### ChopDot mapping

- Optional SaaS envelope; does not affect kernel replay truth.

### Policy

- External systems may observe projections; cannot mutate signed-event truth.

---

## Summary Table

| Dependency | Blocks native path? | Confidence | Mitigation |
| --- | --- | --- | --- |
| `@polkadot-api/json-rpc-provider` | Yes (host signer) | blocked | version pin + host-container proof |
| `@novasamatech/host-api*` | Yes (until proven) | lab_proven | runtime guard + host proof gates |
| Wallet extension / WC | No (parallel hybrid) | lab_proven | keep during migration bridge |
| Delivery channels | No (edge only) | proven | adapter boundary only |
| Indexer/analytics/ops | No | declared | external by design |
