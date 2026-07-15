# Dot Host Browser Polish Proof

Change: `dot-host-browser-polish-v1`

Programme: A - portable shell host proof

Status: local and live `.dot` proof passed

## Result

The portable shell kept the existing money semantics and corrected three
visible product problems:

1. Back from Review Split keeps the spend amount and title.
2. The payer screen contains one payment instruction and no prototype language.
3. A saved group with no open money reads `All settled` with success styling.

## Verification

| Check | Result |
| --- | --- |
| Type check | Passed |
| Production build | Passed |
| Web journey | Passed, 24 screenshots |
| Telegram journey | Passed, 24 screenshots |
| Paseo `.dot` journey | Passed, 22 screenshots |
| Persisted state | Present in web, Telegram, and `.dot` profiles |
| `.dot` reload persistence | Passed |
| Console errors | None; host emitted three generic iframe sandbox warnings |
| Final group state | Settled, `$0.00` open |

## Screenshot Evidence

- `proof/portable-shell-web/10-add-spend-after-back.png`
- `proof/portable-shell-web/16-payment-request.png`
- `proof/portable-shell-web/22-group-summary.png`
- `proof/portable-shell-web/report.json`
- `proof/portable-shell-telegram/report.json`
- `proof/portable-shell-dot-host/10-add-spend-after-back.png`
- `proof/portable-shell-dot-host/14-payment-request.png`
- `proof/portable-shell-dot-host/20-group-summary.png`
- `proof/portable-shell-dot-host/22-after-refresh-persisted.png`
- `proof/portable-shell-dot-host/report.json`

## Boundary

The corrected bundle was deployed to the existing throwaway Paseo name on
2026-07-14 using `polkadot-app-deploy@0.11.0` and the CLI's documented testnet
worker/pool fallback. Mobile login was not required for this existing worker-
owned name.

- domain: `chopdot-shell-proof.dot`
- CID: `bafybeicku5kap7gsdjwhdbcpi3lekfdz4uycvxtdapwppv5sbqchucpqc4`
- storage finalization tx: `0xf0682d07a7f4a6c0faf56ffdb793552d6b8faa71f2e8b2f02d4c79288aef6ab7`
- contenthash tx: `0x16384f4fdbd1cc6f1edcc59c59f1fab8ffff2c02b622cbad30839bd028508914`

Storage, DotNS linking, chain finality, on-chain contenthash verification, and
P2P retrieval all completed. The CLI then returned exit `78` because it found
the main repo's deploy config for `chopdotws01.dot` while attempting optional
manifest/text-record publishing. That config mismatch did not roll back or
invalidate the completed portable-shell deployment.

## Live Browser Retry

The corrected deployed bundle was replayed through the visible Paseo host and
the automated live proof using only normal app controls. Mina created a fresh
three-person group, recorded a `$120` spend, requested both payments, confirmed
both receipts, finished the group, opened the saved summary, and reloaded the
host.

Passed on the corrected deployment:

- group creation and spend recording;
- two payment requests;
- payer mark-paid actions;
- Mina's receipt confirmations;
- group finish and saved summary;
- local state restored after host reload.
- Back from Review Split preserved the amount and title;
- payer UI contained no prototype wording;
- the final saved summary displayed `All settled` and green `$0.00`.

Documentation impact: no wiki or ADR update is required. This is a bounded
portable-shell interaction correction with unchanged product and payment-state
policy. The change plan and this proof report are the durable records.
