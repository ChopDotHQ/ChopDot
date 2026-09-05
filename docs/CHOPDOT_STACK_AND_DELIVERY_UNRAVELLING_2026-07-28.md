# ChopDot — Stack & Delivery Unravelling (record)

**Date:** 2026-07-28
**Status:** record of reasoning, not a decision document
**Trigger:** Polkadot Products Devnet launched 2026-07-23

## Why this exists

A two-day session that started as "check this Devnet announcement" turned into
an unravelling of what ChopDot is building on and why. Several conclusions
reversed multiple times. This records the measurements (durable), the
corrections (so they are not re-made), the conflicts found in our own corpus,
and the reframing that came out of it.

Read this before restarting the "what stack / what chain" conversation.

---

## 1. Hard measurements — the durable part

Measured against installed SDKs and live endpoints on 2026-07-27/28.

### Product SDK statement store
```
MAX_STATEMENT_SIZE  = 512   bytes per statement
MAX_USER_TOTAL      = 1024  bytes TOTAL per user
DEFAULT_TTL_SECONDS = 30
channel             = last-write-wins ("only the most recent kept")
```
SDK's own channel examples: `presence/peer-abc123`, `handshake/alice-bob`.
**Conclusion: the statement store is a signalling channel, not an event log.**
1 KB/user = ~3 concurrent `MARK_PAID` events, or 2 `RECORD_MATCHED_PAYMENT`.

### Product SDK host
Every capability returns `null` outside a host container — accounts, signing,
payments, chat, theme, statement store. **Conclusion: Polkadot Products cannot
be a cross-ecosystem substrate. It is one door with a rich interior.**

### Bulletin / cloud storage
Content-addressed only (`store(data)`, `queryJson(cid)`) — no named keys, no
mutable pointers. Writes require a live on-chain authorization granting finite,
expiring transactions and bytes. Our own 2026-07-07 deploy log:
`Storage signer: pool fallback (no session)` — a shared pre-authorised pool
account wrote, not our address. Platform docs: publishers are expected to
handle storage on behalf of users. Retention ~14 days (per path §10).

### Devnet environments
`polkadot-app-deploy@0.13.1 --list-environments` → `paseo-next-v2`, `devnet`.
`summit` is gone. This answers path §11 open question #10 (was: "confirmed
testnet-only… only paseo-next-v2 + summit"). Still testnet.

### Asset Hub EVM
`eth_chainId` on the devnet RPC returns `0x190f1b41` = **420420417**, matching
documented devnet EVM chain ID. `pasWallet.ts` already speaks
`eth_getTransactionByHash` to it. **Polkadot is reachable through an EVM
interface.**

### Payload sizing (compact vs current envelope, encrypted + base64)
| Action | current | compact |
|---|---|---|
| `MARK_PAID` | 540 ✗ | 268 ✓ |
| `CONFIRM_RECEIVED` | 559 ✗ | 268 ✓ |
| `SEND_REQUEST` | 600 ✗ | 288 ✓ |
| `RECORD_MATCHED_PAYMENT` | 1047 ✗ | 444 ✓ |
| `ADD_EXPENSE` (3 people) | 1488 ✗ | 506 ✓ |
| `ADD_EXPENSE` (6 people) | 2206 ✗ | 658 ✗ |

### Codebase scale
| | Main app | Portable shell |
|---|---|---|
| Source LOC | 52,916 | 5,791 |
| Files | 348 | 43 |
| Screens/views | 31 | 18 |
| Settlement path | ~7,260 (incl. ~1,100 backend) | 1,436 |
| Build output | 15 MB (13 MB is 5 PNGs) | 476 KB |

The shell delivers ~58% of screens in ~11% of the code.

### Live surfaces (2026-07-28)
- `portable-shell-trial.vercel.app` — **HTTP 200**, live
- `chopdot-shell-proof.paseo.li` — wrapper 200, **app assets fail to load**
- `chopdot-smoke07.paseo.li` — static smoke page
- Vercel `chop-dot` — 20 deployments, all preview, all behind SSO (302)
- Outbound HTTPS **works** from inside the `.dot` host frame; no CSP header served

---

## 2. Corrections made

