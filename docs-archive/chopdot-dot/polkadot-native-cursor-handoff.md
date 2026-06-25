# Polkadot Native 99% Audit — Cursor Handoff (START HERE)

Status: `handoff_active`  
**Completed:** 2026-06-16 (session through ~13:30 UTC+2)  
**Completed in:** Cursor (agent chat on ChopDot repo)  
**Exercise type:** migration-critical due diligence and comparison — **not** product implementation  
**Repo:** `/Users/devinsonpena/ChopDot`  
**Cursor transcript (reasoning trail):** `.cursor/projects/Users-devinsonpena-ChopDot/agent-transcripts/25a7b267-92a3-4cbf-86ee-e90157b97e87.jsonl`  
**Strategy history (wedge, user research, Spend Cards):** [product-evolution-history.md](./product-evolution-history.md)  
**Capture Layer (Spend Cards, pay links, QR):** [cursor-brainstorm-jun-16-2026/README.md](./cursor-brainstorm-jun-16-2026/README.md)  
**Capture implementation audit:** [cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md](./cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md)

---

## For Codex / any new agent

**Read this file first.** It is the single resume point for the Polkadot-native 99% audit programme.

Then follow the [read order](#canonical-read-order) below. Treat linked artefacts as source of truth over chat memory.

**Do not change app code** unless the operator explicitly asks to leave audit-only scope. This programme is about knowing and comparing Parity/Polkadot tech to ChopDot — not shipping native features.

### Hydration prompt (paste into Codex)

```text
Resume ChopDot Polkadot-native 99% audit from:
docs/chopdot-dot/polkadot-native-cursor-handoff.md

Read that file fully, then polkadot-native-99-scorecard.md and
polkadot-native-audit-dossier.md. Stay audit/docs-only unless I ask for code.
Summarise: what is proven, what is not, open blockers, and the single best next step.
```

---

## What this exercise was

Answer, with evidence:

1. What can Parity/Polkadot open-source tech do for ChopDot (identity, transport, archive, chain evidence)?
2. What cannot it honestly do (SaaS ops, delivery, fiat, full org repo line-by-line review)?
3. How does ChopDot’s current stack compare to a Polkadot-native target?
4. Can we claim **99% confidence** on **migration-critical scope** — and what would still be missing?

**Out of scope:** implementing native production paths, fixing e2e flakes in product code, or claiming “fully native today.”

---

## What we did (2026-06-16)

| Workstream | Output |
| --- | --- |
| Repo inventory | 698 `paritytech` repos noted; **46 frozen in-scope** in `polkadot-native-audit-scope.json` |
| Source audits | Tier A blocker repos audited with `module_refs`; evidence in `polkadot-native-evidence-ledger.json` (19 entries) |
| ChopDot comparison | `polkadot-native-build-map.md`, `polkadot-native-replacement-matrix.json`, `polkadot-native-audit-dossier.md` |
| External blockers | `polkadot-native-external-deps-audit.md` (EXT-001..005: json-rpc-provider, host-api, wallets, delivery) |
| Adversarial pass | `polkadot-native-verification-signoff.md` |
| Risk + scoring | `polkadot-native-risk-register.md`, `polkadot-native-99-scorecard.md` |
| Runtime gates | `polkadot-native-runtime-proof-report.md` — 6 gates defined; **2/6 lab pass** |
| Validator | `scripts/validate-chopdot-dot-native-map.mjs` — matrix + ledger rigour checks |
| Lab verification (read-only) | Validator PASS; native unit tests 39/39; lab e2e 5/5; native-session e2e flaky under parallel load |

---

## What we concluded

### Bottom line

**Overall 99% ready: NO**

| Dimension | Score | Pass 99%? |
| --- | --- | --- |
| Repo audit (weighted in-scope) | 0.91 | No |
| Capability evidence | 0.89 | No |
| Runtime gates (host) | 0.33 | No |
| Risk register | 1.00 | Yes |

### Honest native coverage (migration-critical)

**58%–72%** — not 100%. External edge (invite delivery, fiat, ops, long-retention redundancy) is composable, not kernel truth.

### What we can say today

> ChopDot completed a migration-critical Polkadot-native due diligence programme with frozen scope, tiered source audits, external dependency forensics, adversarial verification, and a scored risk register. Host-runtime proof gates and hybrid removal remain open; fully native production readiness is **not** claimed.

### What we must not say

- All 698 repos reviewed line-by-line
- ChopDot is fully Polkadot-native in production today
- Zero migration risk
- All capabilities are host-production-proven

---

## Open blockers (next real work)

| ID | Blocker | Gate / area |
| --- | --- | --- |
| EXT-001 | `@polkadot-api/json-rpc-provider` / host-api-wrapper mismatch | IdentityGate |
| — | Host Statement Store transport (lab middleware only today) | TransportGate |
| — | Live Bulletin / cloud-storage round-trip | ArchiveGate |
| — | EVM closeout still on runtime-critical path (`pvmCloseout.ts`, `capabilities.ts`) | HybridRemovalGate |
| — | Tier B `module_map` audits incomplete | Repo audit score |
| — | Host-container proof script not executed in Polkadot Desktop/Mobile | Runtime gates |

---

## Lab run notes (2026-06-16)

Commands used as **evidence checks** (not implementation):

```bash
node scripts/validate-chopdot-dot-native-map.mjs
npx vitest run src/chopdot-dot/polkadotSession.test.ts src/chopdot-dot/commitmentKernel.test.ts src/chopdot-dot/testTokenRail.test.ts src/chopdot-dot/simulationAgents.test.ts
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts tests/e2e/chopdot-dot-native-session.spec.ts --project=chromium
```

| Check | Result |
| --- | --- |
| Native map validator | PASS |
| Native unit tests | PASS (39/39) |
| `chopdot-dot-lab.spec.ts` | PASS (5/5) |
| `chopdot-dot-native-session.spec.ts` | **Flaky** — fails under parallel workers (sync timeout on cold SDK + access seeding); passes with `--workers=1` |

### Code edits policy (important)

During validation, a brief **product-code fix** was attempted (`ChapterHome.tsx`, native-session e2e). The operator clarified the exercise is **audit-only**. Those app/test edits were **reverted**. Do not re-apply without explicit approval.

---

## Canonical read order

Read in this order after this handoff file:

| # | File | Why |
| --- | --- | --- |
| 1 | [polkadot-native-99-scorecard.md](./polkadot-native-99-scorecard.md) | Scores and promotion rule |
| 2 | [polkadot-native-audit-dossier.md](./polkadot-native-audit-dossier.md) | Main audit SSOT |
| 3 | [polkadot-native-verification-signoff.md](./polkadot-native-verification-signoff.md) | Adversarial falsification results |
| 4 | [polkadot-native-audit-scope.json](./polkadot-native-audit-scope.json) | Frozen 46-repo scope + scoring model |
| 5 | [polkadot-native-evidence-ledger.json](./polkadot-native-evidence-ledger.json) | Per-repo/capability evidence |
| 6 | [polkadot-native-external-deps-audit.md](./polkadot-native-external-deps-audit.md) | Non-Parity blockers |
| 7 | [polkadot-native-risk-register.md](./polkadot-native-risk-register.md) | Scored risks |
| 8 | [polkadot-native-runtime-proof-report.md](./polkadot-native-runtime-proof-report.md) | Six host gates |
| 9 | [polkadot-native-build-map.md](./polkadot-native-build-map.md) | Capability → Polkadot map |
| 10 | [polkadot-native-replacement-matrix.json](./polkadot-native-replacement-matrix.json) | Machine-readable replacements |
| 11 | [polkadot-native-audit-review-2026-06-16.md](./polkadot-native-audit-review-2026-06-16.md) | **Independent verification review** — what checks out, label/score corrections applied |
| 12 | [path-to-fully-native.md](./path-to-fully-native.md) | **Can we make it fully native?** — why/should-we + maturity banner, gated roadmap (G0–G8), kernel decision, `.dot`/`browse.paseo.li` shipping, cost/testing/ops, DB flow maps, UX, change deltas |

Product/spike context (secondary):

- [product-account-signer-spike-report.md](./product-account-signer-spike-report.md)
- [polkadot-adapter-map.md](./polkadot-adapter-map.md)
- [README.md](./README.md) — ChopDot.dot product packet index

---

## Where we left off

**Programme status:** documentation and evidence packet **complete** for migration-critical scope. **Promotion blocked** until host gates pass.

**Best next step (audit track):** run the host-container proof script in `polkadot-native-runtime-proof-report.md` inside Polkadot Desktop/Mobile; record artifacts under `artifacts/polkadot-native/host-runtime-proof-YYYY-MM-DD.md` (create on first real host run).

**Best next step (do not do silently):** product implementation (signer fix, hybrid EVM removal, e2e stabilisation) — only when operator moves out of audit-only mode.

---

## ChopDot anchors (for comparison)

| Area | Current location |
| --- | --- |
| Native session spike | `src/chopdot-dot/polkadotSession.ts` |
| Commitment kernel | `src/chopdot-dot/commitmentKernel.ts` |
| EVM hybrid closeout | `src/services/closeout/pvmCloseout.ts` |
| Wallet capabilities split | `src/services/wallet/capabilities.ts` |
| Lab Statement Store (dev only) | `vite.config.ts` middleware `__chopdot_dot_statement_store` |
| Native UI spike | `src/components/screens/ChapterHome.tsx` (`?chopdot-dot-native=1`) |

---

## Maintenance

When resuming in a new session:

1. Update **Completed** timestamp at top of this file.
2. Re-run `node scripts/validate-chopdot-dot-native-map.mjs`.
3. Update `polkadot-native-99-scorecard.md` and `polkadot-native-runtime-proof-report.md` if new evidence exists.
4. Keep this handoff as the **single entry file** for agents.
