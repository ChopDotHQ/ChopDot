# ChatGPT Work Factory — Worker Registry

**Status:** declared phase-aware topology  
**Purpose:** durable expected roster for the ChopDot factory.  
**Important:** live automation state is operational truth; this file defines what the roster is *supposed* to be for the current canonical phase. Any mismatch must be reconciled before creating or repurposing workers.

## Capacity rule

The automation platform currently allows 15 active tasks. Capacity is a ceiling, not a target.

- During active UX journey production, the declared topology is **13 active tasks**, leaving **2 slots reserved**.
- After the registered UX journey-production phase is canonically complete and exact-head verified, the declared post-UX / strategy-gate topology is **4 active tasks**.
- During the explicitly authorized post-UX selective contract-integration phase, use the primary Builder / Reviewer / Supervisor trio plus a **strictly event-gated backup pickup for each stage where prior measured factory latency justifies it**, alongside Control Tower, the two external capability watches, and the two explicitly authorized **read-only production-preflight lanes**. Backups never create duplicate authority or competing writes; preflight lanes never write product/runtime bytes.
- Product Integrator remains disabled until selective product-contract changes are independently reviewed, explicitly human-approved for the exact post-J28 bytes/contracts, re-locked/verified, the production start packet is ready, and a later human authority transition starts production implementation.

Never fill unused capacity merely because slots exist.

## Mandatory change protocol

Before any automation create, enable, disable, schedule change, role change, or prompt change:

1. read the live automation roster;
2. read live canonical product/UX phase authority;
3. read this registry;
4. compare live roles/counts with the declared topology for the current phase;
5. classify the desired change as update, repurpose, disable, one-time recovery, phase transition, or genuinely new recurring capability;
6. search the existing active and dormant ChopDot roster for an equivalent capability;
7. reuse or update an existing worker before creating another one;
8. a genuinely new recurring worker is allowed only for a measured bottleneck plus a capability the existing roster cannot provide;
9. after mutation, re-read the live roster and verify roles/counts against this file;
10. if topology intentionally changed, update this file in the same process change.

Journey-specific recurring workers are forbidden. One-time recovery tasks must self-expire or be disabled after use.

## Phase A — active UX journey production

This topology applies only while canonical authority has a current registered UX journey or a just-frozen journey still requires resulting-state verification.

### Builder lane — 3 opportunities, one writer

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot UX Builder | `:00` hourly | primary Builder |
| ChopDot Build Fast Watch A | `:20` hourly | generic Builder pickup / repair opportunity |
| ChopDot Build Fast Watch B | `:45` hourly | generic Builder pickup / repair opportunity |

All Builder opportunities are mutually exclusive on candidate product writes and use the repo-owned Builder lease.

### Independent review lane — 3 opportunities, one exact review

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Review Fast Watch A | `:15` hourly | generic independent review opportunity |
| ChopDot UX Reviewer | `:40` hourly | primary independent Reviewer |
| ChopDot Review Fast Watch B | `:55` hourly | generic independent review opportunity |

The opportunities do not authorize duplicate review of unchanged exact evidence.

### Supervisor / authority lane — 3 opportunities

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Supervisor Fast Watch A | `:05` hourly | generic authority-transition opportunity |
| ChopDot Supervisor Fast Watch B | `:35` hourly | generic authority-transition opportunity |
| ChopDot UX Supervisor | `:52` hourly | primary authority/process keeper |

### Factory control / learning — 2

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Control Tower | `:58` hourly condition watch | coordination / no-idle driver |
| ChopDot Factory Observer | `:44` hourly exact | independent factory measurement / learning |

### External change watches — 2

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

### Expected Phase A counts

- **Total active:** 13
- Builder opportunities: 3
- Reviewer opportunities: 3
- Supervisor opportunities: 3
- Factory control / observer: 2
- Platform / capability watches: 2
- Reserved platform slots: 2

## Phase B — post-UX strategy gate

This topology applies when all 28 registered UX journeys are Golden, the final resulting state is exact-head verified, and selective post-UX product integration has not yet been explicitly authorized.

### Declared active roster

| Worker | Schedule | Role |
|---|---:|---|
| ChopDot Control Tower | `:58` hourly condition watch | phase coordination, no-idle enforcement, implementation hold |
| ChopDot Factory Observer | `:44` hourly exact | private Competitive × Golden × current Polkadot / Parity reconciliation |
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

