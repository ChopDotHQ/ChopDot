# ChopDot 10x Journey Agent Audit

Status: `review-ready`
Generated: 2026-06-24T12:54:28.167Z
Session: `tenx-journey-1782305651792`
Base URL: `http://127.0.0.1:5173`

## Journey Tested

```text
profile entry -> pot home -> I just paid -> receipt/payment capture -> choose how friends pay -> create pay links -> friend marks paid -> receiver confirms
```

## Screenshots

| Step | Screen | File | Note |
| ---: | --- | --- | --- |
| 1 | first entry onboarding | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/01-first-entry-onboarding.png | Mina opens ChopDot cold. |
| 2 | pots home after guest entry | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/02-pots-home-after-guest-entry.png | Mina should understand where the group records live. |
| 3 | pot home i just paid entry | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/03-pot-home-i-just-paid-entry.png | The money-moment entry should be visually obvious. |
| 4 | spend card scan receipt | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/04-spend-card-scan-receipt.png | Mina should see scan receipt as the obvious start action, not a form or tutorial. |
| 5 | receipt captured payment method chosen | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/05-receipt-captured-payment-method-chosen.png | Receipt, people, and how friends pay are in one place. |
| 6 | split created with pay links | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/06-split-created-with-pay-links.png | The group should now have useful shared state. |
| 7 | leo no app pay link | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/07-leo-no-app-pay-link.png | Leo should only see his payment job. |
| 8 | leo waiting for mina confirmation | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/08-leo-waiting-for-mina-confirmation.png | Leo should know he is done for now. |
| 9 | mina confirm received link | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/09-mina-confirm-received-link.png | Mina should see one confirmation task. |
| 10 | mina confirmed one matching share | /Users/devinsonpena/ChopDot/artifacts/chopdot-journey-audits/2026-06-24/tenx-journey-1782305651792/10-mina-confirmed-one-matching-share.png | One confirmation should not pretend the whole pot is closed. |

## Friction Findings

| Area | Rating | What the agent saw | Risk | Optimization |
| --- | ---: | --- | --- | --- |
| Profile setup | 4/5 | Guest entry exists and wallet can stay optional. | If wallet copy is visually louder than guest entry, first-time users may think setup is required. | Keep the first primary action about starting the group record, with wallet below as later setup. |
| Spend Card capture | 4/5 | Capture screen has a clear primary path. | Main risk is whether receipt capture feels automatic enough. | Keep receipt/photo/link capture as the default and hide item editing unless the user chooses to correct details. |
| No-app friend link | 5/5 | Friend link is focused on one job. | The friend must not see organizer controls or audit state. | Keep this screen single-purpose; do not add group dashboard controls here. |
| Receiver confirmation | 5/5 | Confirmation is clearly separated from someone marking paid. | The receiver still needs enough context to know which transfer is being confirmed. | Preserve payer, amount, and reference above the button. |

## Dead Ends / Stale Surfaces

- No runtime dead end in the tested Spend Card/no-app confirmation path.
- Receipt/photo capture is now the primary path. Manual amount and item editing stay behind explicit fallback/correction controls.
- OCR is wired for receipt photos; this audit uses a deterministic receipt fixture so the reconstruction can be tested repeatably.

## Claim Boundary

This is an agent/browser run. It proves the real UI can be driven through the journey and produces screenshots for review. It does not replace real friend-pilot approval, production settlement, or live `.dot` host proof.

