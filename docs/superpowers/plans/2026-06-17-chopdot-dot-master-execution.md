# ChopDot.dot — Master Phased Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the **group commitment platform** — full Catch → Management → Payout → History loop across chapter modes, capture (Spend Cards + links + Telegram), hybrid main app, and native Polkadot truth — with Programme A (Playground `.dot` listing) as the **first shippable slice**, not the whole product definition.

**Architecture:** One product primitive (group commitment), two kernels (capture `chapterEngine` for wedge + dot `commitmentKernel` for native proof, converging via Option B), dual-track delivery (hybrid mainstream + native trust lane). Three execution programmes (A / CAPTURE / B) run in parallel with separate finish lines; see [§ PRODUCT END STATE](#product-end-state--what-the-user-gets) for the full outcome, [§ STATUS BOARD](#status-board--single-checkpoint) for progress.

**Tech Stack:** React/Vite, Playwright, `@parity/polkadot-app-deploy`, `@parity/product-sdk-*`, Supabase (hybrid Track 1 only), Vitest.

**Programme tag for `.knowns/tasks`:** `PROGRAMME=A|B|CAPTURE` — declare at session start.

> **Cross-tool resume (Codex, Claude Code, etc.):** Paste the block in [§ CROSS-TOOL RESUME](#cross-tool-resume-codex--any-agent) — works outside Cursor; no `.cursor/rules` required.

> **Single checkpoint:** Progress lives in **[§ STATUS BOARD](#status-board--single-checkpoint)** below. **Full product outcome** (what the user gets when asked “what are we building?”) lives in **[§ PRODUCT END STATE](#product-end-state--what-the-user-gets)** — read both; do not answer from Programme A finish lines alone.

**Companion docs (read before any phase):**
- [docs/chopdot-dot/README.md](../../chopdot-dot/README.md) — primitive, five modes, shared loop
- [docs/chopdot-dot/mode-map.md](../../chopdot-dot/mode-map.md) — per-mode Catch/Show/Move/End
- [path-to-fully-native.md](../../chopdot-dot/path-to-fully-native.md) v5 — primitive §0, gates §6, Playground §18
- [native-execution-playbook.md](../../chopdot-dot/native-execution-playbook.md) — skill routing, checklists
- [capture-native-lane-map.md](../../chopdot-dot/capture-native-lane-map.md) — **hybrid Capture vs Host-first native** (do not conflate programmes)
- [summit-playground-operator-reference-2026-06-18.md](../../chopdot-dot/summit-playground-operator-reference-2026-06-18.md) — **§0 narrative vs operator facts** (Web3 Summit Berlin)
- [capture-layer-build-plan.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) — P1a → P2 lite → P3
- [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md) — MCP phase matrix + `mcp/*.json` templates
- [cursor-brainstorm-jun-16-2026/README.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/README.md) — capture packet index
- `.cursor/rules/chopdot-dot-programme.mdc` — auto routing + FACTS communication style (Cursor only; rules summarized in this plan)

---

## CROSS-TOOL RESUME (Codex / any agent)

**Repo:** `/Users/devinsonpena/ChopDot`  
**Use when:** Starting a new session in Codex, Claude Code, or any tool that does not load Cursor rules.

### Paste this hydration prompt

```text
Resume ChopDot.dot from the master execution plan:
docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md

Read in order:
1. § PRODUCT END STATE — full vision (do not narrow to Playground demo only)
2. § STATUS BOARD — where we left off (checkboxes + capabilities table)
3. § COVERAGE REGISTRY — artefact index
4. docs/chopdot-dot/capture-native-lane-map.md — hybrid vs Host-first routing
5. docs/chopdot-dot/summit-playground-operator-reference-2026-06-18.md §0 — summit narrative vs operator facts
6. Phase tasks for the programme I name below

Also read: AGENTS.md, docs/chopdot-dot/README.md, docs/chopdot-dot/native-execution-playbook.md

Programme for this session: <A | CAPTURE | B> — default A unless I say otherwise.
Do not reprioritise from summit keynote or social sentiment alone — see §0 honesty flags.

Summarise: FACTS (verified in repo), what's checked vs open on STATUS BOARD,
critical path next task, and ask before on-chain deploy.

Verification: npx tsc --noEmit; npm run validate:chopdot-coverage;
programme-specific commands from master plan Quick verify.
```

### Where we left off (update STATUS BOARD when this changes)

| Item | State as of 2026-06-19 |
| --- | --- |
| Implementation | **In progress** — Programme A dot-host + Capture C1–C17 shipped in repo |
| Critical path | **A4/A8 parked externally** until Polkadot app release; continue CAPTURE hardening + Programme B readiness |
| Programme A | **4 / 8** criteria; A5 ✅ local; on-chain at `chopdotws01.dot` |
| Capture | **C1–C17 ✅** — hybrid guest/localStorage + E2E; not on `.dot` |
| Native B | **1 / 7** runtime gates; only UXGate is lab-passing; real host Identity/Transport/Archive/Proof/Payout/HybridRemoval still unproven |
| Summit | Web3 Summit Berlin (Jun 18–19) — vision validated; **no infra green from keynotes alone** (see operator ref §0) |
| External | dotns#190 open; `--publish` not run; Mobile/host app release blocks live `.dot` proof |

### Programme-specific deep docs

| Programme | After master plan, read |
| --- | --- |
| **A** — Playground ship | `path-to-fully-native.md` §18; `summit-playground-operator-reference` §0 + §G; Phase 1 tasks |
| **CAPTURE** — Spend Cards | `capture-native-lane-map.md` + `capture-layer-build-plan.md` |
| **B** — Native truth | `capture-native-lane-map.md` + `polkadot-native-cursor-handoff.md` + `polkadot-native-runtime-proof-report.md`; Host tx → [`paritytech/festival`](https://github.com/paritytech/festival) patterns |

### What Codex will not get automatically

| Cursor-only | Portable substitute |
| --- | --- |
| `.cursor/rules/chopdot-dot-programme.mdc` | Master plan § COMPLETENESS RITUALS + PRODUCT END STATE |
| **Polkadot docs MCP** (`polkadot-docs`) | [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md) + `mcp/polkadot-docs.json` |
| Cursor subagents / plugins | Codex skills if installed; else read playbook §4–5 |
| This chat transcript | Master plan + STATUS BOARD + git log |

### Polkadot docs MCP (Cursor)

Full phase matrix: [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md)

Official remote MCP from [Polkadot AI Resources — Connect via MCP](https://docs.polkadot.com/ai-resources/#connect-via-mcp):

| Phase | Enable |
| --- | --- |
| **A — Playground** (now) | `polkadot-docs` + `playwright-extension` ✅ |
| **Capture P1** (C6+) | + `supabase` |
| **B — Native / deploy verify** | + `polkadot-onchain` (optional) |

```json
"polkadot-docs": { "url": "https://docs-mcp.polkadot.com" }
```

- **Templates:** `docs/chopdot-dot/mcp/` — `chopdot-dot-phase-a.json`, `chopdot-dot-full.example.json`
- **Global config:** `~/.cursor/mcp.json`
- **After install:** Reload Cursor window
- **Scope:** Polkadot **developer documentation** — not on-chain (use `polkadot-onchain` or `pad` CLI)

### After each Codex session

1. Update **§ STATUS BOARD** checkboxes and "Last verified" date.
2. Add changelog line in master plan.
3. Commit docs if material progress (operator choice).

---

## PRODUCT END STATE — what the user gets

**Read this section** when the operator asks: expected outcome, vision, “what can the app do”, summit story, or “everything we talked about”. Programme A is the **shop window**; this section is the **whole house**.

### North star (one sentence)

ChopDot is the app groups use to **capture shared money moments, see who acts next, move money on external rails, and close with a trusted record** — without custody — across trips, circles, emergencies, community funds, chat, links, and Polkadot.

### Product spine (four pillars)

| Pillar | User feels |
| --- | --- |
| **Catch** | Join, invite, expense at pay moment, contributions, claims |
| **Management** | Balances, blockers, **next actor**, roles |
| **Payout** | Twint/bank/wallet handoff; claim paid or verified receipt → **cleared** |
| **History** | Closeout receipt; optional chain evidence; redaction where needed |

**Invariant everywhere:** `claimed ≠ received/cleared ≠ approved/released ≠ closed`; strong recipient+amount proof can clear a payment leg, weak evidence cannot — [safety-boundaries.md](../../chopdot-dot/safety-boundaries.md)

### Five chapter modes (+ general shared expense)

| Mode | Job | Spec | Target after implementation |
| --- | --- | --- | --- |
| `shared_expense` | Trips, dinners, flatshare splits | mode-map | Full app + capture wedge |
| `event_deposit` | Event/session deposits | mode-map | General commitment flow |
| `savings_circle` | Recurring rounds, payout order | [savings-circle-spec.md](../../chopdot-dot/savings-circle-spec.md) | App + **Playground hero** on `.dot` |
| `emergency_pot` | Urgent help, dignity, privacy | [emergency-pot-spec.md](../../chopdot-dot/emergency-pot-spec.md) | App + dot lab; redacted receipts |
| `community_fund` | Approvals, releases, treasurer handoff | [community-fund-spec.md](../../chopdot-dot/community-fund-spec.md) | App + dot lab; non-custodial fund coordination |

### Three surfaces (same engine)

| Surface | Entry | Role |
| --- | --- | --- |
| **General group commitment** | Pots, `ChapterHome` | Default product — any chapter |
| **Savings circle** | Dot lab + pots | Public demo + real mode |
| **Spend Cards** | Pay moment, ≤1 step | Capture wedge — [spend-cards-spec.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/spend-cards-spec.md) |

### Distribution channels (how people reach it)

| Channel | Delivers | Plan phase |
| --- | --- | --- |
| Main ChopDot app (hybrid) | Full pots, wallets, settle, all modes | Track 1 — live + capture |
| Polkadot host / `.dot` | Listable app, native-mode demo | Programme A + B |
| Spend / pay / confirm **links** | No-install handoff | Capture P1b — [group-pay-links-qr-spec.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/group-pay-links-qr-spec.md) |
| **QR** share at table | Single-use capture | Capture P1b |
| **Telegram bot** | Capture in group chat | P1b convergence — `telegramBot.ts` |
| **Wallet pass** launcher | Tap → `/spend?t=` | Capture P2 lite |
| Settlement **webhook** (L2) | Auto `markLegPaid` when partner matches | Capture P2 lite |

### What “implementation complete” means (by layer)

| Layer | User-visible outcome | Tracked in STATUS BOARD |
| --- | --- | --- |
| **L1 — Listable** | Real app on `.dot`, Playground listing, honest copy | Programme A |
| **L2 — Capture product** | Spend Cards, links, QR, Telegram sync, chapter SSOT | Capture C1–C14 |
| **L3 — Capture acceleration** | Wallet pass + one webhook adapter | Capture C15–C17 (P2 lite) |
| **L4 — Native trust** | Multi-device signed truth, encryption, archive; ported to capture kernel | Programme B |
| **L5 — Brand** | `chopdot.dot` when PoP granted | Phase 5 |

### Explicitly later (researched, not this tranche’s “done” bar)

| Item | Why deferred | Doc |
| --- | --- | --- |
| Real Visa/MC with balance (Model B/C) | Partner issuer + KYC on programme side | P3 — [b2b-card-issuer-stacks-investigation.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/b2b-card-issuer-stacks-investigation.md) |
| Custody, escrow, auto-release on-chain | Non-custody product law | [safety-boundaries.md](../../chopdot-dot/safety-boundaries.md) |
| Every user on native only | Dual-track: hybrid stays for friction-down | path §1A |

### Anti-narrowing rule (agents)

Do **not** describe end state as “savings circle demo only”. Programme A is **one finish line** inside this section.

---

## STATUS BOARD — single checkpoint

**Update rule:** When a task or gate completes, flip its checkbox here first, then sync supporting docs (path §21, `polkadot-native-runtime-proof-report.md`, path §23) only if the row changed materially.

**Last verified:** 2026-06-23 (10x capture pass: type-check, focused capture/domain unit tests, and desktop/mobile browser flows for receipt/check-out capture, right-rail choice, no-app `/pay`, and `/confirm` passed. 2026-06-22 local product/native packaging gates remain current for full build/regression/readiness unless rerun. Static deploy preflight remains `setup_required` at signer session; full host app features still gated on Polkadot host availability.)

### Product capabilities (vision vs today)

Use this when explaining scope — not only programme checkboxes.

| Capability | Today | After full plan |
| --- | --- | --- |
| Shared expense / trip chapters | Local pass — `chapterEngine`, pots, receipt/pay-moment capture, no-app pay/confirm links | + real friend-pilot promotion and native port |
| Savings circle | Local native-session multi-device flow | + live on `.dot` (A) |
| Emergency pot | Local native-session multi-device flow + redaction checks | + live host adapter proof |
| Community fund | Local native-session multi-device flow + approval controls | + live host adapter proof |
| Spend Cards | **Yes (local/guest P1a–P2 + 10x capture pass)** — in-app; hybrid SSOT | On `.dot` when listed (A) |
| Pay / confirm links + QR | **Yes (P1b + no-app one-action pay link)** — E2E green | Same + provider-backed auth path where needed |
| Telegram ↔ app same chapter | **Yes (C14)** — `ChapterStoreAdapter` | Production bot hosting |
| Wallet pass + webhook L2 | **Yes (P2 lite C15–C17)** — guest E2E | Firma partner contract for prod webhook |
| Native multi-device truth | 1/7 gates, lab middleware | Programme B 7/7 + port |
| Real payment card programme | Research only | P3 partner track |

### Overall scorecard

| Programme | Phase | Progress | Finish line |
| --- | --- | --- | --- |
| **A — Playground ship** | 1 → 1b | **4 / 7** criteria + **4 / 5** Phase 1 tasks | All §18.1 criteria ✅ + `--publish` |
| **CAPTURE — Spend Cards** | 2 → 4 → P2 lite | **9 / 9** P1a + **5 / 5** P1b + **3 / 3** P2 lite | C1–C17 + capture E2E |
| **B — Native truth** | 3 | **1 / 7** runtime gates · G0–G8 mostly unproven | Runtime report **7/7 PASS** in real host + adapter port |
| **Identity** | 5 | Blocked on dotns#190 | `chopdot.dot` on Talis + redeploy |
| **Doc / agent lock** | 0 | **5 / 5** ✅ | This plan + playbook + rules |

**Critical path now:** split Programme A into **static `.dot` publish potentially unblocked** and **full Polkadot host app features still gated**. Do one controlled `polkadot-app-deploy` Paseo attempt with a funded signer/domain; do not count host-native sign-in, Statement Store, Bulletin receipts, or Product SDK tx as live until they pass their own gates. Continue ChopDot work through CAPTURE hardening and Programme **B** G1+G4 readiness. Capture C1–C17 **complete** for hybrid demo — do not block on native gates.

### Current Execution Board — use this first

This is the short board for moving faster. If it conflicts with deeper sections, update this row and the deeper row in the same pass.

| Lane | Current state | Next action | Do not confuse with |
| --- | --- | --- | --- |
| Live `.dot` / publish | `local-preflight-pass-setup-required` | Login to `polkadot-app-deploy`, rerun strict preflight, then run one controlled Paseo static publish with funded signer/domain; keep host app features separate | Full host-native runtime |
| Friend-pilot product readiness | `near-9/10, real results pending` | Run the friend-pilot ledger with real people/devices | Agent simulation |
| W3S native adoption | `pass-local` | Controlled static `.dot` deploy setup + W3SPay admin/config review; Coinage host-sim behavior gates are local pass | Copying W3SPay/T3RMINAL UI |
| Programme B host gates | `1/7 runtime gates` | G1 distinct Product Account signers and G4 Statement Store adapter | Local fallback passing |
| Capture / Spend Cards | `local 10x pass` | Real friend-pilot review of receipt-first capture and one-action links; keep green while native work proceeds | Native truth |

**Active short board:** [w3s-native-adoption-checklist-2026-06-21.md](../../chopdot-dot/w3s-native-adoption-checklist-2026-06-21.md).

**Speed rule:** every implementation pass must produce one working adapter seam, browser-visible product improvement, host-sim proof, validator, or real pilot result. Research-only work does not count as progress unless it changes the board.

### Host-Ready Freeze — done before `.dot` opens

**Purpose:** Finish everything locally controllable so live `.dot` availability becomes the only remaining launch blocker.

**Operating checklist:** [host-ready-99-checklist-2026-06-20.md](../../chopdot-dot/host-ready-99-checklist-2026-06-20.md). Use this as the daily board until `.dot` / Polkadot app access opens.

**Next iteration product goal:** [2026-06-20-chopdot-full-product-test-completion-goal.md](./2026-06-20-chopdot-full-product-test-completion-goal.md). Use this when the target is completing and testing the whole ChopDot loop across native money modes, Spend Cards, links, QR/share, Telegram-style capture, wallet pass, webhook-lite, and receipts before live `.dot` availability.

**Mode-specific native friend goal:** [2026-06-20-chopdot-native-friends-iteration.md](./2026-06-20-chopdot-native-friends-iteration.md). This is now a completed local subset of the full product test goal.

| Area | Done when | Evidence |
| --- | --- | --- |
| Product clarity | Savings circle, emergency pot, community fund, and Spend Cards show next actor, blocker, claim, confirmation, closeout, and receipt without protocol language | Mode Playwright specs + browser review |
| Savings circle reference flow | Leo/Nina/Omar/Mina complete a full round from separate sessions, including delay note, payout, release, confirmation, closeout | `chopdot-dot-native-session.spec.ts` + receipt preview |
| Emergency fund reference flow | Friends can join an emergency fund, record contributions, approve release readiness, confirm release, and close with a redacted receipt | `chopdot-dot-native-session.spec.ts` + `commitmentKernel.test.ts` + `chopdot-dot-lab.spec.ts` |
| Community pot reference flow | Friends can join a community pot, record contributions, require approvals, record release, confirm receipt, and close with handoff notes | `chopdot-dot-native-session.spec.ts` + `commitmentKernel.test.ts` + `chopdot-dot-lab.spec.ts` |
| Capture wedge | Spend Card, pay/confirm links, QR/share, Telegram convergence, wallet pass, and webhook claim path remain green | Capture e2e suite |
| Strict host gates | Product Account, Statement Store, Bulletin/archive, Asset Hub evidence, and native closeout each have local fallback plus host-required mode that fails honestly without host | Focused unit tests + runtime proof report |
| Agent wallet trial | Disposable Leo/Nina/Omar/Mina-style wallets can be funded with public testnet PAS, mapped to profiles, and used to reenact group expenses, savings circles, emergency pots, and community funds from separate device contexts | `trial:agent-wallets` run sheet + `trial:agent-wallets:pas` tx report + payment-clearance tests + screenshots/tx refs |
| Launch packet | A4/A8 checklist, host verification commands, claim-safe copy, and blocked-by-Polkadot-app list are up to date | Master plan + runtime proof report |

**Not done if:** a host-required test passes through local fallback; a user sees Product SDK / Statement Store / Bulletin language in normal UI; weak chain/webhook evidence clears a payment; or strong received evidence still forces unnecessary user ceremony.

**Honesty flags (do not overclaim):**

| Claim | Allowed today? |
| --- | --- |
| Playground / summit demo ready | **Partial** — on-chain at `chopdotws01.dot`; host still **can't be reached** (§G workarounds) |
| Summit keynote / stage demo = infra green | **No** — operator ref §0; gateway + Host fetch block A4 |
| Spend Cards live | **Yes (local/guest P1a–P2)** — capture E2E suite green; **not** on live `.dot` |
| Fully native | **No** — 1/7 gates, lab middleware, EVM on hybrid path |
| Savings circle in dev/lab | **Yes** — `chopdot-dot-lab.spec.ts` + A5 local preview |
| Deploy pipeline proven | **Yes** — Kubo deploy 2026-06-18 + infra spike 2026-06-17 |
| DOT price / summit hype as priority signal | **No** — do not reprioritise Capture or B from conference sentiment |

---

### Programme A — Playground ship (path §18.1)

**Done = all rows checked.**

| # | Criterion | Status |
| --- | --- | --- |
| A1 | Real React bundle (`dist-dot-host/`), not `dist-dotspike` | ✅ |
| A2 | `build:dot-host` script exists and passes | ✅ |
| A3 | Summit banner + honest copy (Spend Cards = next) | ✅ |
| A4 | Deployed to owned `.dot` — React loads on live URL | ⬜ parked externally until Polkadot app release |
| A5 | 60s demo: contribute → next actor → confirm | ⬜ live · ✅ **local** (`npm run e2e:dot-host-preview`) |
| A6 | `npx tsc --noEmit` green | ✅ |
| A7 | `chopdot-dot-lab.spec.ts` green | ✅ |
| A8 | Registry `--publish` + metadata matches live demo | ⬜ parked externally until Polkadot app release |

**Phase 1 implementation tasks** (detail in [§ Phase 1](#phase-1--programme-a-playground-ship-critical-path)):

| Task | Summary | Status |
| --- | --- | --- |
| 1 | Dot-host build profile (env gates) | ✅ |
| 2 | `build:dot-host` + `dist-dot-host/` | ✅ |
| 3 | Summit banner + default lab entry | ✅ |
| 4 | Deploy real bundle to owned `.dot` | ✅ on-chain (`chopdotws01.dot`, Kubo path) — A4/A5 live verify pending |
| 5 | Programme A verification gate | ✅ |

**Live deploy today:** `https://chopdotws01.dot.li` — **slim redeploy 2026-06-18** (root `bafybeibxwkaks6s2g7eeew4pozjky46etjrcqczuajzz7zt3yjxyqxmjqq`); host still **can't be reached** until gateway serves CID + host fetch path works. **Do not** switch web host to **Paseo Next V2** (causes reload loop — operator ref §G.1). Try §G.1 workarounds (Trusted Providers, Desktop, A5 local). Verify: `npm run verify:dot-host`. Codex recheck 2026-06-19 used the current slim CID and still failed: gateway `504`, host shell rendered "This app can't be reached"; report `artifacts/polkadot-native/dot-deploy-verify-2026-06-19.json`.

---

### CAPTURE — Spend Cards (capture build plan §5)

**P1a done = tasks 1–9 + E2E green. P1b done = tasks 1–5.**

| # | Task | Status |
| --- | --- | --- |
| C1 | Schema `0.2.0` + `migrateChapter` | ✅ |
| C2 | `ChapterStore.ts` | ✅ |
| C3 | `useChapterState.ts` | ✅ |
| C4 | `KernelBridge.ts` | ✅ |
| C5 | Spend session service + hook | ✅ |
| C6 | Capture link tokens + `CaptureLinkService` | ✅ (localStorage + Supabase migration) |
| C7 | `SpendCardScreen` + `CaptureHandoffScreen` | ✅ |
| C8 | `chapterSync.ts` legacy projection | ✅ |
| C9 | `tests/e2e/capture-spend-loop.spec.ts` | ✅ |
| C10 | P1b: `/spend` `/pay` `/confirm` routes | ✅ |
| C11 | P1b: link-only friend flow | ✅ |
| C12 | P1b: QR + share | ✅ |
| C13 | P1b: `spendCards[]` persistence | ✅ |
| C14 | P1b: Telegram ↔ app convergence | ✅ |
| C15 | P2 lite: wallet pass → `/spend?t=` | ✅ |
| C16 | P2 lite: `SettlementAdapterRegistry` + one webhook | ✅ |
| C17 | P2 lite: webhook → auto `markLegPaid` E2E | ✅ |

**P3 (partner issuer):** sales/diligence only — not on this board; see brainstorm README.

### Programme B — Native truth

**Done = runtime gates 7/7 PASS in real host container** ([promotion rule](../../chopdot-dot/polkadot-native-runtime-proof-report.md)).

#### Runtime gates (authoritative: `polkadot-native-runtime-proof-report.md`)

| Gate | Status | Notes |
| --- | --- | --- |
| IdentityGate | ❌ FAIL | Host signing unproven; same address per participant |
| TransportGate | ❌ FAIL (host-sim partial) | Product SDK Statement Store adapter wired and host-sim convergence passes; real host Statement Store still unproven |
| ArchiveGate | ❌ FAIL | Unit seam only; no host round-trip |
| CloseoutProofGate | ❌ FAIL | Unit seam only; no live host proof anchor |
| PayoutEvidenceGate | ❌ FAIL (unit + live testnet partial) | Evidence lifecycle mapped; strict host tx mode blocks fallback; real Paseo Asset Hub PAS transfer replayed as evidence-only; live Product SDK host tx still unproven |
| HybridRemovalGate | ❌ FAIL | `pvmCloseout.ts` EVM still on path |
| UXGate | ✅ PASS (lab) | Native chapter flows pass browser checks without chain jargon |

**Runtime score: `1 / 7`** — only the lab UX gate passes; host-runtime promotion still requires 7/7 PASS in the real Polkadot host container.

#### G0–G8 maturity (detail: path §21)

| Gate | Maturity today | Target |
| --- | --- | --- |
| G0 Funding | unproven | Model chosen + implemented |
| G1 Identity | partial | Host-proven multi-participant |
| G2 Membership | lab-only | Host-proven on capture kernel |
| G3 Privacy | partial | No plaintext on shared store |
| G4 Transport | host-sim partial | `product-sdk-statement-store` adapter wired in `src/`; real host proof open |
| G5 Archive | stub | Bulletin round-trip |
| G6 Payout | stub | Live Asset Hub evidence |
| G7 Hybrid removal | blocked | EVM off native critical path |
| G8 UX | lab | Production native path |
| **Port** | not started | Adapters on `chapterEngine` |

#### Programme B implementation order

| # | Work item | Status |
| --- | --- | --- |
| B1 | G1 — multi-participant host signer | ⬜ |
| B2 | G4 — wire `product-sdk-statement-store` | ✅ host-sim; live host proof open |
| B3 | G0 — funding model | ⬜ |
| B4 | G3 — encryption at rest | ⬜ |
| B5 | G2 — membership / authz | ⬜ |
| B6 | Port adapters → capture kernel | ⬜ |
| B7 | Host-container proof script + artefact | ⬜ |

---

### External dependencies

| Dep | Status | Blocks |
| --- | --- | --- |
| [dotns#190](https://github.com/paritytech/dotns/issues/190) PoP-Full for `chopdot.dot` | Open / triage | Phase 5 branding |
| Polkadot app / Mobile / `pg login` | **Release-gated / floor-only in summit window**; not locally resolvable today | A4 live proof, A8 quest/listing |
| Playground `--publish` | Not run | A8 listing after app/host availability |
| Talis wallet `0xad43…16D2` | Owns `chopdotxx00.dot` | — |

---

### Quick verify (run before updating this board)

```bash
# Always
npx tsc --noEmit

# Programme A (once Task 2 lands)
npm run build:dot-host
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts

# Programme B (when touching evidence)
node scripts/validate-chopdot-dot-native-map.mjs

# Coverage — every spec registered in master plan
node scripts/validate-chopdot-dot-coverage.mjs

# Capture (when P1a exists)
npx playwright test tests/e2e/capture-spend-loop.spec.ts
```

---

### Agent update protocol

1. **Session start** — read this § STATUS BOARD; state programme (A / B / CAPTURE).
2. **Task complete** — flip checkbox here; note date in [Changelog](#changelog).
3. **Gate pass/fail** — update Runtime gates table + sync `polkadot-native-runtime-proof-report.md`.
4. **Deploy** — update A4 + Live deploy row + path §23.
5. **Do not** mark A8 or B7 done without human-approved on-chain action + artefact path.
6. **New spec or brainstorm doc** — add a row to [§ COVERAGE REGISTRY](#coverage-registry) before merge; run `node scripts/validate-chopdot-dot-coverage.mjs`.

---

## COVERAGE REGISTRY

**Purpose:** every artefact maps to a track and a finish line. Nothing lives only in chat or an orphan folder.

**Validate:** `node scripts/validate-chopdot-dot-coverage.mjs` (checks every `docs/chopdot-dot/**/*.md` filename appears here).

### Track legend

| Track | Meaning |
| --- | --- |
| `END` | § PRODUCT END STATE — user-visible outcome |
| `BOARD` | § STATUS BOARD checkbox (A/C/B/OD) |
| `AUDIT` | Programme B evidence; sync runtime-proof-report |
| `P3` | Researched; partner/sales — not implementation tranche |
| `SUPPORT` | Constraints, UX, history — informs build; no solo checkbox |
| `CODE` | Implementation anchor in `src/` |

### Product & mode specs

| Artefact | Track | Mapped to |
| --- | --- | --- |
| [README.md](../../chopdot-dot/README.md) | END | Primitive, five modes, agent resume |
| [mode-map.md](../../chopdot-dot/mode-map.md) | END | Five modes Catch/Show/Move/End |
| [savings-circle-spec.md](../../chopdot-dot/savings-circle-spec.md) | END | Savings circle surface; A5 demo |
| [emergency-pot-spec.md](../../chopdot-dot/emergency-pot-spec.md) | END | Emergency pot mode |
| [community-fund-spec.md](../../chopdot-dot/community-fund-spec.md) | END | Community fund mode |
| [safety-boundaries.md](../../chopdot-dot/safety-boundaries.md) | END | `claimed ≠ confirmed`; non-custody law |
| [ux-brief.md](../../chopdot-dot/ux-brief.md) | SUPPORT | UXGate; no chain jargon |
| [product-evolution-history.md](../../chopdot-dot/product-evolution-history.md) | SUPPORT | Strategy / wedge narrative |

### Capture layer packet (`cursor-brainstorm-jun-16-2026/`)

| Artefact | Track | Mapped to |
| --- | --- | --- |
| [README.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/README.md) | END | Capture packet index; locked decisions |
| [capture-layer-build-plan.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) | BOARD | C1–C17 task definitions |
| [capture-layer-architecture.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-architecture.md) | SUPPORT | KernelBridge, entities |
| [capture-layer-implementation-investigation.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-implementation-investigation.md) | SUPPORT | Repo ground truth |
| [spend-cards-spec.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/spend-cards-spec.md) | END | Spend Cards surface |
| [spend-capture-ladder-2026-06-24.md](../../chopdot-dot/spend-capture-ladder-2026-06-24.md) | END + BOARD | L0-L4 capture ladder; Spend Group vs Pot vs Spend Card; prevents capture drift |
| [group-pay-links-qr-spec.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/group-pay-links-qr-spec.md) | BOARD | C10–C12 |
| [capture-methods-investigation.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-methods-investigation.md) | SUPPORT | Method matrix (18+ options) |
| [spend-card-model-decision-memo.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/spend-card-model-decision-memo.md) | END | Model A locked; P3 = B/C |
| [web3-payment-cards-non-kyc-investigation.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/web3-payment-cards-non-kyc-investigation.md) | P3 | Consumer card reality |
| [b2b-card-issuer-stacks-investigation.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/b2b-card-issuer-stacks-investigation.md) | P3 | Issuer partner diligence |
| [capture-layer/README.md](../../chopdot-dot/capture-layer/README.md) | SUPPORT | Capture layer index |
| [firma-webhook-contract.md](../../chopdot-dot/firma-webhook-contract.md) | BOARD | C16 webhook contract; OD5 partial |

### Native / Polkadot track

| Artefact | Track | Mapped to |
| --- | --- | --- |
| [path-to-fully-native.md](../../chopdot-dot/path-to-fully-native.md) | END + AUDIT | G0–G8; §18 Programme A |
| [capture-native-lane-map.md](../../chopdot-dot/capture-native-lane-map.md) | END + BOARD | Hybrid Capture vs Host-first; G0–G8 routing |
| [polkadot-docs-mcp.json](../../chopdot-dot/polkadot-docs-mcp.json) | SUPPORT | Legacy alias → `mcp/polkadot-docs.json` |
| [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md) | SUPPORT | MCP phase matrix + agent routing |
| `docs/chopdot-dot/mcp/*.json` | SUPPORT | Cursor MCP templates per phase |
| [native-execution-playbook.md](../../chopdot-dot/native-execution-playbook.md) | SUPPORT | Agent routing |
| [polkadot-native-cursor-handoff.md](../../chopdot-dot/polkadot-native-cursor-handoff.md) | AUDIT | Audit programme entry |
| [polkadot-native-runtime-proof-report.md](../../chopdot-dot/polkadot-native-runtime-proof-report.md) | BOARD | Runtime gates 1/7 |
| [host-ready-99-checklist-2026-06-20.md](../../chopdot-dot/host-ready-99-checklist-2026-06-20.md) | BOARD + AUDIT | 99% pre-release execution checklist while live `.dot` is blocked |
| [native-friends-readiness-report-2026-06-20.md](../../chopdot-dot/native-friends-readiness-report-2026-06-20.md) | BOARD + AUDIT | Local friend-use proof across savings circle, emergency fund, and community pot |
| [full-product-readiness-report-2026-06-20.md](../../chopdot-dot/full-product-readiness-report-2026-06-20.md) | BOARD + AUDIT | Full product loop readiness report across native modes, Spend Cards, links, QR, Telegram, wallet pass, webhook-lite, and receipts |
| [parity-w3s-payment-native-research-lane-2026-06-21.md](../../chopdot-dot/parity-w3s-payment-native-research-lane-2026-06-21.md) | BOARD + AUDIT | W3SPay, T3RMINAL, W3S payment processor, Statement Store, Bulletin, and Coinage adoption decisions |
| [chopdot-10x-experience-thesis-2026-06-23.md](../../chopdot-dot/chopdot-10x-experience-thesis-2026-06-23.md) | BOARD + SUPPORT | 10x product thesis across Catch, Management, Payout, and History; competitors as floor; right-rail principle for pay-moment capture, no-app actions, confirmation, and closeout |
| [competitor-app-research-lane-2026-06-23.md](../../chopdot-dot/competitor-app-research-lane-2026-06-23.md) | BOARD + SUPPORT | E1 competitor research lane for Splitwise, Tricount, Settle Up, Splid, Splittr, Kittysplit, Splyt, Cino, Venmo, Revolut, TWINT, Wise, and strongest null workflows |
| [competitor-scenario-scorecards-2026-06-23.md](../../chopdot-dot/competitor-scenario-scorecards-2026-06-23.md) | BOARD + SUPPORT | Scenario-based competitor scorecards across dinner receipt split, Zurich-to-Italy trip, checkout capture, late payer, closeout, savings circle, emergency pot, and community fund |
| [competitive-gap-decisions-2026-06-23.md](../../chopdot-dot/competitive-gap-decisions-2026-06-23.md) | BOARD + SUPPORT | Competitive gap decisions: copy receipt/no-account patterns, avoid generic Splitwise clone drift, and prioritize capture/no-app participant spikes |
| [w3s-native-adoption-checklist-2026-06-21.md](../../chopdot-dot/w3s-native-adoption-checklist-2026-06-21.md) | BOARD + AUDIT | Active W3S adoption checklist for PaymentEvidenceAdapter, RedactedReceiptPacketV1, Statement Store host-sim proof, Bulletin packet, and Coinage lab |
| [easy-user-journey-story-2026-06-24.md](../../chopdot-dot/easy-user-journey-story-2026-06-24.md) | BOARD + SUPPORT | Plain-English end-to-end journey story for profile entry, Spend Card capture, no-app payment, confirmation, savings circle, emergency pot, community fund, and wallet evidence |
| [tenx-journey-agent-audit-2026-06-24.md](../../chopdot-dot/tenx-journey-agent-audit-2026-06-24.md) | BOARD + AUDIT | Generated 10x journey agent audit with screenshots, friction findings, and claim boundary for Spend Card/no-app flow |
| [coinage-payment-evidence-source-map-2026-06-21.md](../../chopdot-dot/coinage-payment-evidence-source-map-2026-06-21.md) | BOARD + AUDIT | Lab-only source map for Coinage/T3RMINAL/payment-processor modules, host calls, timeout/failure behavior, and ChopDot evidence-only adoption boundary |
| [paseo-dot-deploy-readiness-2026-06-21.md](../../chopdot-dot/paseo-dot-deploy-readiness-2026-06-21.md) | BOARD + AUDIT | Static `.dot` deploy readiness on Paseo via `polkadot-app-deploy`, Bulletin Chain, DotNS, and current human signer/funding boundary |
| [dependency-risk-triage-2026-06-22.md](../../chopdot-dot/dependency-risk-triage-2026-06-22.md) | BOARD + AUDIT | Dependency audit classification and production-security claim boundary for the 9/10 readiness pass |
| [tool-offerer-path-connectivity-map-2026-06-22.md](../../chopdot-dot/tool-offerer-path-connectivity-map-2026-06-22.md) | AUDIT | Full path connectivity index across governance, runtime tool offerers, kernel, capture, data, validation, atlas, and external spike surfaces |
| [tool-offerer-path-connectivity-visual-atlas-2026-06-22.md](../../chopdot-dot/tool-offerer-path-connectivity-visual-atlas-2026-06-22.md) | AUDIT | Mermaid visual atlas of tool-offerer connectivity across governance, UX shell, auth, kernel, capture, data, settlement, validation, atlas, and labs |
| [unscripted-agent-simulation-2026-06-20.md](../../chopdot-dot/unscripted-agent-simulation-2026-06-20.md) | BOARD + AUDIT | Unscripted first-time agent observations and UX gaps across group expense, savings circle, emergency pot, and community fund |
| [humanlike-agent-pilot-2026-06-22.md](../../chopdot-dot/humanlike-agent-pilot-2026-06-22.md) | BOARD + AUDIT | Normal-surface human-like agent pilot with first reactions, visible-state decisions, screenshots, and user approval gate |
| [use-case-9-completeness-scorecard-2026-06-20.md](../../chopdot-dot/use-case-9-completeness-scorecard-2026-06-20.md) | BOARD + AUDIT | 9/10 use-case completeness target, current scores, claim boundary, and next work |
| [friend-pilot-script-2026-06-20.md](../../chopdot-dot/friend-pilot-script-2026-06-20.md) | BOARD + AUDIT | Real-person pilot script and pass/fail gates required before promoting local/simulated readiness to 9/10 |
| [friend-pilot-run-packet-2026-06-21.md](../../chopdot-dot/friend-pilot-run-packet-2026-06-21.md) | BOARD + AUDIT | Short run sheet and session generator with exact local pilot links, evidence fields, unsafe assumptions, and ledger promotion boundary |
| [friend-pilot-results-ledger-2026-06-20.md](../../chopdot-dot/friend-pilot-results-ledger-2026-06-20.md) | BOARD + AUDIT | Real-person pilot result ledger; prevents promotion without participant/device/receipt evidence |
| [agent-wallet-journey-model-2026-06-22.md](../../chopdot-dot/agent-wallet-journey-model-2026-06-22.md) | BOARD + AUDIT | Disposable agent-wallet trial model, payment clearance semantics, stress tests, and `trial:agent-wallets` run outputs |
| [auth-provider-proof-ledger-2026-06-20.md](../../chopdot-dot/auth-provider-proof-ledger-2026-06-20.md) | BOARD + AUDIT | Provider login proof ledger; separates guest/setup-visible onboarding from real wallet/email/social completion |
| [auth-provider-proof-run-packet-2026-06-21.md](../../chopdot-dot/auth-provider-proof-run-packet-2026-06-21.md) | BOARD + AUDIT | Provider login run sheet; exact evidence requirements for wallet, WalletConnect, email, and Google proof before promotion |
| [2026-06-20-chopdot-full-product-test-completion-goal.md](./2026-06-20-chopdot-full-product-test-completion-goal.md) | BOARD | Full product test goal across native modes, Spend Cards, links, QR, Telegram, wallet pass, webhook-lite, and receipts |
| [2026-06-20-chopdot-native-friends-iteration.md](./2026-06-20-chopdot-native-friends-iteration.md) | BOARD | Next iteration goal and acceptance bar for all three friend modes |
| [2026-06-20-chopdot-escrow-atomicity-lab.md](./2026-06-20-chopdot-escrow-atomicity-lab.md) | BOARD + AUDIT | Testnet-only smart-contract escrow and atomicity plan across group expense, savings circle, emergency pot, and community pot |
| [escrow-atomicity-lab-progress-2026-06-20.md](../../chopdot-dot/escrow-atomicity-lab-progress-2026-06-20.md) | BOARD + AUDIT | Partial escrow lab progress report; local contract semantics, evidence-only replay, open public-testnet and UX gates |
| [polkadot-native-verification-signoff.md](../../chopdot-dot/polkadot-native-verification-signoff.md) | BOARD | B promotion signoff |
| [polkadot-native-build-map.md](../../chopdot-dot/polkadot-native-build-map.md) | AUDIT | Build sequencing |
| [polkadot-native-99-scorecard.md](../../chopdot-dot/polkadot-native-99-scorecard.md) | AUDIT | Audit scorecard |
| [polkadot-native-audit-dossier.md](../../chopdot-dot/polkadot-native-audit-dossier.md) | AUDIT | External deps dossier |
| [polkadot-native-audit-review-2026-06-16.md](../../chopdot-dot/polkadot-native-audit-review-2026-06-16.md) | AUDIT | Review record |
| [polkadot-native-external-deps-audit.md](../../chopdot-dot/polkadot-native-external-deps-audit.md) | AUDIT | EXT deps |
| [polkadot-native-risk-register.md](../../chopdot-dot/polkadot-native-risk-register.md) | AUDIT | R-001+ risks |
| [polkadot-adapter-map.md](../../chopdot-dot/polkadot-adapter-map.md) | AUDIT | Adapter mapping |
| [product-account-signer-spike-report.md](../../chopdot-dot/product-account-signer-spike-report.md) | BOARD | B1 IdentityGate |
| [polkadot-native-replacement-matrix.json](../../chopdot-dot/polkadot-native-replacement-matrix.json) | AUDIT | `validate-chopdot-dot-native-map.mjs` |
| [polkadot-native-evidence-ledger.json](../../chopdot-dot/polkadot-native-evidence-ledger.json) | AUDIT | Evidence ledger |
| [polkadot-native-audit-scope.json](../../chopdot-dot/polkadot-native-audit-scope.json) | AUDIT | Audit scope |
| [real-paseo-token-trial-2026-06-20.md](../../chopdot-dot/real-paseo-token-trial-2026-06-20.md) | BOARD + AUDIT | Real Paseo Asset Hub PAS transfer replayed as ChopDot evidence-only |

### Simulation, ops, agent observations

| Artefact | Track | Mapped to |
| --- | --- | --- |
| [adversarial-simulation-report.md](../../chopdot-dot/adversarial-simulation-report.md) | SUPPORT | Failure modes |
| [agent-faucet-token-user-trial-2026-06-20.md](../../chopdot-dot/agent-faucet-token-user-trial-2026-06-20.md) | BOARD + SUPPORT | Real-person agent trial with local faucet/test-token transaction evidence |
| [multi-device-agent-observations.md](../../chopdot-dot/multi-device-agent-observations.md) | BOARD | B2 TransportGate context |
| [first-time-agent-observations.md](../../chopdot-dot/first-time-agent-observations.md) | SUPPORT | Onboarding friction |
| [summit-playground-operator-reference-2026-06-18.md](../../chopdot-dot/summit-playground-operator-reference-2026-06-18.md) | BOARD + SUPPORT | §0 narrative vs facts; §G deploy workarounds |

### Code anchors (implementation)

| Path | Track | Mapped to |
| --- | --- | --- |
| `src/chapter/chapterEngine.ts` | CODE | Capture kernel; C1–C9 |
| `src/chopdot-dot/polkadotSession.ts` | CODE | Native adapters; B1–B6 |
| `src/chopdot-dot/commitmentKernel.ts` | CODE | Dot kernel; Programme B proof |
| `src/bot/telegramBot.ts` | CODE | C14 Telegram |
| `src/lab/group-money-loop/` | CODE | Catch/Management/Payout/History lab scenarios |
| `src/lab/chopdot-dot/` | CODE | Dot modes lab; Programme A |
| `src/components/screens/ChapterHome.tsx` | CODE | General commitment UI |
| `tests/e2e/chopdot-dot-lab.spec.ts` | CODE | A7 |
| `tests/e2e/chopdot-dot-native-session.spec.ts` | CODE | TransportGate e2e |

### Main app spine (outside `docs/chopdot-dot/`)

| Artefact | Track | Mapped to |
| --- | --- | --- |
| `.local-private/CHOPDOT_CONCRETE_SPINE.md` | SUPPORT | Four pillars; Track 1 product |
| `src/services/closeout/pvmCloseout.ts` | CODE | HybridRemovalGate blocker |
| `src/hooks/useInviteFlow.ts` | CODE | Catch — invites pattern for C6 |

### Open decisions (must not stay only in brainstorm README)

| ID | Question | Status | Owner |
| --- | --- | --- | --- |
| OD1 | Guest pay links without account? | Open | product |
| OD2 | Telegram chat ↔ app pot linking model? | Open | product + eng |
| OD3 | Confirm authority — creditor-only vs organiser? | Open | product |
| OD4 | CH/EU issuer or L2 webhook partner shortlist? | Open | product |
| OD5 | Firma as L2 webhook vs full card issuer? | **Partial** — edge fn + contract doc; prod partner credentials pending | product |

Resolve → move to STATUS BOARD task or explicit DEFER row; do not leave in README only.

---

## COMPLETENESS RITUALS

Run these so nothing material is orphaned or narrowed.

### R1 — Every session (agent, 2 min)

1. Read § PRODUCT END STATE + § STATUS BOARD.
2. State programme: A / CAPTURE / B.
3. If CAPTURE or B → skim [capture-native-lane-map.md](../../chopdot-dot/capture-native-lane-map.md) (hybrid vs Host-first).
4. If answering “what are we building?” → **PRODUCT END STATE first**, not A1–A8.
5. MCP baseline: [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md) — Phase A = `polkadot-docs` + `playwright-extension` only.

### R2 — Every milestone (before “done” claim)

1. Flip STATUS BOARD checkboxes.
2. Run Quick verify commands (including `validate-chopdot-dot-coverage.mjs`).
3. **ce-coherence-reviewer** or human skim: does PRODUCT END STATE still match what shipped?
4. Update path §21 / runtime-proof-report only if rows changed.

### R3 — Every new doc or major brainstorm (before merge)

1. Add row to § COVERAGE REGISTRY (track + mapped-to).
2. Run `node scripts/validate-chopdot-dot-coverage.mjs` — must PASS.
3. If user-visible → extend PRODUCT END STATE or STATUS BOARD.
4. If open decision → add OD row; never README-only.

### R4 — Weekly operator review (you, 15 min)

| Step | Action |
| --- | --- |
| 1 | Open STATUS BOARD — any programme stuck? |
| 2 | Scan COVERAGE REGISTRY — any SUPPORT doc stale >30d? |
| 3 | Read brainstorm **Open decisions** — resolve or promote to OD table |
| 4 | Ask: “What would embarrass us at demo?” — add honesty flag if new |
| 5 | Optional: dispatch `explore` agent — code vs PRODUCT END STATE capabilities table |

### R5 — Pre-summit / pre-listing (Programme A)

1. Playbook §7 checklist — all items.
2. PRODUCT END STATE — demo copy matches **live** capabilities table.
3. Record 60s demo video; script must not claim unchecked layers (L2–L4).

### R6 — Pre-native promotion claim (Programme B)

1. `polkadot-native-runtime-proof-report.md` = **7/7 PASS**.
2. `polkadot-native-verification-signoff.md` updated.
3. Artefact under `artifacts/polkadot-native/`.
4. PRODUCT END STATE L4 row checked.

### Drift signals (stop and run R3 + R4)

- Agent describes product as “demo only”
- Agent reprioritises from summit keynote / DOT sentiment without operator ref §0
- New spec file not in COVERAGE REGISTRY
- STATUS BOARD green but capabilities table row still “Spec only”
- Open decision answered in chat but OD table unchanged
- Agent conflates hybrid Capture completion with native gate completion

---

| FACT | Source |
| --- | --- |
| Product primitive = **group commitment**; three surfaces: general chapter, **savings circle** (Playground hero), **Spend Cards** (next wedge) | path §0.1 |
| Kernel strategy **Option B locked**: prove native on `commitmentKernel`, port to `chapterEngine` | path §0.3 |
| `chopdotxx00.dot` live on Paseo; Talis owns; `dist-dotspike/` is infra placeholder only | path §13, §23 |
| `chopdot.dot` blocked on PoP-Full — [dotns#190](https://github.com/paritytech/dotns/issues/190) | path §13.3 |
| Runtime audit: **1/7** native gates; host Statement Store and live Asset Hub tx evidence remain unproven in the real Polkadot app container | path §21 |
| `npm run build` fails without Supabase env; boot throws via `requireValidEnvironment()` | path §19 |
| Demo URLs: `/?chopdot-dot-lab=1&mode=savings_circle` (fastest); `/pots` → savings circle (guest) | path §18.2 |
| Capture **C1–C17 ✅** in repo — hybrid guest/localStorage + E2E; **not** on live `.dot` | STATUS BOARD; `src/services/capture/` |
| Dual-track locked: Capture = hybrid; native truth = Host + G0–G4 + Option B port | capture-native-lane-map.md |
| Web3 Summit Berlin (Jun 18–19): vision/Product SDK direction validated; **gateway + host fetch still block A4** | summit operator ref §0 |
| `claimAllowances()` is **festival app code**, not universal Polkadot API — Host-mediated tx pattern only | paritytech/festival `packages/shared/host/wallet.ts` |

| INFERENCE | Implication |
| --- | --- |
| Summit/TIPTOP/Playground judges care about **60s runnable demo + honest copy**, not G0–G8 | Phase 1 is critical path for external deadlines |
| Spend Cards wedge **shipped hybrid** (C1–C17); still **not** Playground live bar until A4/A8 | Phase 2 complete for local; banner still honest |
| Multi-participant host signing (`ProductAccountDotSessionSignerAdapter` same address for all IDs) blocks real multi-user native | Phase 3 G1 before claiming native sync in demo |
| Polkadot Mobile **`pg login` floor-only** at summit — not a deploy blocker | Deploy/listing does not depend on Mobile SSO |
| Post-summit leading indicators: gateway serves CID, off-floor Mobile, Apps listing — **not** DOT price | operator ref §0 |

| ASSUMPTION | Risk if wrong |
| --- | --- |
| `chopdotxx00.dot` sufficient for listing until PoP grant | Registry may prefer `chopdot.dot` branding |
| Dot-host profile can slim bundle without full EVM/wallet refactor | Bundle size / boot time may hurt host cold start |
| Hybrid Supabase path acceptable for Capture P1a | Native truth story delayed for Spend Cards |

---

## Phase map (dependencies)

```text
Phase 0 ── DONE ── doc lock, playbook, Cursor rules
    │
    ├── Phase 1 ── Programme A (days) ── CRITICAL PATH for Playground
    │       └── Phase 1b ── listing + deploy QA (after real bundle)
    │
    ├── Phase 2 ── Capture P1a (weeks, parallel) ── Spend Card vertical slice
    │       └── Phase 4 ── Capture P1b (weeks) ── links/QR/Telegram
    │
    └── Phase 3 ── Programme B (weeks+, parallel) ── G1→G4→G0→G3→adapter port
            └── Phase 5 ── Identity upgrade (external: dotns#190)
```

**Parallel rule:** Phases 1, 2, and 3 may run concurrently on separate branches. Do not merge acceptance bars.

---

## Phase 0 — Doc & agent lock ✅ COMPLETE

| Deliverable | Location | Status |
| --- | --- | --- |
| Roadmap v5 | `docs/chopdot-dot/path-to-fully-native.md` | ✅ |
| Execution playbook | `docs/chopdot-dot/native-execution-playbook.md` | ✅ |
| Cursor programme rules | `.cursor/rules/chopdot-dot-programme.mdc` | ✅ |
| Implementation lane rules | `.cursor/rules/chopdot-dot-implementation.mdc` | ✅ |
| AGENTS overlay | `AGENTS.md` | ✅ |
| This master plan | `docs/superpowers/plans/2026-06-17-chopdot-dot-master-execution.md` | ✅ |

---

## Phase 1 — Programme A: Playground ship (CRITICAL PATH)

**Programme tag:** `PROGRAMME=A`  
**Sub-plan:** tasks below (full detail); checklist in playbook §7  
**Acceptance:** path §18.1 — real React bundle, 60s savings-circle loop, honest copy, Playwright green

### File map (Phase 1)

| File | Responsibility |
| --- | --- |
| `vite.config.ts` | `dot-host` profile: skip/env-bake Supabase gate |
| `src/utils/envValidation.ts` | Respect `VITE_BUILD_PROFILE=dot-host` at boot |
| `src/main.tsx` | Conditional `requireValidEnvironment()` |
| `package.json` | `build:dot-host` script |
| `.env.dot-host.example` | Documented dummy Supabase keys for static build |
| `src/lab/chopdot-dot/ChopDotDotLab.tsx` | Default savings_circle + summit banner |
| `tests/e2e/chopdot-dot-lab.spec.ts` | 60s demo path (may add lab-URL variant) |
| `dist-dot-host/` | Build output (never `dist-dotspike/`) |

---

### Task 1: Dot-host build profile (env gates)

**Files:**
- Modify: `vite.config.ts` (validateEnvPlugin ~L189)
- Modify: `src/utils/envValidation.ts`
- Modify: `src/main.tsx`
- Create: `.env.dot-host.example`

- [ ] **Step 1: Add profile detection helper**

In `src/utils/envValidation.ts`, add at top:

```typescript
export function isDotHostProfile(): boolean {
  return import.meta.env.VITE_BUILD_PROFILE === 'dot-host';
}
```

- [ ] **Step 2: Skip boot throw for dot-host**

In `requireValidEnvironment()`, early return when `isDotHostProfile()`:

```typescript
export function requireValidEnvironment(): void {
  if (isDotHostProfile()) {
    console.warn('dot-host profile: skipping Supabase env validation');
    return;
  }
  // ... existing logic
}
```

- [ ] **Step 3: Skip Vite build gate for dot-host**

In `vite.config.ts` `validateEnvPlugin`, before `throw new Error` on missing critical vars:

```typescript
if (env.VITE_BUILD_PROFILE === 'dot-host') {
  console.warn('dot-host profile: skipping critical env validation at build');
  return;
}
```

- [ ] **Step 4: Create `.env.dot-host.example`**

```bash
VITE_BUILD_PROFILE=dot-host
VITE_DATA_SOURCE=local
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder
VITE_ENABLE_CRUST=0
VITE_SIMULATE_CHAIN=0
```

- [ ] **Step 5: Verify build passes**

Run:
```bash
cp .env.dot-host.example .env.dot-host
export $(grep -v '^#' .env.dot-host | xargs) && npm run build:dot-host
```
Expected: build completes without Supabase error

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/utils/envValidation.ts src/main.tsx .env.dot-host.example package.json
git commit -m "feat(dot-host): add build profile that bypasses Supabase env gates"
```

---

### Task 2: `build:dot-host` script + output dir

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts` (outDir when dot-host)

- [ ] **Step 1: Add npm script**

In `package.json` scripts:

```json
"build:dot-host": "VITE_BUILD_PROFILE=dot-host tsc && VITE_BUILD_PROFILE=dot-host vite build --outDir dist-dot-host"
```

- [ ] **Step 2: Run and inspect artefact**

```bash
npm run build:dot-host
ls -la dist-dot-host/index.html dist-dot-host/assets/
```
Expected: `index.html` + hashed JS/CSS bundles (not stub HTML)

- [ ] **Step 3: Commit**

```bash
git add package.json vite.config.ts
git commit -m "feat(dot-host): add build:dot-host script and dist-dot-host output"
```

---

### Task 3: Summit banner + default lab entry

**Files:**
- Modify: `src/lab/chopdot-dot/ChopDotDotLab.tsx`
- Modify: `src/App.tsx` (optional: auto-redirect when `location.hostname` ends with `.dot.li`)

- [ ] **Step 1: Add honest summit banner**

In `ChopDotDotLab.tsx`, render at top when `mode === 'savings_circle'`:

```tsx
<div data-testid="summit-banner" className="summit-banner">
  Savings circle live · Spend Cards next — same commitment engine
</div>
```

- [ ] **Step 2: Default query params for dot-host**

When `isDotHostProfile()` and no `chopdot-dot-lab` in URL, redirect or mount lab with `mode=savings_circle` (implement in `App.tsx` or lab router — match existing `useUrlSync` patterns).

- [ ] **Step 3: Playwright assertion**

Add to `tests/e2e/chopdot-dot-lab.spec.ts`:

```typescript
test('lab savings circle shows summit banner', async ({ page }) => {
  await page.goto('/?chopdot-dot-lab=1&mode=savings_circle');
  await expect(page.getByTestId('summit-banner')).toContainText('Spend Cards next');
});
```

- [ ] **Step 4: Run tests**

```bash
npx playwright test tests/e2e/chopdot-dot-lab.spec.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lab/chopdot-dot/ChopDotDotLab.tsx src/App.tsx tests/e2e/chopdot-dot-lab.spec.ts
git commit -m "feat(playground): summit banner and savings_circle default for dot-host"
```

---

### Task 4: Deploy real bundle to owned `.dot`

**Files:**
- Deploy input: `dist-dot-host/`
- Reference: `docs/chopdot-dot/path-to-fully-native.md` §13

**Done 2026-06-18** — dev-worker Kubo deploy to fresh NoStatus name (name agnostic for Wave 1):

```bash
npm run build:dot-host
npx @parity/polkadot-app-deploy@0.11.0 ./dist-dot-host chopdotws01.dot   # Kubo on PATH; NO --js-merkle
```

- [x] On-chain slim redeploy: root `bafybeibxwkaks6s2g7eeew4pozjky46etjrcqczuajzz7zt3yjxyqxmjqq`; tx `0xd9ca1b578fc2cc0b4ea836018e34ca46d23012bac38bfc134935a3a9057e18bc`
- [ ] **A4:** React loads on live URL — run §G checklist + `npm run verify:dot-host`
- [x] **A5 local:** `npm run e2e:dot-host-preview` (summit banner + Mark paid → Confirm)

**Note:** `playground deploy --signer dev` blocked on v0.44 summit competition login. Updating `chopdotxx00.dot` still requires Talis owner credentials.

---

### Task 5: Programme A verification gate

- [ ] `npx tsc --noEmit` — PASS
- [ ] `npm run build:dot-host` — PASS
- [ ] `npx playwright test tests/e2e/chopdot-dot-lab.spec.ts` — PASS
- [ ] Live demo: contribute → next actor → confirm in ≤60s — PASS (manual or recorded)
- [ ] Listing copy audit via **chopdot-product-judgment** — no overclaim on native gates
- [ ] **code-reviewer** subagent on Programme A branch before `--publish`

---

## Phase 1b — Playground listing (after Phase 1 Task 4)

**Programme tag:** `PROGRAMME=A`  
**Blocked by:** real `dist-dot-host` deployed

| # | Task | Command / artefact | Done when |
| --- | --- | --- | --- |
| 1 | Registry publish | `pad ./dist-dot-host chopdotxx00.dot --js-merkle --publish` | Appears on browse.paseo.li |
| 2 | Metadata draft | path §18.3 fields | Matches live demo |
| 3 | Screenshot pack | Playwright or manual | Savings circle + banner |
| 4 | LinkedIn / summit copy | Short remote-deploy narrative | Honest: savings circle live, Spend Cards next |

---

## Phase 2 — Capture P1a: Spend Card vertical slice (parallel)

**Programme tag:** `PROGRAMME=CAPTURE`  
**Sub-plan:** [capture-layer-build-plan.md](../../chopdot-dot/cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) §5 Phase 1a  
**Acceptance:** One dinner, 4 friends, CH Twint, end-to-end; `npx tsc`, `npm run build`, `npx playwright test` green

| # | Task | Files | Done when |
| --- | --- | --- | --- |
| 1 | Schema `0.2.0` + `migrateChapter` | `src/chapter/types.ts`, `src/chapter/migrateChapter.ts` (+test) | Migration test green |
| 2 | Chapter store | `src/services/capture/ChapterStore.ts` | Load/save `metadata.chapter` |
| 3 | State hook | `src/hooks/useChapterState.ts` | Mutations via engine + persist |
| 4 | Kernel bridge | `src/services/capture/KernelBridge.ts` | `commitSpendSession` → legs |
| 5 | Spend session | `src/services/capture/SpendSessionService.ts`, `useSpendSession.ts` | Draft → commit → expire |
| 6 | Capture link tokens | Supabase migration + `CaptureLinkService.ts` | Mint/verify/consume |
| 7 | Screens | `SpendCardScreen.tsx`, `CaptureHandoffScreen.tsx` | Pay now → Twint handoff |
| 8 | Legacy sync | `src/services/capture/chapterSync.ts` | `chapterToPot` after mutation |
| 9 | E2E | `tests/e2e/capture-spend-loop.spec.ts` | Full loop green |

**Create dedicated plan when starting:** `docs/superpowers/plans/YYYY-MM-DD-capture-p1a.md` via writing-plans (bite-sized TDD per task).

**Do not:** wire native adapters in this phase; hybrid Supabase is OK per dual-track posture.

---

## Phase 3 — Programme B: Native truth gates (parallel)

**Programme tag:** `PROGRAMME=B`  
**Acceptance:** 7/7 runtime gates; path §6 definitions; artefacts in `artifacts/polkadot-native/`

### Recommended gate order

| Order | Gate | Focus | Key files | Falsifier |
| --- | --- | --- | --- | --- |
| 1 | **G1** | Multi-participant host signer | `src/chopdot-dot/polkadotSession.ts` L815–820 | All participants share one address → native multi-user demo invalid |
| 2 | **G4** | Wire `product-sdk-statement-store` | Replace Vite middleware `/__chopdot_dot_statement_store` | Plaintext JSON in dev middleware = not G3 |
| 3 | **G0** | Funding model for on-chain writes | New module + path §6 G0 | User must hold PAS for every write → friction kills UX |
| 4 | **G3** | Encryption at rest | `@parity/product-sdk-crypto` integration | Statement store holds readable obligations |
| 5 | **G2** | Membership / authz | Host session + chapter membership | Wrong user can confirm another's leg |
| 6 | **Port** | Adapters → capture kernel | `chapterEngine.ts` + bridge types | Spend Cards still hybrid after "native" claim |

**Per-gate plan pattern:** `docs/superpowers/plans/YYYY-MM-DD-native-g<N>-<name>.md`

**Verification stack per gate:**
- `node scripts/validate-chopdot-dot-native-map.mjs`
- Update `polkadot-native-runtime-proof-report.md`
- **ce-security-reviewer** on G2, G3
- **verification-before-completion** before gate pass claim

---

## Phase 4 — Capture P1b: Links, QR, Telegram (after P1a)

**Programme tag:** `PROGRAMME=CAPTURE`  
**Source:** capture build plan §5 Phase 1b

| # | Task | Done when |
| --- | --- | --- |
| 1 | `/spend`, `/pay`, `/confirm` routes in `useUrlSync.ts` | Pathname dispatch works |
| 2 | `useCaptureLinkFlow.ts` + confirm screen | Link-only friend completes handoff |
| 3 | Share + QR via `QRPayloadCodec.ts` | Single-use QR |
| 4 | `spendCards[]` persistence | Launcher reuse |
| 5 | Telegram ↔ app convergence | `fileChapterStore.ts` → `ChapterStore` |

---

## Phase 5 — Identity upgrade (external dependency)

**Blocked by:** [dotns#190](https://github.com/paritytech/dotns/issues/190) PoP-Full grant for `chopdot.dot`

| Step | Action | Owner |
| --- | --- | --- |
| 1 | Monitor dotns#190 | product |
| 2 | On grant: `pad ./dist-dot-host chopdot.dot --js-merkle` | eng + human approval |
| 3 | `pad transfer chopdot.dot --to 0xad43DBB3B41FCabc0335fD5DBBB22Fbf229916D2` if needed | Talis wallet |
| 4 | Re-publish registry with `chopdot.dot` branding | product |
| 5 | Update path §13.3 + §20 identity matrix | agent |

**Interim:** `chopdotxx00.dot` + Talis ownership is sufficient for Phase 1 listing.

---

## Phase 6 — Conference / summit readiness checklist

| Audience | Message | Proof artefact |
| --- | --- | --- |
| Playground judges | 60s savings circle on `.dot` | Live URL + Playwright |
| TIPTOP / Web3 Summit | Group commitment primitive + three surfaces | path §0 + demo video |
| Polkadot technical | Honest 1/7 gates, Option B port plan | runtime proof report |
| Product / investors | Spend Cards = capture wedge, Model A first | capture build plan §8 metrics |

**Post-summit (Jun 2026) leading indicators** — track these, not DOT price or keynote hype:

| Signal | Meaning |
| --- | --- |
| Gateway serves `chopdotws01.dot` CID | Unblocks **A4** live verify |
| Host fetch path stable (no §G.1 reload loop) | Unblocks delegate `.dot` demos |
| Polkadot Mobile / `pg login` off summit floor | Unblocks A8 quest path |
| Playground Apps listing + `--publish` | Programme A finish line |

**Anti-bait-and-switch (mandatory):** First screen or registry text states runnable today vs roadmap (path §18.4). Summit stage demos ≠ operator infra green — see [summit operator ref §0](../../chopdot-dot/summit-playground-operator-reference-2026-06-18.md).

---

## Verification matrix (all phases)

| Command | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- |
| `npx tsc --noEmit` | ✅ | ✅ | ✅ |
| `npm run build` | hybrid OK | ✅ | dot-kernel tests |
| `npm run build:dot-host` | ✅ | — | when UI shared |
| `npx playwright test` | lab spec | capture spec | lab + gate e2e |
| `node scripts/validate-chopdot-dot-native-map.mjs` | — | — | ✅ on ledger touch |

---

## Agent routing quick reference

| User says | Start phase | Skill |
| --- | --- | --- |
| "Ship Playground / summit" | Phase 1 | writing-plans → executing-plans |
| "Spend Cards / capture" | Phase 2 | capture build plan + lane map (hybrid track) |
| "Native gate G*" / "Host-native" | Phase 3 | lane map + polkadot-evidence-pack + ce-security-reviewer |
| "Review the plan" | Phase 0 doc | explore agents (3× parallel) |
| "Deploy .dot" | Phase 1 Task 4 | human approval + operator ref §G + verification-before-completion |

---

## Self-review (plan vs spec)

| Spec requirement | Plan task |
| --- | --- |
| path §18 real bundle | Phase 1 Tasks 1–4 |
| path §18.4 honest copy | Phase 1 Task 3 |
| path §19 dot-host profile | Phase 1 Task 1–2 |
| capture P1a acceptance | Phase 2 table |
| Option B adapter port | Phase 3 port row |
| dotns#190 blocker | Phase 5 |
| playbook §10 order | Phase map |
| Two programmes never merged | Programme tags + acceptance tables |

**Placeholder scan:** No TBD steps in Phase 1 tasks. Phases 2–4 reference detailed sub-plans to be generated at implementation start (per writing-plans scope rule).

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-06-17 | Initial master plan — synthesises thread, path v5, playbook §10, capture build plan |
| 2026-06-17 | Added § STATUS BOARD — single checkpoint for all programmes |
| 2026-06-17 | Added § PRODUCT END STATE + capabilities table — fix agent narrow-outcome drift |
| 2026-06-17 | Added § COVERAGE REGISTRY + § COMPLETENESS RITUALS + `validate-chopdot-dot-coverage.mjs` |
| 2026-06-17 | Added § CROSS-TOOL RESUME — Codex / non-Cursor hydration prompt |
| 2026-06-17 | Linked [recommended-mcps.md](../../chopdot-dot/recommended-mcps.md) + `mcp/` templates |
| 2026-06-19 | Post–Web3 Summit sync — lane map + operator ref §0 in companion docs, COVERAGE REGISTRY, CROSS-TOOL RESUME, honesty flags, §G.1 deploy note, Phase 6 leading indicators, OD5 partial, FACTS aligned to C1–C17 ✅ |
| 2026-06-19 | Codex hydration recheck — aligned `verify:dot-host` default CID to the current slim redeploy and confirmed A4 remains blocked by gateway/host fetch |
| 2026-06-19 | Operator decision — A4/A8 parked until Polkadot app release; local work routes to ChopDot product hardening and Programme B readiness |
| 2026-06-19 | Host-ready hardening — emergency redacted receipts now strip blocker detail; viewer/approver/release misuse and two-approver community fund gating covered by unit + browser tests |
| 2026-06-19 | Verification routing — normal Playwright excludes host-only projects unless `DOT_HOST_PREVIEW=1` or `HOST_SIM=1`; full app suite, dot-host preview A5, and host-sim smoke pass separately |
| 2026-06-19 | Native closeout proof gate — added explicit `anchor_receipt` evidence event, `ProductSdkCloseoutProofAdapter`, and `chopdot-dot-closeout=host-required` strict no-fallback mode |
| 2026-06-19 | Native privacy hardening — signed replay now rejects private payment/release sidecars that also leak Asset Hub refs, and private exception notes that leak sensitive text into the shared event log |
| 2026-06-19 | Native identity hardening — Product Account preflight now rejects one shared host signer address standing in for multiple participants |
| 2026-06-19 | Native transport hardening — Statement Store preflight now requires signed append, load-back, and deterministic replay of a no-op probe event |
| 2026-06-19 | Native archive hardening — receipt archive preflight now requires host-shaped save, retrieval, and hash match against the redacted receipt |
| 2026-06-19 | Native payout evidence hardening — Asset Hub preflight now requires finalized matching evidence and proves evidence-only replay cannot confirm or close |
| 2026-06-20 | Added 99% pre-release checklist — separates locally finishable host-readiness work from externally blocked live `.dot` / 7-of-7 native host proof |
| 2026-06-20 | Native friends iteration implemented locally — savings circle, emergency fund, and community pot now pass separate-device signed-session flows; live host gates remain fail-visible/blocked-live |
| 2026-06-20 | Added full product test completion goal — binds native modes to Spend Cards, pay/spend/confirm links, QR/share, Telegram-style capture, wallet pass, webhook-lite, and receipt/history testing |
| 2026-06-20 | Added full product readiness report shell — next execution pass must fill pass-local / hybrid-pass / fail-visible / blocked-live status for every product flow |
| 2026-06-20 | Added agent faucet-token user trial report — separate-person UI trials plus local transaction evidence checks across savings circle, emergency fund, community pot, Spend Cards, links, QR/share, Telegram-style capture, wallet pass, and webhook-lite |
| 2026-06-20 | Added real Paseo token trial — public Asset Hub PAS transfer finalized and replayed as ChopDot evidence-only; faucet reCAPTCHA and Product SDK host tx remain unproven |
| 2026-06-20 | Added escrow atomicity lab plan — testnet-only contract escrow across group expense, savings circle, emergency pot, and community pot while preserving claim/confirm/close boundaries |
| 2026-06-20 | Added friend-pilot readiness script — real-person pass/fail gates now required before local/simulated readiness is promoted to 9/10 |
| 2026-06-20 | Added friend-pilot results ledger + validator — no core mode can be promoted from local/simulated readiness to 9/10 without real participant evidence |
| 2026-06-20 | Added auth provider proof ledger + validator — guest/setup-visible onboarding remains separate from real desktop wallet, WalletConnect, email, and social provider completion |
| 2026-06-20 | Added use-case 9/10 scorecard validator — score promotion now requires matching friend-pilot, provider-auth, and live-host evidence gates |
| 2026-06-21 | Added Parity W3S payment/native research lane — W3SPay/T3RMINAL/payment-processor patterns become payment evidence, reconciliation, Statement Store, Bulletin, and Coinage lab decisions without changing ChopDot product truth |
| 2026-06-21 | Added current execution board + W3S native adoption checklist — short daily tracker now points to PaymentEvidenceAdapter, RedactedReceiptPacketV1, Statement Store host-sim proof, and Coinage lab boundaries |
| 2026-06-21 | Implemented checkout capture wedge — spend card can parse checkout link/receipt evidence, prefill amount/memo, attach evidence to the created expense, and browser tests prove mark-paid and receiver confirmation remain separate |
| 2026-06-21 | Implemented RedactedReceiptPacketV1 — savings, emergency, and community closeouts can produce schema-versioned hashable archive packets that exclude names, sensitive reasons, payment refs, tx hashes, and detailed blockers |
| 2026-06-21 | Wired Product SDK Statement Store host-sim transport — compact signed events now publish/load/replay through `ProductSdkStatementStoreSessionAdapter`; Leo/Nina/Omar/Mina convergence passes in host-sim while live host proof remains open |
| 2026-06-21 | Added closeout reconciliation panel — `ChapterHome` now shows observed, marked paid, confirmed, still open, and ready states in normal ChopDot language; focused native-session browser tests cover preview and multi-device savings-circle changes |
| 2026-06-21 | Added W3S QR/deeplink parser + Coinage source map — Spend Card checkout capture now reads submitted/settled/unconfirmed W3S/Coinage-style evidence, fails visibly on failed/interrupted/unknown states, and Coinage remains evidence-only/lab-only with exact Parity module map |
| 2026-06-21 | Added Coinage host-sim behavior gates + static `.dot` deploy readiness — Coinage success/timeout/rejected/offline/duplicate/privacy tests pass locally, and `polkadot-app-deploy` manifest/script/preflight now prepares a Paseo static publish while host-native features remain separate |
| 2026-06-22 | Added friend-pilot session generator — `npm run pilot:friend-session` now creates a concrete run sheet with per-person links and ledger templates while real-user promotion remains blocked on completed ledger evidence |
| 2026-06-22 | Added agent-wallet journey model — payment semantics now distinguish weak claims from verified received value, and `npm run trial:agent-wallets` creates disposable public-testnet personas, funding reports, and run sheets for wallet-backed scenario trials |
| 2026-06-22 | Ran funded agent-wallet PAS scenarios — Leo/Nina/Omar/Mina/Casey/Riley/Sam/Alex/Jordan-style public-testnet transfers finalized across group expense, savings circle, emergency pot, and community fund with tx hashes recorded as received/cleared payment evidence |
| 2026-06-22 | Wired funded PAS reports into real ChopDot pot chrome — `agent-wallet-pas-scenarios.spec.ts` now imports public-testnet PAS evidence into signed native session events, closes group expense/savings/emergency/community records, and verifies emergency receipt redaction |
| 2026-06-22 | Refreshed local readiness gates — production build, unit/domain tests, lint, full Playwright regression, dot-host build, host-sim smoke, native map, host-native boundary, coverage registry, and deploy preflight pass locally; live publish remains setup-required at signer session |
| 2026-06-22 | Wired generated readiness report into `validate:use-case-9` — normal 9/10 validation now checks both scorecard rows and evidence-derived open gates before any completion claim |
| 2026-06-22 | Added `validate:readiness` daily gate — one command now runs use-case, friend-pilot, auth-provider, coverage, native-map, and host-native-boundary validators |
| 2026-06-22 | Ran 90% remaining-gap execution pass — mixed friend-pilot run packet generated, live agent pilot completed, focused native/capture/PAS/auth/host checks passed, full Playwright 82/4 passed/skipped, and human promotion remains pending |
| 2026-06-22 | Added dependency risk triage — npm audit warnings are now classified as active release risk instead of being hidden behind green local CI |
| 2026-06-22 | Added human-like agent pilot runner — `npm run pilot:humanlike-agents` uses normal app UI, visible-state decisions, screenshots, and user approval before any human-style promotion |
| 2026-06-23 | Implemented 10x capture pass — Pot home now starts from `I just paid`, Spend Card supports receipt checklist + checkout evidence + rail choice, `/pay` is one-action/no-app, `/confirm` remains receiver-only, and focused desktop/mobile capture browser tests pass |
| 2026-06-22 | Ran human-like agent pilot — 42 normal-surface steps, 41 visible app actions clicked, 1 deliberate missed-payment wait, 0 missing expected actions, 0 runtime errors, and all four core scenarios reached closed receipts pending operator approval |
| 2026-06-24 | Added Spend Capture Ladder — locks L0-L4 sequence, defines Spend Group vs Pot vs Spend Card vs captured transaction, and corrects Spend Card back to reusable group checkout capture rather than a form/wizard |
