# Agent Wallet Journey Model

Status: `active`
Date: 2026-06-22
Programme: `B` product-readiness + payment evidence

## Purpose

Use disposable agent wallets and real user journeys to stress-test ChopDot as a group-money product:

```text
people -> wallets -> payment movement -> ChopDot state -> receipt -> closeout
```

The point is not to admire transactions. The point is to see whether normal users can finish the job:

- who owes;
- who paid;
- who received;
- what is still blocked;
- whether the pot can close;
- what record can be trusted later.

## Correct Working Model

The old shorthand `payment evidence is evidence only` is too blunt.

The better rule is:

```text
weak evidence -> claim
strong received evidence -> clear the payment leg
all mode rules resolved -> close the pot / round / period
```

| Signal | Product state | Meaning |
| --- | --- | --- |
| User clicks `Mark paid` | `claimed` | Someone says they paid. |
| Receiver clicks `Confirm received` | `received` / `cleared` | Money arrived according to the recipient. |
| Rail proves expected recipient + amount received | `received` / `cleared` | Money arrived according to strong rail evidence. |
| Escrow deposit exists | `held` | Value is locked/held, but not received. |
| Escrow release proves expected recipient + amount | `released` / `cleared` | Released value reached the intended recipient. |
| Failed / rejected / timed out payment | `failed` | Do not silently progress. |

Closeout is not another group vote. Closeout is the result of scenario rules being satisfied:

- all required payment legs are cleared;
- required approvals are complete;
- required delays/exceptions are annotated;
- no required dispute remains unresolved;
- receipt/privacy rules are satisfied.

## Agent Wallet Trial

Generate a trial packet:

```bash
npm run trial:agent-wallets -- --session agent-wallet-trial-YYYY-MM-DD --base-url http://127.0.0.1:5173
```

This creates:

- public profiles: `artifacts/agent-wallet-trials/<session>/profiles.public.json`;
- funding report: `artifacts/agent-wallet-trials/<session>/funding-report.json`;
- run sheet: `artifacts/agent-wallet-trials/<session>/run-sheet.md`;
- private disposable keys: `.local-private/agent-wallet-trials/<session>/wallets.private.json`.

The default run is dry-run/non-writing. To top up wallets from a funded disposable testnet operator key:

```bash
POLKADOT_HUB_TESTNET_PRIVATE_KEY=<funded-disposable-key> \
  npm run trial:agent-wallets -- --session agent-wallet-trial-YYYY-MM-DD --fund
```

If faucet funding is manual, use the public addresses in the run sheet and fund them with testnet PAS. The faucet path may require human action because of rate limits or CAPTCHA.

After wallets are funded, run the public-testnet PAS movement pass:

```bash
npm run trial:agent-wallets:pas -- --session agent-wallet-trial-YYYY-MM-DD --execute
```

This creates:

- `artifacts/agent-wallet-trials/<session>/pas-scenario-report.json`;
- `artifacts/agent-wallet-trials/<session>/pas-scenario-report.md`.

The PAS movement pass sends small public-testnet amounts between the saved agent wallets and records finalized tx hashes, block numbers, and product interpretation for each scenario. It does not create escrow or custody.

To replay those funded movements inside the actual ChopDot pot surface, run:

```bash
npx playwright test tests/e2e/agent-wallet-pas-scenarios.spec.ts --project=chromium --workers=1
```

Current result:

```text
5 passed
```

That browser check imports the PAS scenario report through the local trial endpoint, replays signed ChopDot session events, shows `PAS evidence applied` in Activity, closes the group expense, savings circle, emergency pot, and community fund records, and verifies the emergency receipt stays redacted.

## Scenarios

| Scenario | People | What the trial must prove |
| --- | --- | --- |
| Group expense | Leo, Nina, Mina | Payment movement clears only the right legs; the split closes when all legs clear. |
| Savings circle | Leo, Nina, Omar, Mina | Contributions clear, one delay can be annotated, payout release clears, round closes. |
| Emergency pot | Casey, Riley, Taylor, Jordan | Private support clears without leaking sensitive details; approval/release/receipt order is understandable. |
| Community fund | Sam, Alex, Priya, Jordan | Contributions, approvals, release, receipt, and handoff close without one person skipping the rules. |

## Stress Tests

The same agent-wallet model should test:

- wrong person tries to pay for someone else;
- wrong person tries to approve;
- finalized transaction has wrong recipient;
- finalized transaction has wrong amount;
- escrow is held but not released;
- release happens but recipient proof is missing;
- duplicate tx/replay arrives;
- failed payment appears after a claim;
- emergency receipt tries to leak sensitive text or payment refs;
- closeout is attempted while blockers remain.

## Done Means

For a scenario to count as product evidence:

- each agent opens from its own browser profile/device;
- each wallet address is mapped to one person;
- payment movement or failed movement is visible;
- strong received evidence clears the correct leg;
- weak evidence does not silently clear;
- closeout waits only for real unresolved rules, not unnecessary ceremony;
- screenshots, tx hashes, receipts, and participant observations are saved;
- the user can explain what happened without stack language.

## Current Boundary

This is public-testnet and local-product evidence. It is not production custody, real-value escrow, legal settlement, or full host-native proof.

The strongest next claim we can earn is:

```text
ChopDot can coordinate real users with disposable testnet wallets through realistic group-money journeys, while preserving clear user states and safe closeout behavior.
```