| Claimed | Actual |
|---|---|
| CLAUDE.md: "No blockchain/wallet/CRDT/IPFS — must not return" | Stale by 2 months; ~300 KB of live Polkadot code. Line replaced. |
| CLAUDE.md: 42 tests | 166 (120 frontend + 46 backend). 89 chopdot-dot tests were excluded from `vitest.config.ts` and never ran. |
| CLAUDE.md: shell is agnostic across "Telegram, Gnosis, web, .dot" | **Gnosis is a deferred payment rail, not a host.** Hosts are Web/Telegram/Dot. |
| ".dot deploy gate never fired" | 5 deploys exist: `chopdotxx00` (6-17), `chopdotws01` ×2 (6-18), `smoke07` (7-07), `shell-proof` (7-14) |
| "The .dot app is broken — network reset" | path §13.2 documents this exact 504/"can't be reached" as known propagation behaviour; `--js-merkle` is documented as broken on the public gateway and smoke07 used it |
| "No public deployment of the portable shell" | `portable-shell-trial.vercel.app` is live and is the required proof target in `HOSTS.md` |
| "Bulletin authorization is a new finding" | Documented with live tx evidence since 2026-06-17 (path §13.1) |
| Design: Bulletin as event log, statement store carrying transitions | Contradicts ADR 0005 + `wiki/05-polkadot-native/bulletin.md` + June stack mapping. Doc marked SUPERSEDED. |

**78 programme docs** (`docs/chopdot-dot/`) and **5 plan files**
(`docs/superpowers/plans/`) were dropped from the working tree by merge
`d86d11b` (2026-06-25). They remain recoverable at `fe9e6ae`. This includes the
master execution plan with § PRODUCT END STATE — the doc `.cursor/rules`
mandates reading **first**.

---

## 3. Conflicts in our own corpus

Not errors — a year of thinking at different moments. Named so they stop
resurfacing as if settled.

1. **Narrow ↔ expand, three times.** May 26: "narrowed to a chat-native group
   money chapter… not pursuing the full commitment kernel; crypto/PVM optional
   rails, not v1 core." June 17: full commitment kernel, five modes,
   Programme A+B native gates. July 14: portable shell, stripping back.
2. **"Non-custody law" ↔ card research.** README forbids card issuing and
   custody in V1; the corpus contains issuer investigations (Rain, Gnosis Pay,
   Baanx, Marqeta) and defers "real Visa/MC with balance" to P3. It was a
   **v1 scope fence**, not a permanent principle.
3. **Server authority.** June 15 replacement matrix: replace Supabase auth,
   move to client-signed commands. July 14 ADR 0004 (`source_of_truth: true`):
   server-derived actor from a Supabase token is the security foundation. The
   later doc hardens what the earlier one plans to remove.
4. **Statement store has three assigned roles** — host capability (ADR 0005),
   highest-priority transport spike (matrix), and "defer, truth stays typed app
   event history" (June mapping). SDK limits say signalling only.
5. **Kernel is both locked and open.** path §0.3 "Option B — locked";
   path §9 decision #0 "which kernel is native — blocks the whole roadmap."
6. **Stale status presented as current.** Status board last verified
   2026-06-23; Identity "blocked on dotns#190" but the 2026-07-07 deploy log
   reads `Your PoP: ProofOfPersonhoodFull`.

### How to hold the corpus

| Kind | How to treat it |
|---|---|
| **Measurement** | true when taken; re-measure |
| **Decision** | revocable; needs date + reason |
| **Guardrail** | scope fence for a moment, not a law |
| **Exploration** | thinking, not commitment |

These are currently formatted identically, and `source_of_truth: true` makes a
one-month snapshot read as permanent.

---

## 4. The reframing

### Three layers, not two

| Layer | What it is | Members |
|---|---|---|
| **Doors** | how people reach the group | Telegram, Web, `.dot`, links, QR |
| **Delivery** | how signed events move | ← the open problem |
| **Authority** | signed envelope + reducer | already built |

Plus **rails** (external money movement) which are separate from all three.
`.dot` sits on the Doors row. Gnosis sits on rails.

### Integrity vs delivery

The corpus treats "no central server" as one requirement. It is two:

- **Integrity** — nobody can forge or rewrite who owes what → comes from
  **signatures**, survives any carrier
- **Availability / censorship** — the record stays reachable → comes from the
  **carrier**, survives nothing
- **Privacy** — comes from **encryption** (G3, currently undesigned)

A relay carrying signed envelopes cannot forge; it can only delay, drop, or
read. **Therefore delivery can be centralised and boring without costing the
trust property.** Link-carried state is the price we were paying for attaching
the trust requirement to the wrong layer.

This also means ADR 0004's server-derived actor is the right fix for *unsigned*
clients. With signed commands the server **verifies** instead of **derives** —
same protection, no authority over money truth.

### What persists

