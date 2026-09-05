# Portable Capture Live Host Proof

## Decision

`PASS` for the portable capture-truth journey on the live Paseo `.dot` host and
the live HTTPS Telegram host profile.

This is Programme A product portability evidence. It is not proof of live
Product Account login, live Statement Store convergence, or a real Telegram
client session.

## Source And Deployments

- source commit: `07936cde23a4de5aa1779c17616897021792a41c`
- `.dot` domain: `chopdot-shell-proof.dot`
- `.dot` gateway:
  `https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`
- `.dot` CID: `bafybeigpwh2lbozdsxp6hddiw7f562kylhsxo7s6pltrrqxf47jlcpwhty`
- `.dot` deploy tag: `chopdot-portable-capture-truth-07936cd`
- web/Telegram alias: `https://portable-shell-trial.vercel.app`
- web/Telegram deployment:
  `https://portable-shell-trial-d6vd4j1g8-devinsons-projects-b5ab981e.vercel.app`

## Product Gate

- User journey: Mina enters one spend, reviews the split, sends each friend one
  payment action, confirms what arrived, and returns to a settled group.
- One next action: `Review split`.
- Friction: `3/3`.
- Trust: `3/3`.
- Clarity: `3/3`.
- Language: `1/1`.
- Total: `10/10 PASS`.

The normal capture UI exposes amount and merchant/reason directly. It does not
show receipt import, OCR, filename, extraction, protocol, host, or proof
language. `ReviewSplit` remains the only normal screen that saves the spend.

## Live `.dot` Result

- command:
  `PROOF_URL=https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway PROOF_OUT=proof/portable-shell-dot-host npm run proof:dot-host`
- report: `proof/portable-shell-dot-host/report.json`
- result: `passed: true`
- screenshots: `22`
- storage: persisted app state present after reload
- final product result: Weekend Trip settled; net position `$0.00`
- console: three host-owned iframe sandbox warnings; no journey assertion
  failure

Visual review confirmed:

1. Add spend shows total and merchant/reason with one bottom action.
2. Review split shows `$120` as `$40` each for Mina, Leo, and Nina.
3. Payer and receiver actions remain separate.
4. Group summary shows all three members settled.
5. Reload returns to the settled group.

## Live Telegram-Profile Result

- command:
  `PROOF_URL=https://portable-shell-trial.vercel.app?tgWebAppStartParam=portable-proof PROOF_OUT=proof/portable-shell-telegram-live npm run proof:telegram`
- report: `proof/portable-shell-telegram-live/report.json`
- result: `passed: true`
- screenshots: `24`
- standalone payer packet: passed
- Telegram host seam calls: `ready`, `expand`, header/background color,
  BackButton, and CloudStorage
- storage: persisted app state present after reload
- final product result: Weekend Trip settled; net position `$0.00`

This is a live HTTPS deployment exercised with the Telegram host profile. It is
not a manual proof inside the real Telegram mobile client.

## Known Limitation

The focused amount/title frame in the automated `.dot` packet can show a
temporary black host-owned area above the app. The app form and bottom action
remain usable, and normal host chrome returns on the review screen. This is a
visible host viewport/chrome polish item.

## Documentation Impact

- Updated `HOSTS.md`, `proof/host-matrix.json`, and
  `PORTABLE_SHELL_TRIAL.md` because live deployment evidence changed.
- Updated the capture correction plan with a live-proof addendum.
- No `docs/wiki/` or ADR update is required: the product state model,
  authority boundary, and architecture decision did not change.

## Remaining Gates

- Complete a real Polkadot Product Account login when a runnable mobile client
  is available.
- Run the Telegram flow manually in the real mobile client.
- Remove or document the host-owned focused-input chrome transition before
  launch-ready visual status.
