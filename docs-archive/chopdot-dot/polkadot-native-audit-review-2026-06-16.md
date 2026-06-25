# Polkadot Native Audit — Independent Verification Review

Status: `review-complete`
**Reviewed:** 2026-06-16
**Reviewer scope:** audit-only (no app code changed)
**Method:** re-derived the programme's load-bearing claims from primary sources — installed dependency tree (`package.json`, `package-lock.json`, `node_modules`), ChopDot source, upstream GitHub/npm — rather than trusting the docs.
**Subject artefacts:** [polkadot-native-cursor-handoff.md](./polkadot-native-cursor-handoff.md), [audit-dossier](./polkadot-native-audit-dossier.md), [99-scorecard](./polkadot-native-99-scorecard.md), [verification-signoff](./polkadot-native-verification-signoff.md), [external-deps-audit](./polkadot-native-external-deps-audit.md), [evidence-ledger](./polkadot-native-evidence-ledger.json), [audit-scope](./polkadot-native-audit-scope.json), [signer-spike-report](./product-account-signer-spike-report.md)

---

## Verdict

The Polkadot research is **largely sound and honestly hedged**. It consistently under-claims ("99% ready: NO", "58–72% native", explicit "must not say" list), which is the correct failure direction for due diligence. The **conclusions are trustworthy**; the **quantitative scoring oversells rigour it does not have**, and **one headline external blocker (EXT-001) is not reproducible in the installed tree**.

This review changes **no conclusion** — ChopDot is not fully native, host-runtime gates remain unproven, the EVM closeout is still on the critical path. It corrects **labels and score integrity** only.

---

## 1. Claims verified TRUE (primary-source checked)

| Claim | How verified | Result |
| --- | --- | --- |
| `@parity/product-sdk-*` host 0.10.1 / signer 0.8.0 / statement-store 0.4.7 / tx / crypto / cloud-storage installed | `package.json` L48-53, lockfile | ✅ real + installed |
| `paritytech/product-sdk` is a real TS monorepo with exactly that package set; cloud-storage "backed by the Polkadot Bulletin Chain" | GitHub | ✅ corroborates dossier archive mapping |
| `@novasamatech/host-api@0.8.9` + `host-api-wrapper@0.8.9` | lockfile L2631–2651 | ✅ real + installed |
| Statement Store + allowance/retention primitives | `sp_statement_store` in `polkadot-sdk` (`StatementAllowance`, `get_allowance`, retention) | ✅ real concept, not invented |
| `paritytech/subxt-assets`, `truapi`, `triangle-js-sdks` | GitHub | ✅ all real repos (subxt-assets created 2026-02-11, Paseo Asset Hub + Revive) |
| ChopDot adapters `ProductAccountDotSessionSignerAdapter`, `StatementStoreSessionAdapter`, `ProductSdkCloudStorageReceiptAdapter`, `likelyInsideProductHost` | `src/chopdot-dot/polkadotSession.ts` (L797, L1261, L1465, L881) | ✅ exist |
| Hybrid EVM closeout `canCloseoutOnPolkadotHub`, `VITE_SIMULATE_PVM_CLOSEOUT` | `src/services/wallet/capabilities.ts` (L15, L220) | ✅ exist |
| Validator forbids `confidence: proven` without `runtime_proof`/`chopdot_test`; warns on staleness | `scripts/validate-chopdot-dot-native-map.mjs` L201, L197 | ✅ genuinely enforced |

Note: the earlier hypothesis that names like `truapi`/`triangle-js-sdks` were fabricated was **disproven** — they are real Parity repos.

---

## 2. Issues found (correction targets)

### ISSUE-1 — Two "below-99%" scores do not reconcile with the ledger (false precision)

`polkadot-native-99-scorecard.md`:

- `repo_audit = 38.2 / 42.0 = 0.91` — but Tier A `coverage_weight`s in the evidence ledger **alone** sum to **71** (10+9+9+8+8+7+6+5+4+5), before Tier B/C. The `42.0` denominator cannot be the weighted in-scope total it claims.
- `capability_evidence = 16 / 18 = 0.89` — but the dossier's capability SSOT matrix lists **10** capabilities, not 18.

`runtime_gate = 2/6 = 0.33` and `risk = 10/10 = 1.00` **are** consistent and traceable.

**Impact:** the two decimals imply data-driven rigour that the ledger does not support; they read as reverse-engineered to land near 0.9.
**Correction:** annotate both as unreconciled estimates (qualitative "below target / partial"), keep the two valid scores, leave overall verdict unchanged.

