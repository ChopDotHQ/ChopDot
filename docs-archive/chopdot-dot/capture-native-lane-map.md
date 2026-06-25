# Capture × Native Lane Map

Status: `routing` · 2026-06-18  
**Purpose:** Stop agents conflating **Track 1 Capture ship** (hybrid OK) with **Programme B native truth** (Host-first).  
**Sources:** [path-to-fully-native.md](./path-to-fully-native.md) (G0–G8), [capture-layer-build-plan.md](./cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md), [native-execution-playbook.md](./native-execution-playbook.md)

---

## How to read this

| Column | Meaning |
| --- | --- |
| **Hybrid OK now** | Ship on Supabase / localStorage / extension wallet — no Host blocker |
| **Host-first when** | Required for ChopDot’s **native truth core** (signed, encrypted, replayable state) |
| **Gate** | From [path-to-fully-native.md §6](./path-to-fully-native.md) G0–G8 |

**Partition rule ([§8.2](./path-to-fully-native.md)):** A chapter is **either** hybrid **or** native truth — never both at once.

**Agent rule:** At task start, declare **Track 1 capture**, **Programme A** (Playground `.dot`), or **Programme B** (native truth). Do not merge acceptance bars without updating the active plan.

---

## Capture × Hybrid vs Host-first (G0–G8)

| Area | Hybrid OK now? | Host-first when? | Gate | Notes |
| --- | --- | --- | --- | --- |
| **Spend card UX** (amount, memo, pay now, split status) | Yes | G8 | G8 | UI stays; truth backend swaps underneath |
| **`chapterEngine` loop** (expense → legs → claimed → confirmed → close) | Yes | Programme B | G4+ | Kernel semantics are product law; native = same loop, different transport |
| **Confirm gate** (never auto-confirm from chain/webhook) | Yes | Always | — | Product invariant; Firma webhook sets **claimed** only |
| **Pay / spend / confirm links** (`/pay?t=`, `/spend?t=`, `/confirm?t=`) | Yes | G8 | G8 | Deep links work in both lanes |
| **QR + share actions** | Yes | G8 | G8 | Edge delivery; not truth |
| **Wallet pass launcher** (URL/QR → `/spend?t=`) | Yes | G8 | G8 | Launcher pass — not custody |
| **Telegram bot** (`/linkpot`, expense capture) | Yes | Edge forever | — | Delivery rail; not SSOT |
| **Settlement adapters** (TWINT, Firma handoff, outside) | Yes | Edge forever | G6 (evidence) | L1 handoff stays external; native adds evidence refs |
| **Firma webhook → `markLegPaid`** | Yes (Supabase pots) | Hybrid projection | G4 | Server path OK; native chapter truth = signed events |
| **Guest `localStorage` pots** | Yes (demo) | Demote to cache | G4, G7 | Fine for P1–P2; not native SSOT |
| **Supabase `pots.chapter` blob** | Yes (mainstream) | Replace as SSOT | G4, G7 | Hybrid truth store until chapter promoted |
| **Capture E2E / dev harness** | Yes | Lab only | — | Velocity tooling; not production native path |
| **Product Account identity** | Hybrid via wallet ext only | **Required** | **G1** | Host signing; resource allocation (`claimAllowances` pattern in [festival](https://github.com/paritytech/festival)) |
| **Multi-device chapter sync** | Supabase polling OK | **Required** | **G4** | Native = Statement Store replay |
| **Membership / invites as auth** | Supabase invites OK | **Required** | **G2** | Signed grants gate who can append truth |
| **Encrypted chapter payloads** | No (plaintext in lab middleware) | **Required** | **G3** | No plaintext financials on shared stores |
| **Fee / allowance for writes** | Free (Supabase) | **Required** | **G0** | Token-less UX needs sponsor/app-funded allowances |
| **Closeout proof** (`pvmCloseout` EVM) | Hybrid today | Replace on native path | **G6, G7** | Asset Hub evidence ref; drop EVM from native critical path |
| **Asset Hub settlement** (user wallet) | Partial-native | Keep at edge | G6 | User pays via rail; app records evidence |
| **Bulletin archive / receipt CID** | IPFS + Supabase OK | **Required** | **G5** | Encrypted archive round-trip for native history |
| **`.dot` Playground listing** | No | **Required** | Programme A | Distribution = Host bundle |
| **Savings circle demo (dot kernel)** | Lab / hybrid fallback | **First native ship** | A → G1+G4 | Proving ground before capture-kernel port (Option B) |

---

## Stays hybrid even at “fully native”

Edge by design — does **not** need Host-first:

- TWINT / Firma / bank handoff UI  
- Fiat, KYC, push notifications  
- Invite **delivery** (link, Telegram, email)  
- Search, analytics, support  
- Optional IPFS share links (non-truth)  
- User-initiated Asset Hub settlement (with native **evidence** recorded)

Native means the **kernel’s record of obligations** is signed + encrypted + replayable — not that every payment rail runs on-chain.

---

## Recommended sequence

```text
NOW — Capture Track 1 (hybrid)
  P1–P2: links, QR, wallet pass, Firma webhook, settlement adapters
  Truth: Supabase / localStorage chapter blob

PARALLEL — Programme A (Host distribution)
  .dot bundle, savings circle demo, festival-style Host tx patterns
  Bar: listable demo — not full G0–G8

NEXT — Programme B spikes
  G0 funding → G1 identity → G2 grants → G3 encryption → G4 Statement Store
  Prove on dot kernel + polkadotSession adapters first

THEN — Capture goes native
  Port adapters to chapterEngine (Option B locked in path §0.3)
  New chapters opt into native truth; legacy pots stay hybrid until closed

LAST — G5–G8
  Bulletin archive, Asset Hub evidence, EVM removal, UX freeze
```

---

## One-line decision rule

| If you’re building… | Lane |
| --- | --- |
| Spend Cards, Firma webhook, wallet pass, Telegram | **Track 1 hybrid** — keep shipping |
| Tamper-evident, multi-device, Host-distributed group truth | **Programme B Host-first** — G0–G4 minimum |
| Playground / summit / `.dot` presence | **Programme A Host-first** — ship now |
| Full native with no hybrid escape hatch | **Not yet** — dual-track until Host reach + economics validate ([§1A](./path-to-fully-native.md)) |

---

## Host-native tx footgun (W3S / festival stack)

When implementing **inside Polkadot Desktop/Mobile**, read reference patterns before writing tx code:

- [`paritytech/festival` — `packages/shared/host/wallet.ts`](https://github.com/paritytech/festival/blob/main/packages/shared/host/wallet.ts) — `claimAllowances()` → `hostApi.requestResourceAllocation`
- [`paritytech/festival` — `packages/shared/contracts/write.ts`](https://github.com/paritytech/festival/blob/main/packages/shared/contracts/write.ts) — Revive dry-run, account mapping, batch submit

Not applicable to current Capture hybrid path (extension / guest / Supabase).

---

## Related docs

| Doc | Use when |
| --- | --- |
| [path-to-fully-native.md](./path-to-fully-native.md) | G0–G8 definitions, dual-track posture |
| [native-execution-playbook.md](./native-execution-playbook.md) | Agent routing, Programme A vs B |
| [capture-layer-build-plan.md](./cursor-brainstorm-jun-16-2026/capture-layer-build-plan.md) | Track 1 Capture phases |
| [safety-boundaries.md](./safety-boundaries.md) | Confirm gate, non-custody |
