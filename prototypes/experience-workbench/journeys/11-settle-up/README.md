# Journey 11 — Settle Up

**Status:** V1 Golden Candidate / Review pending

The full clickable prototype is preserved as:

`v1-golden-candidate.html.gz.b64`

Restore it with:

```bash
base64 --decode v1-golden-candidate.html.gz.b64 | gzip -d > v1-golden-candidate.html
```

Then open `v1-golden-candidate.html` in a browser.

## Core path

`Overall Position → Settle with a person → Confirm amount and method → Review payment → Start payment → Journey 12`

## Boundary

Journey 11 chooses who, currency, scope, amount, and method.

Journey 12 owns payment progress, external-app return, confirmation, failure, proof, and updated balances.

## Candidate principles

- One person, currency, and amount per settlement.
- Full payment by default; partial payment is deliberate.
- Preferred available method appears first.
- External payments are never presented as automatically complete.
- Wallet payments keep the original balance as source of truth.
- No `normal` versus `smart` infrastructure modes in the UI.
- Open issues block only the affected settlement.