The Builder / Reviewer / Supervisor mesh and Product Integrator remain disabled during Phase B.

### Expected Phase B counts

- **Total active:** 4
- Factory control / private reconciliation: 2
- Platform / capability watches: 2
- UX production workers: 0 active
- Product Integrator: disabled

## Phase C1 — selective post-J28 product-contract integration + production preflight

This topology applies only after explicit human product authority authorizes bounded post-J28 selective contract integration while production implementation remains held. The 28 validated Goldens remain the baseline; Phase C1 is not Journey 29 and is not production implementation.

The user also explicitly authorized a **parallel production-readiness preflight** so the production implementation phase does not begin with another architecture-discovery cycle. This preflight is read-only against product/runtime behavior and is coordinated through issue #43.

### Declared active roster — 11 existing workers, no new worker

| Worker | Live schedule | Phase C1 role |
|---|---:|---|
| ChopDot Contract Review Backup *(existing Review Fast Watch A ID)* | `:05` hourly | late-handoff independent review pickup; no duplicate exact review |
| ChopDot Control Tower | `:12` hourly condition watch | phase coordination, no-idle enforcement, roster reconciliation, process self-heal |
| ChopDot Contract Builder *(existing primary UX Builder ID)* | `:15` hourly | **one writer** for the dedicated selective contract/prototype candidate |
| ChopDot Contract Supervisor Backup *(existing Supervisor Fast Watch A ID)* | `:20` hourly | consumes only an unconsumed exact Phase C1 Reviewer receipt |
| ChopDot Production Readiness Mapper *(existing Factory Observer ID)* | `:25` hourly | read-only production seam map, migration map, acceptance matrix and Production Start Packet in issue #43 |
| ChopDot Contract Reviewer *(existing primary UX Reviewer ID)* | `:35` hourly | primary independent semantic / UX / regression review |
| ChopDot Security Attacker *(existing Sovereignty Guardian ID)* | `:45` hourly condition watch | independent ChainSecurity-informed adversarial threat model, invariants and attack/test matrix in issue #43 |
| ChopDot Contract Supervisor *(existing primary UX Supervisor ID)* | `:50` hourly | primary authority/process keeper; stops at exact human approval |
| ChopDot Contract Repair Pickup *(existing Build Fast Watch A ID)* | `:55` hourly | REVISE/mechanical-failure repair pickup only; never competes for initial build |
| ChopDot Polkadot Platform Watch | daily | material Polkadot / Parity platform changes |
| ChopDot Capability Radar | weekly | genuinely new hard-to-own factory capabilities |

### Why the three backups are active

Prior factory measurements showed that coarse hourly handoffs could dominate real repair/review time. Phase C1 therefore uses one strictly event-gated backup pickup per stage so a handoff that narrowly misses the primary slot does not wait nearly an hour.

The product-contract cadence is intentionally interleaved:

`review backup :05 → Control Tower :12 → primary Builder :15 → supervisor backup :20 → primary Reviewer :35 → primary Supervisor :50 → repair Builder :55 → next-hour review backup :05`

The two read-only production-preflight lanes run between those stages at `:25` and `:45` and must never mutate the Phase C1 candidate or production runtime.

This preserves **one-writer / one-exact-review / one-authority-transition semantics** while reducing avoidable handoff latency and using otherwise idle time to prepare implementation/security evidence.

### Phase C1 worker boundaries

- **Primary Builder:** creates only a dedicated non-protected selective-integration candidate derived from the exact validated 28-Golden base. Preserve unrelated Golden bytes/checksums; never edit approved Golden HTML in place; no production/runtime implementation.
- **Repair Builder backup:** acts only on exact `REVISE` or Builder-actionable mechanical failure; must respect the same single-writer lease/CAS and no-op if the primary Builder owns the write.
- **Primary + backup Reviewer:** whichever first consumes an unreviewed exact sealed Phase C1 Builder handoff performs the independent review. The other must no-op on the same exact evidence.
- **Primary + backup Supervisor:** whichever first consumes an unconsumed exact Phase C1 Reviewer receipt performs the authority transition. The other must no-op on that same receipt.
- **Production Readiness Mapper:** read-only. Builds the implementation seam map and 28-Golden + C1 acceptance matrix against actual code, including identity migration, SpendIntent vs PaymentIntent boundary, storage/on-chain/adapters, test ownership and PR #39 salvage/rebase strategy. It must distinguish proven code facts, reusable primitives, architecture conflicts and items still open until C1.
- **Security Attacker:** read-only and independent from implementation. Uses current public ChainSecurity audit reports/subject areas as a pattern library, plus current Polkadot/Parity security/runtime truth, to build the trust model, security invariants, attack sequences, temporal transition matrix, migration threat model and required adversarial/property/stateful/fuzz/integration/on-chain tests. It never implies ChainSecurity audited ChopDot.
- **Control Tower:** self-heals generic coordination only; it does not author product bytes, perform independent review, infer approval, or collapse the separation between Builder, Reviewer, readiness mapping and security attack roles.

