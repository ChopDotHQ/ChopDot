# J-007 Wallet Payment Currency Checks

## User Story

"I am Leo, I owe Mina from Friday Crew, so I need to pay her with the wallet currency I actually have and have ChopDot clear only the matching share."

## One Next Action

Check payment

## Screenshots

The following packet is historical lab output. It demonstrates proposed UI
states, not completed DOT or real-USDC wallet settlement:

- DOT payment link: `artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/01-dot-pay-with-wallet.png`
- DOT payment received: `artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/02-dot-payment-received.png`
- USDC wrong currency: `artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/03-usdc-wrong-currency.png`
- USDC wallet needs funds: `artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/04-usdc-wallet-needs-funds.png`
- Screen/text/state review: `artifacts/chopdot-p024-wallet-payment/2026-06-30/p024-wallet-payment-1782830349578/p024-wallet-payment-review.json`
- Historical wallet report: `artifacts/agent-wallet-trials/agent-wallet-trial-2026-06-22/wallet-scenario-report.md`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| DOT pay link | Pay Mina | 0.02 DOT to Mina | Check payment | Pay with DOT, copy details | Matching payment clears Leo's share |
| DOT received | Pay Mina | Payment received | You are done | Mina has this share | Nina's share stays open |
| USDC wrong currency | Pay Mina | Wrong currency | Check payment | Use USDC for this payment | Nothing clears |
| USDC needs funds | Pay Mina | Wallet needs funds | Check payment | Add funds, then check again | Nothing clears |

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS for the proposed user journey; implementation promotion is blocked

## Visual Quality Gate

- Hierarchy: 1/1
- Spacing: 1/1
- Typography: 1/1
- Shape system: 1/1
- Color discipline: 1/1
- Copy tightness: 1/1
- State timing: 1/1
- Mobile fit: 1/1
- Desktop fit: 0/1
- Comparative bar: 1/1
- Total: 9/10
- Decision: PASS

## Findings

- The screenshots show a compact proposed DOT/USDC friend flow, but the payment
  source was a prewritten report rather than a wallet action observed live.
- DOT was fixture-shaped. TEST_USDC used a mock token. Neither result can clear
  the current promotion gate.
- The main app no longer serves or consumes the saved report endpoint.
- PAS now has separate connected-wallet proof. That result cannot be reused to
  promote DOT or USDC.

## Fixes

- [x] Added P-024 and DC-024 for wallet currency checks.
- [x] Preserved the historical screenshots as design research.
- [x] Added wrong-currency and wallet-needs-funds states.
- [x] Removed the saved-report runtime endpoint and its automatic import path.
- [ ] Trigger a real DOT transfer from the friend UI and observe it directly.
- [ ] Trigger a real testnet USDC transfer from the friend UI and observe the
  token transfer directly.
- [ ] Repeat the five-person convergence check for each promoted currency.

## Decision

Ship decision: DEFER

Reason: the user journey is sound, but the existing DOT and USDC packet is
fixture/mock-backed. P-024 remains discovery/partial until both currencies pass
the connected-wallet, direct-observation, five-person standard proven for PAS.
