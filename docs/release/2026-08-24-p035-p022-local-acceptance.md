# P-035 and P-022 local acceptance

**Kind:** measurement
**Status:** historical
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** dated local measurement for commit 79f93166 only; DEC-009, DEC-010, current Cockpit cards, and current exact-candidate evidence govern present acceptance
**Observed:** 2026-08-24
**Candidate commit:** `79f93166f29073f9d549159d5ef345e38346b3b9`
**Scope:** local exact-worktree acceptance only; not commit, candidate, stage,
promotion, live usability, ownership, user proof, or KGv2 recall evidence

## Behavior observed at that commit

- Empty Home presented one dominant **Scan a receipt** action and one secondary
  **New group** action. That universal Home acceptance is superseded by
  DEC-009 and DEC-010; retain this bullet as historical evidence, not current
  P-022 UX acceptance.
- **Create my group** obtains exact runtime account readiness before proposing
  canonical `CREATE_GROUP`; contact proof, wallet state, and personhood are not
  authority.
- The draft uses one stable draft ID and candidate group ID across retry and
  full reload. Its tab-local owner rotates when local app data is cleared, so a
  later person cannot inherit the private name or identifiers. A group becomes
  visible only after canonical readback accepts
  the exact participant, account, name, mode, organizer role, and single active
  initial member.
- Product Account capabilities remain detached until the exact local identity
  migration is accepted. A cancelled request or occupied identity keeps the
  draft local and attaches no signer, group-key, delivery, recovery, organizer,
  or removal capability.
- Account or authority failure keeps the name and offers one plain-language
  retry without exposing Product Account, host, adapter, chain, personhood, or
  protocol terminology.
- All seven modes remain reachable inside New group.
- The desktop shell expands to 720 pixels at the 1440-pixel release viewport;
  320, 375, 390, 1280, and 1440 checks have no horizontal overflow or
  undersized interactive target in the audited first-use surfaces.

## Verification executed

All commands ran from
`/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS, zero diagnostics |
| `npm run build` | PASS, 3,032 modules; bundle-size warnings only |
| `node --import tsx --test src/environment/productionAccountAuthorityRuntime.test.ts src/membership/groupCreationEntryService.test.ts src/membership/groupCreationSessionDraft.test.ts` | 15/15 PASS |
| `node --import tsx --test src/membership/*.test.ts` | 101/101 PASS |
| `npx playwright test tests/first-use-group-ui.spec.ts --config=playwright.release.config.ts` | 5/5 PASS |
| `npx playwright test tests/named-mode-production-entrypoint.spec.ts --config=playwright.release.config.ts --workers=1` | 7/7 PASS |
| `npx playwright test tests/named-mode-multi-account-production-entrypoint.spec.ts --config=playwright.release.config.ts --workers=1 --grep "savings organizer\|Spend Card separate-account"` | 2/2 PASS |
| `npx playwright test tests/receipt-first-product-surface.spec.ts tests/ui-assurance-release.spec.ts tests/candidate-batch2-router-retirement.spec.ts --config=playwright.release.config.ts --workers=1` | 15/15 PASS |
| `npm run test:node` | 347/347 PASS |
| `npm run security:baseline` | PASS, 198 files checked |
| `npm run security:runtime-boundary` | PASS, shipped import graph contains none of the accepted public-testnet-only CLI advisory packages |
| `npm run test:release-browser` | 79/79 PASS in 2.1 minutes |

The final release-suite result came from one stable tree with no source or test
changes during collection or execution. Earlier diagnostic runs were not used
as acceptance evidence.

## Screenshot review manifest

Raw images are local, reproducible captures. Their hashes make the exact
reviewed bytes identifiable without rewriting historical candidate proof.

| Surface | Bytes | SHA-256 |
|---|---:|---|
| `output/playwright/p022-home-after-390.png` | 43,975 | `eb446162d94fdca2b65f892bddaf58d662a28596a1300ca7772e5156bc5ab8da` |
| `output/playwright/p022-home-after-1440.png` | 59,279 | `e64a39559ef6a8d9fd89b23e0bd696d48031e4015cebda1ca333a108cb03fe6a` |
| `output/playwright/p035-new-group-after-390.png` | 33,785 | `92c3af26066ed3317a80bf0338e204bef2ff2f556eb64808cece68ae5b18258e` |
| `output/playwright/p035-new-group-after-1440.png` | 45,813 | `34cbfac7afa8ce51cec430651cd9cdb650f458c694136f8d8bc4aa65e6ad3d38` |
| `output/playwright/p035-retry-after-390.png` | 38,540 | `c4385d80e48d6b21a57bee9920af10080276f55d452a2476325bc8369c4dcd0b` |
| `output/playwright/p035-retry-after-desktop.png` | 51,033 | `173392cca26459cff6ff8a85ccfad834d118d6940f04aa92a927e1a5a30d2ed6` |
| `output/playwright/p035-created-after-mobile.png` | 31,567 | `44a96c7c3448a745d230a11b749ad3eecd86120662ce198f1aa425d64f471fe6` |

Historical visual verdict: GO for local integration at commit `79f93166`.
Mobile and desktop were action-led,
the first action is obvious, New group is calm rather than dashboard-like, and
retry language gives one recovery action. The Empty Home hierarchy conclusion
is now superseded; this does not prove current P-022 acceptance or that the
public `.dot` host has the new bytes.

## Independent repair review

The first independent review found three P1 boundaries: a local completed
stage could be trusted without canonical readback, a global tab draft survived
data reset, and account capabilities attached before identity migration was
accepted. The repaired tree closes all three and adds adversarial tests for
forged completion, owner rotation, cancellation/rejection, and occupied
identity. The second review reported zero remaining P0/P1 implementation
findings; its remaining gate was this evidence refresh, generated-proof cleanup,
and an append-only cockpit checkpoint.

## Remaining gates

- Current category-baseline and contextual-Home acceptance under DEC-009 and
  DEC-010.
- Logical commit and push.
- Deterministic `.dot` candidate build and immutable fingerprint.
- Products Devnet stage, readback, and live first-use verification.
- Byte-identical public-testnet promotion and name ownership readback.
- Real-participant acceptance and exact-worktree KGv2 cited recall.