### Production preflight authority

Issue #43 is the durable coordination surface for production-readiness and security-preflight findings. Its outputs are implementation inputs, not new product authority.

The preflight must cover at minimum:

- REUSE / ADAPT / REPLACE / REMOVE / DEFER mapping for actual production seams;
- stable Participant identity migration from legacy `User/userId` structures;
- clear separation between settlement-after-debt `PaymentIntent` and before/during-spend `SpendIntent`;
- trust/authority and single-point-of-failure model;
- accounting, replay, idempotency, partial/unknown/reversal and restore/link-upgrade invariants;
- exact test ownership and production implementation order;
- public-safe findings only; no private competitive workbook content.

Production preflight is complete only when, after exact C1 approval, Product Integrator can begin from a concrete Production Start Packet rather than repeating repository archaeology.

### Declared dormant / held roster during Phase C1

Keep the following disabled unless a later measured bottleneck and authority update changes this registry:

- ChopDot Build Fast Watch B
- ChopDot Review Fast Watch B
- ChopDot Supervisor Fast Watch B
- any older journey-specific one-off workers

`ChopDot Product Integrator` remains **disabled** throughout Phase C1. Selective product-contract approval/re-lock and completion of the preflight do not themselves authorize production implementation.

### Expected Phase C1 counts

- **Total active ChopDot tasks:** 11
- Candidate write opportunities: 2, but only 1 can write and the backup is repair-only
- Independent review opportunities: 2, one exact review
- Authority/process opportunities: 2, one exact transition
- Production readiness / security preflight: 2 read-only lanes
- Control Tower: 1
- Platform / capability watches: 2
- Product Integrator: disabled
- Unused platform capacity: 4 slots, preserving at least 2 reserve slots

## Phase transition rule

Canonical product/UX authority plus explicit human post-UX product authority decides which topology applies.

- Current registered journey or just-frozen journey awaiting exact verification → **Phase A**.
- 28/28 exact-head validated and no selective post-UX product integration yet authorized → **Phase B**.
- 28/28 exact-head validated plus explicit authority for bounded post-J28 selective contract integration while production remains held → **Phase C1**.
- Do not oscillate merely because a worker self-disables or because unused capacity exists.
- A genuinely new journey requires a separate product-authority decision and registry change.
- Production implementation is a separate authority transition; it does not occur merely because Phase B or Phase C1 finishes or because issue #43 reaches preflight completeness.

## Anti-regression rules

- Do not add a new Builder merely because a handoff is waiting; Phase C1 backups reuse existing dormant IDs.
- Backup workers must be event-gated and must no-op when the exact handoff/receipt is already consumed.
- Never allow two writers on the same candidate or two formal reviews of unchanged exact evidence.
- Production Readiness Mapper and Security Attacker are read-only and must not become shadow product/implementation authorities.
- Do not create journey-number-specific recurring workers.
- Do not count disabled/historical workers as active capacity.
- Do not reactivate Fast Watch B roles in Phase C1 merely to increase opportunity count.
- Do not change worker count from memory; live-list first.
- Never use standing approval from an earlier activation scope to approve new post-J28 selective bytes/contracts.
- Private competitive workbooks, evidence registers, strategic findings, and gap-placement conclusions never become public repository authority.

## Authority relationship

This registry does **not** decide product truth, journey state, approval, Golden status, selective integration approval, security clearance, or production implementation authority. It governs factory topology only.

Live UX/product authority remains in the canonical workbench registry plus explicit human product decisions and exact Git evidence. Issue #43 provides production-readiness/security evidence, not product approval. Live automation state remains the truth of what is actually enabled. This file is the expected topology used to detect drift between those worlds.
