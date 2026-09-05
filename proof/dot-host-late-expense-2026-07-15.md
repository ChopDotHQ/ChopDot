# Dot Host Late Expense Recovery Proof

Change: `late-expense-after-request-v1`

Programme: A - portable shell host proof

Status: passed locally and on the live Paseo host

## User Result

Mina can now correct a forgotten expense after she has already sent Leo a
payment request. The first request remains recorded, the added expense stays
separate, and ChopDot makes the next action explicit:

1. `Add expense` remains available while the group is open.
2. The group shows `Request $10.00 more` after the late expense is saved.
3. The settle screen offers `Send updated link` for the full `$15.00` still due.
4. Leo sees `$15.00`, the chosen payment method, and `I paid Mina`.
5. PAS requests keep the wallet payment action instead of the manual action.

## Deployment

- URL: `https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`
- domain: `chopdot-shell-proof.dot`
- environment: `paseo-next-v2`
- CID: `bafybeiehgkzuyejf5gllweyavsfpfm2rfxdeu4vooh3ukmt3wyhjoxrp7q`
- storage finalization tx: `0xbc588640612b6d58be64202bd0a71ed6a4a94dddd2ca854d60dad67ef58f93c7`
- contenthash tx: `0xc29df4233a04a8248664498823d20eb4a4c6a8bc389d86c27d6af083b8842276`
- app contenthash tx: `0x508158545f80d5f578bdf00bac29c8600408d8a7ddb611e67a1cb3cbc75098e2`

The deploy used the portable worktree's explicit config. Storage, finality,
on-chain contenthash verification, P2P retrieval, root manifest, app content,
and executable records all completed successfully.

## Verification

| Check | Result |
| --- | --- |
| Type check | Passed |
| Late-expense reducer regression | Passed |
| Late-expense browser journey | Passed |
| Five-person real-UI host journey | Passed |
| Production build | Passed |
| Live recovery click-through | Passed |
| Full live hosted journey | Passed, 22 screenshots |
| Reload persistence | Passed |
| Live browser errors | None |

## Evidence

- `proof/late-expense-live-2026-07-15/01-request-sent-add-expense-visible.png`
- `proof/late-expense-live-2026-07-15/02-late-expense-review.png`
- `proof/late-expense-live-2026-07-15/03-request-more-live.png`
- `proof/late-expense-live-2026-07-15/04-updated-link-copied.png`
- `proof/late-expense-live-2026-07-15/05-payer-sees-updated-total.png`
- `proof/portable-shell-dot-host/report.json`
- `proof/portable-shell-dot-host/01-first-run.png` through
  `proof/portable-shell-dot-host/22-after-refresh-persisted.png`

## Boundaries

- The direct external payer-link query still is not forwarded through the host
  wrapper; the live proof uses the in-app `View request` path.
- Real PAS wallet proof remains covered by the separate five-person wallet
  packet. This recovery proof did not create another faucet transaction.
- Product Account login still needs a runnable Polkadot Mobile client.
- The host continues to emit its known generic cross-origin iframe sandbox
  warning; the app emitted no errors during this proof.

Documentation impact: `HOSTS.md`, the host matrix, this proof report, and the
change plan were updated. No wiki or ADR update is required because the product
truth and architectural policy did not change.