Not the pipe. **The record, held by the participants.** Full signed log on every
device: four people at a dinner table hold the complete verifiable history
offline, forever. Delivery is catch-up, not storage. Permanence comes from
**replaceability of delivery**, not from finding an immortal provider.

---

## 5. Founder vision, as stated 2026-07-28

> Blockchain technology to help everyday people manage commitments globally —
> chain-agnostic, payments in stable currencies, tokens, or their own preferred
> method — built on the world's money cultures (savings groups, money circles,
> trip planning, couple expenses, and beyond). Splitwise for the 21st–22nd
> century, using this wave of adoption to solve a lot without complicating it
> for users.

### What this clarifies

- **"Chain-agnostic" means the chain is a rail, never the substrate.**
  Programme B (make ChopDot Polkadot-native) is in tension with this.
- **Money cultures are the differentiator, not tamper-evident truth.**
  Splitwise structurally cannot serve rotating savings (ROSCA / tanda / susu /
  chit fund) — ordered payouts, rounds, group obligation rather than pairwise
  debt. Our `savings_circle`, `emergency_pot`, `community_fund` modes *are*
  money cultures; the docs currently treat savings circle as a `.dot` demo.
- **Honest ranking of what blockchain buys:** (1) stablecoin settlement across
  borders — the real one; (2) circle mechanics with credible commitment;
  (3) identity/proof-of-personhood as anti-fraud; (4) tamper-evident truth —
  last, and §1A already doubts it is legible to non-crypto users. Most of the
  native programme serves (4); most of the user value is in (1).

### The hard problem the vision creates

Circles involve real defaults. Someone takes the round-3 payout and stops
contributing. Non-custody keeps us out of money-transmission licensing **and**
means we cannot enforce anything. Options are social (visibility, reputation),
structural (small circles, vouching, staged payouts), or custodial (escrow —
the fence we put up). If money cultures are the wedge, that fence deserves
re-examination on its merits, not by citing the README.

---

## 6. Position on the stack question

**Do not pick a chain yet.** The trigger for needing to is: coordination-only
(read receipts, adapter) vs custody/escrow (one contract platform, choice
matters enormously). Everything built so far is the first kind.

**Build EVM-shaped.** One address format, one signing scheme, one RPC
vocabulary, viem/ethers, USDC/USDT liquid at cents per transfer across
Base/Arbitrum/Optimism/Polygon — **and Asset Hub, chain ID 420420417.**
EVM-first *includes* Polkadot rather than excluding it. `pasWallet.ts` is
already built this way.

**On Substrate / JAM:** Substrate is excellent for building a chain. We are not
building a chain. JAM delivers scalability we do not need, on a timeline we do
not control; a consumer app does not get better when it lands. What Parity does
offer concretely: PoP (real anti-fraud value for circles), DotNS, and a host
with native payments — worth having as **one door's interior**, not a
foundation. The Products SDK's own npm description says "prototype… not
audited… actively experimental."

**Two seams held rigidly, everything else pragmatic:**
1. `verifyPayment(chain, txRef) → {payer, receiver, amount, currency, finality}`
   — generalise from `pasWallet.ts`; every rail becomes a plug
2. Delivery adapter for signed envelopes — default to the boring option we run

---

## 7. What is genuinely open

| Question | Why it blocks | What would decide it |
|---|---|---|
| Is the wedge money cultures or trip splits? | changes the product surface and who we sell to | user contact, not docs |
| Coordination-only or custody? | decides whether the chain choice matters at all | business/regulatory appetite |
| Where does the portable shell sit? | it postdates the June plan and appears in no layer | founder intent |
| What currency do the first 10 real groups use? | decides rails empirically | friend pilot |
| Key loss / recovery | could sink a local-first signed-log design | design work; unsolved industry-wide |
| Encryption (G3) | every pipe currently reads group money data | design work |

## 8. What to deprioritise

- Programme B G0–G8 as a programme (1/7 gates; serves value-rank #4)
- `.dot` as strategic centre — it is one door
- Link-carried state as the primary delivery path
- Designing storage architectures before the wedge is decided
- Porting one app into the other — depth and breadth are different axes

## 9. Session artefacts

- `codex/portable-shell-trial` pushed to origin — first time off one laptop.
  3 commits: SDK migration (host 0.11.0→0.14.1, statement-store 0.4.10→0.6.2,
  4 breaking changes), network probe in `capabilityMatrix`, superseded design doc.
- `vitest.config.ts` now includes `src/chopdot-dot/**` — 89 previously-invisible
  tests now run.
- `CLAUDE.md` constraint and test counts corrected.
