# J-006 PAS Test Wallet Payment

## User Story

"I am Leo, I owe Mina from Friday Crew, so I need to pay her from a funded test wallet and have ChopDot clear only my share."

## One Next Action

Pay Mina

## Screenshots

- Leo pay link: `artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/01-leo-pay-with-pas.png`
- Payment received: `artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/02-leo-payment-received.png`
- Payment not found: `artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/03-payment-not-found.png`
- Screen/text/state review: `artifacts/chopdot-p023-pas-payment/2026-06-30/p023-pas-payment-1782824214315/p023-pas-payment-review.json`
- Public-testnet transfer report: `artifacts/agent-wallet-trials/agent-wallet-trial-2026-06-22/pas-scenario-report.md`
- Five-person wallet proof: `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/report.md`
- Leo ready to pay: `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/05-1-ready-to-pay-leo.png`
- Leo payment received: `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/06-1-payment-received-leo.png`
- Final group summary: `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/08-final-group-summary-mina.png`

## Wireframe Read

| Screen | Title | Status | Primary action | Secondary info | Next state |
| --- | --- | --- | --- | --- | --- |
| Leo pay link | Pay Mina | 0.01 PAS to Mina | Pay Mina | Recipient and exact amount | Matching payment clears Leo's share |
| Payment received | Pay Mina | Mina has this share | You are done | Payment method remains visible | Nina's share stays open |
| Payment not found | Pay Mina | Payment not found yet | Check payment | Wallet payment may still be finishing | Nothing clears |

## Product Gate

- Friction: 3/3
- Trust: 3/3
- Clarity: 3/3
- Language: 1/1
- Total: 10/10
- Decision: PASS

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

- The first implementation cleared the matching share but then the pay page fell back to "Leg not found or already settled" because completed legs were filtered out of the open-status list. The pay page now keeps the completed item visible.
- The first screenshot duplicated "Payment received" in both the screen and a toast. The toast was removed; the state now lives in the page.
- The visible screen does not include the forbidden internal terms from the product language gate.
- Only Leo's matching PAS share is confirmed. Nina's PAS share remains open.
- A mismatched PAS amount shows "Payment not found yet" and does not clear the item.
- This proves public-testnet PAS movement can support exact-share clearing in the product flow. It does not prove production custody, live `.dot` readiness, DOT mainnet, USDC, bridging, or FX conversion.

## Fixes

- [x] Added P-023 and DC-023 for the PAS test wallet payment slice.
- [x] Added PAS/DOT/USDC currency support in the pot schema and migration layer.
- [x] Added a public-testnet PAS transfer matcher.
- [x] Replaced the report-backed check with a visible EIP-1193 `Pay Mina`
  action that signs a real transfer and checks it directly through public RPC.
- [x] Removed the main-app developer endpoint and automatic report-import path
  so a saved artifact can no longer stand in for a wallet payment.
- [x] Cleared only the exact matching leg.
- [x] Preserved the completed payment item in the pay page after clearing.
- [x] Removed duplicated success toast.
- [x] Captured screenshots and state review.
- [x] Captured a mismatched-payment screenshot.

## Decision

Ship decision: PASS

Reason: Leo can use the real friend-link UI to initiate a wallet-signed
public-testnet PAS payment. ChopDot independently matches payer, Mina, amount,
chain, and finalized status, then clears only Leo's matching share without
exposing internal infrastructure language. The five-person packet is at
`.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/`.
