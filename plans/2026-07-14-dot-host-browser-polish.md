# Self Prompt: Dot Host Browser Polish

Change: `dot-host-browser-polish-v1`

Programme: A - portable shell host proof

Approved product contract: `P-022 Regular pot end-to-end coherence`

## Current Truth To Preserve

- The portable shell already completes the same group-money journey on web,
  Telegram, and the Paseo `.dot` host.
- Request sent, marked paid, confirmed received, settled, finished, and saved
  remain distinct states.
- Main ChopDot is not merged into this portable-shell worktree.
- The normal UI does not explain Polkadot or host infrastructure.

## User Journey

> I am Mina, I need to review and safely edit a shared spend, so the group can
> settle without me losing work or seeing prototype language.

One next action: `Review split`

Product gate: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Scope In

- Preserve the amount and title when Mina returns from Review Split to Add Spend.
- Remove internal prototype language from Leo and Nina's payer view.
- Render a zero open balance as a successful settled state.
- Build, run the portable-shell proof, and click the journey in a real browser.

## Scope Out

- No reducer or payment-state semantic changes.
- No main ChopDot merge.
- No new payment methods, wallet work, native-chain UX, or cross-device sync.
- No signed `.dot` redeploy without explicit human approval at action time.

## Requirements

1. The Add Spend draft SHALL survive Back from Review Split.
2. The payer view SHALL show the preferred payment method in normal user language.
3. The payer view SHALL NOT expose prototype, host, proof, adapter, protocol,
   native, or `.dot` language.
4. A saved record with zero open SHALL read as successful, not warning.
5. Payment request, mark-paid, confirmation, closeout, and summary semantics
   SHALL remain unchanged.

## Scenarios

GIVEN Mina entered 120 and Dinner
WHEN she reviews the split and presses Back
THEN Add Spend SHALL still show 120 and Dinner.

GIVEN Leo opens his payment request
WHEN he reads the payment instructions
THEN he SHALL see one normal payment-method sentence and no prototype language.

GIVEN Mina confirmed every required payment
WHEN she saves the group summary
THEN zero open SHALL render as `All settled` with success styling.

## Proof

- `npm run lint`
- `npm run build`
- portable-shell proof on a local preview
- visible Browser journey through Back, payer view, closeout, history, and reload
- live `.dot` retest only after the updated bundle is explicitly redeployed
- failed proof runs persist a redacted machine-readable `report.json`

## Stop Conditions

- Stop if the patch changes payment semantics.
- Stop if it adds a screen, card, explanation panel, or technical language.
- Stop if the updated UI cannot be verified through visible controls.

## Execution Result

Status: local proof passed; live Paseo bundle not redeployed.

- `npm run lint`: passed.
- `npm run build`: passed.
- Web proof: passed with 24 screenshots, persisted state, and zero console errors.
- Telegram proof: passed with 24 screenshots, persisted state, and zero console errors.
- Back from Review Split restored `120` and `Dinner at Gusto`.
- The payer view used one normal instruction and contained no prototype language.
- The completed group summary rendered `All settled` and `$0.00`.

The live `.dot` URL still serves the previously deployed bundle. A signed
redeploy and live Browser replay require explicit human approval.
