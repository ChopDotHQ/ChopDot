# ChopDot — Product Truth

**This file is short on purpose.** It holds only what stays true regardless of
stack, host, chain, or roadmap. If something can be revisited without ChopDot
losing its meaning, it does not belong here — it belongs in a dated decision or
a scaffolding doc.

Everything else in this repo — `AGENTS.md`, `.cursor/rules/`, ADRs, wiki pages,
`docs/chopdot-dot/` — is **evidence, decisions, or operating scaffolding**, not
law. Cite those with a date. Expect them to conflict; they are a year of
thinking at different moments.

---

## 1. Money states are distinct, and only the receiver closes the loop

```
claimed  ≠  received/cleared  ≠  approved/released  ≠  closed
```

- Sending a request does not reduce the receiver's net position.
- A payer saying they paid does not reduce the receiver's net position.
- Manual or external payments **always** require receiver confirmation.
- The single exception: a finalized transfer that exactly matches payer,
  receiver, amount, currency and chain may confirm **that exact item** — and
  nothing else.
- Finishing a group saves a readable summary without rewriting money truth.

This is the invariant. Everything ChopDot claims to be rests on it. A version
that lets a payer unilaterally mark a debt settled is a different product.

## 2. The user never meets the plumbing

Normal UI shows no adapter, protocol, host, native, proof, chain, SDK, or
state-machine language. The founder's phrasing: *solve a lot without
complicating it for them.*

## 3. ChopDot is not reducible to one surface

Not closeout-only, not proof-only, not chain-first, not one prototype, not one
mode. It is one engine serving many money cultures — trips, circles, emergency
pots, community funds, couple expenses, and more. Any framing that collapses it
to a single use case or a single ecosystem is a narrowing to push back on.

## 4. The chain is a rail, never the substrate

Chain-agnostic by intent. Payments settle in stablecoins, tokens, or whatever
method a group already uses. Any plan that makes ChopDot depend on one chain to
function contradicts the product.

## 5. Truth is the signed event log, held by participants

Authority comes from signatures, not from a server, a host, or a chain. A
carrier can delay, drop, or read — it can never forge. What persists is the
record on participants' devices; delivery is catch-up and is replaceable.

---

## Explicitly NOT product truth

These are open questions. They have been written as rules in the past. They are
not.

| Question | Status |
|---|---|
| **Custody / escrow** | Open. "No custody" was a v1 scope fence against overbuilding, not a principle. If money cultures need enforcement, it deserves re-examination on its merits — it is a business and regulatory decision. |
| **Which rail first** | Open. Decided by what real groups actually use. |
| **Which wedge — trips or money cultures** | Not a binary. One mode-aware engine serves both; they differ in recruiting, stakes and rails. |
| **Polkadot-native programme (G0–G8)** | Open. Serves the lowest-ranked user value; `.dot` is one door. |
| **Which "source of truth" system wins** | Unresolved. `docs/adr/`, `docs/wiki/`, `product/`, and `.knowns/tasks` all claim it. |

---

## How to hold every other document

| Kind | Treat as |
|---|---|
| **Measurement** | true when taken — re-measure before relying on it |
| **Decision** | revocable; needs a date and a reason |
| **Guardrail** | a scope fence for a moment, not a law |
| **Exploration** | thinking, not commitment |

Full reasoning record:
`docs/CHOPDOT_STACK_AND_DELIVERY_UNRAVELLING_2026-07-28.md`