### ISSUE-2 — EXT-001 `isResponse` blocker not reproducible in the installed tree

`product-account-signer-spike-report.md` and `external-deps-audit.md` state `@novasamatech/host-api-wrapper` imports `isResponse` from `@polkadot-api/json-rpc-provider`, which the installed version doesn't export.

Re-check of installed `node_modules`:
- No occurrence of `isResponse` anywhere in `@novasamatech/host-api-wrapper@0.8.9`.
- No `isResponse` export in installed `@polkadot-api/json-rpc-provider`.

**Impact:** EXT-001 is the named driver of the IdentityGate failure narrative; as stated it is stale or version-specific.
**Correction:** mark EXT-001 `confidence: unknown`, `verification_status: needs_recheck`; keep the *gate* (host signing is still genuinely unproven) but stop asserting the specific `isResponse` mismatch until reproduced.

### ISSUE-3 — EXT-001 import edge imprecise

Actual chain: `@novasamatech/host-api-wrapper@0.8.9` → `@polkadot-api/json-rpc-provider-proxy@0.4.0` → `@polkadot-api/json-rpc-provider@0.2.0` (lockfile L2651, L4401-4418). The doc states a **direct** wrapper → `json-rpc-provider` edge.
**Correction:** documented here; fix the chain text on next external-deps-audit edit.

### ISSUE-4 — `audit_depth: line_review` overstated for `declared` upstream repos

PAR-002 (`truapi`), PAR-003 (`triangle-js-sdks`), PAR-005 (`polkadot-bulletin-chain`), PAR-006 (`playground-app-template`) carry `confidence: declared` (README/package-table basis) yet `audit_depth: line_review`, with `module_refs` that are plausible **path guesses**. "Line review" implies reading source.
**Correction:** downgrade these to `audit_depth: readme` to match the honest `declared` basis. (PAR-001 `product-sdk` downgraded `line_review → module_map`: ChopDot adapter seams are real module-level evidence, but upstream was not line-read.)

### ISSUE-5 — Low-weight Tier B/C repo names unverified

Some scope slugs look inconsistent with known org layout: `paritytech/polkadot-apps` (apps live at `polkadot-js/apps`), `paritytech/xcm` as a standalone repo (XCM lives inside `polkadot-sdk`), `paritytech/web3-storage`. These carry low `coverage_weight`, so impact is small.
**Correction:** PAR-012 (`web3-storage`) `verification_status → unverified`; remaining Tier B/C slugs flagged here for spot-check on next scope refresh. The `parity_org_total_repos: 698` figure is unverified and not load-bearing.

---

## 3. What this review does NOT change

- "Overall 99% ready: NO" — stands.
- Native coverage 58–72% band — stands (directionally supported by real code: lab-only Statement Store transport, `likelyInsideProductHost` fallback, runtime-critical `pvmCloseout.ts`).
- The six evidence gates and the hard-blocker list — stand. Host signer proof, host transport proof, live Bulletin round-trip, and hybrid-EVM removal are all still genuinely open.
- The non-custodial native-vs-external boundary — stands.

---

## 4. Applied corrections (this session)

| Target | Change |
| --- | --- |
| `polkadot-native-evidence-ledger.json` | EXT-001 → `unknown`/`needs_recheck`, `audit_depth: readme`, notes updated; PAR-001 `line_review → module_map`; PAR-002/003/005/006 `line_review → readme`; PAR-012 `verification_status → unverified` |
| `polkadot-native-99-scorecard.md` | Added "Score Integrity Correction" section; annotated `repo_audit` and `capability_evidence` as unreconciled; added EXT-001 recheck note |
| `polkadot-native-cursor-handoff.md` | Added this review to the canonical read order |

Validator (`scripts/validate-chopdot-dot-native-map.mjs`) constraints respected: `audit_depth`/`confidence` stay within allowed sets, all required fields retained, `last_verified_at` kept fresh.

---

## 5. Recommended next checks (audit track)

1. Re-run the host-container proof inside Polkadot Desktop/Mobile and record under `artifacts/polkadot-native/`; this is what would move runtime gates off 2/6.
2. Reproduce or formally retire EXT-001 against the pinned host-container build.
3. Recompute `repo_audit`/`capability_evidence` from actual ledger weights, or keep them qualitative.
4. Spot-verify Tier B/C slugs on the next scope freeze.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-16 | Independent verification review; 5 issues found; label + score-integrity corrections applied; no conclusion changed |
