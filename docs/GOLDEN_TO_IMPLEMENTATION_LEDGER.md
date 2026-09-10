# Golden → Production Acceptance Ledger

## Purpose

This ledger is the implementation bridge between the human-approved ChopDot Experience Workbench Goldens and executable product code.

It is **not** a new UX authority. Product truth remains the approval/checksum authorities on `ux/experience-workbench`, especially:

- `prototypes/experience-workbench/registry/goldens.manifest.json`
- `prototypes/experience-workbench/registry/golden-artifact-locks.json`
- the corresponding approved journey specs / decision histories / approval records

Never copy an unapproved candidate into production truth. Journey 20 is now approved as Golden #20 at its locked checksum. Journey 21 and later remain out of implementation scope until an exact candidate receives explicit human approval and is frozen through the canonical Golden process.

## Runtime status vocabulary

- `UNMAPPED` — production ownership/evidence has not yet been proven from the repository.
- `FIXTURE` — a prototype/demo/static path exists but is not the production implementation.
- `IMPLEMENTED` — executable product behavior exists and has repository evidence, but LIVE environment evidence is not established here.
- `LIVE` — executable behavior plus current environment evidence establishes the production/testnet/live claim being made.

## Release status vocabulary

- `NOT STARTED` — no implementation acceptance has been completed for this Golden.
- `INTEGRATING` — at least one bounded implementation slice is in progress.
- `VERIFIED` — mapped implementation has exact-head acceptance evidence for the approved scope.
- `BLOCKED` — a concrete architecture/security/product-truth conflict prevents faithful implementation.

## Integration rules

1. Start from an approved Golden entry in the generated manifest and verify the exact checksum before implementation.
2. Read the approved journey spec, state inventory, edge cases, decision history, adjacent Golden boundaries, and relevant production architecture/security contracts.
3. Map the actual production UI/component owner and data/backend/on-chain owner from code. Do not guess.
4. Identify any prototype fixture/demo behavior and the real interface that replaces it. `FIXTURE` is never equivalent to `IMPLEMENTED` or `LIVE`.
5. Advance one bounded vertical slice at a time and bind acceptance evidence to the exact implementation commit.
6. Preserve failure/recovery behavior and privacy/authority boundaries from the approved Golden and production security architecture.
7. If production architecture cannot implement the Golden faithfully, mark the row `BLOCKED` and record the exact conflict in issue #38. Do not silently redesign either side.
8. Never edit an approved Golden artifact from this branch. Never merge a protected branch or deploy without explicit human approval.

## Approved Golden inventory

All 20 current human-approved Goldens are initialized below. The first mapping pass deliberately began at the P0 entry/core-create surfaces. Where executable source proves a legacy behavior but it conflicts with the approved Golden, runtime status is `IMPLEMENTED` and release status is `BLOCKED`: existing code is evidence of implementation, not evidence of Golden conformance.

| Golden | Journey | Approved artifact | SHA-256 | Customer behavior | Production UI/component owner | Data/backend/on-chain owner | Runtime status | Real interface replacing fixture | Acceptance evidence | Failure / recovery | Migration implications | Release status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | J02 — Home / Orientation v1.4 | `journeys/02-home-orientation/v1.4-golden.html` | `578ff52775d7205b7f2262676f322807849e2f5788f219dc9eacbb9e5d3aec2f` | Attention-first/group-first Home; overall position; compact wallet context; group state + next action; contextual add; bottom navigation | `src/components/Home.tsx`; `src/components/homePresentation.ts`; router shell in `src/App.tsx` | `AppStateContext` / state store-derived balances and group state | IMPLEMENTED | Existing React Home is the production surface, not a fixture | Bounded first-use slice at `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d`: empty Home keeps `New group` as the single useful action and suppresses the receipt shortcut; unit coverage in `src/components/homePresentation.test.ts`. Exact-head hosted application fast/browser assurance is required before this slice can be called verified | Empty first-use state now has one intentional action; caught-up/offline/loading and full recovery semantics remain pending | Full approved hierarchy still needs overall position, compact wallet and attention/context reconciliation without regressing the now-singular first-use action | INTEGRATING |
| 2 | J03 — Create a Group v2 | `journeys/03-create-group/v2-golden.html` | `683267a9f474a48b9df4278256dc3b51f92e4c2cd5ff7076e5f0af013400804d` | Name first; visible preselected currency; create; explicit success; then Invite people / Add expense | `src/components/CreateGroup.tsx`; `src/App.tsx#createSharedGroup` | `src/membership/groupCreationEntryService.ts`; production authority through `runAuthority` | IMPLEMENTED | `GroupCreationEntryService` + production authority replace prototype persistence | Existing group-creation service/tests; Golden-conformance test pending | Current component preserves name on failures; approved explicit success and currency behavior not proven | Current mode-selection/data model must be reconciled with Golden currency-first contract | BLOCKED |
| 3 | J04 — Invite / Join a Group v1 | `journeys/04-invite-join/v1-golden.html` | `143f6702e64f608729a79cbd9baf74d087492dc40e8275a46698633ae36c8725` | People-first invite; pre-join preview only group name/inviter/people count/currency; explicit Join / Not now; expenses private until join | UI owner still to map; transport is `src/requestLinks.ts` | URL-carried `GroupInvitePacket`; validation in `parseGroupInvite`; tests in `src/groupInvite.test.ts` | IMPLEMENTED | Current URL packet is executable transport, but no privacy-safe replacement interface is proven | `npm run test:group-invite` covers packet integrity/expiry/tamper semantics, not Golden privacy | Expiry is validated; offline/already-joined UI still to map | Current packet serializes expense descriptions/amounts/splits before membership. A privacy-safe post-consent retrieval/relay boundary is required before faithful integration | BLOCKED |
| 4 | J08 — Group Home v1 | `journeys/08-group-home/v1-golden.html` | `7bd47a9ea9987a2bc0e5912b99cddbfe0fea3f1b16d85aa76d76e919747cecf7` | Map from approved J08 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 5 | J05 — Add an Expense v1 | `journeys/05-add-expense/v1-golden.html` | `1aa7c723f60ada46d739c33749690ea493c8a2121cf85b3f1678a3798d638b23` | Common path leads with amount + description; visible editable payer/participants/split/date/receipt defaults; no separate common-path review screen; explicit success | `src/components/CaptureSpend.tsx` plus downstream `ReviewSplit` route | App state / money event and authority path downstream of capture/review | IMPLEMENTED | Existing capture/review React flow is production code, not a fixture | Existing capture/payment tests do not establish Golden conformance | Receipt read failure exists; approved duplicate/offline/save/settlement-lock preservation still to map | Current default is receipt-first and routes through a separate review step, conflicting with approved fast common path | BLOCKED |
| 6 | J06 — Review / Correct an Expense v1.1 | `journeys/06-review-correct-expense/v1.1-golden.html` | `aece70448ae1979f6a0bf3abfc46affc75da2c1540cb91dbeda32efc8722b55c` | Map from approved J06 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 7 | J07 — Review / Agree / Raise an Issue v1.1 | `journeys/07-review-agree/v1.1-golden.html` | `90c11c09125dc8ba8a7d97530b33b7fff685b3a4fd0979992acf3910736db3ce` | Map from approved J07 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 8 | J10 — Overall Position v1 | `journeys/10-overall-position/v1-golden.html` | `418dee449aa76ed027ea7de520f930f63ebaeb349c0f46735c390a43294d7c98` | Map from approved J10 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 9 | J11 — Settle Up v1.1 | `journeys/11-settle-up/v1.1-golden-candidate.html` | `d02c550f73d2f3844dd117ebd3062a19808e8100fdf8ebb0a98c3d353f84147d` | Map from approved J11 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 10 | J12 — Complete Settlement v1.1 | `journeys/12-complete-settlement/v1.1-continuity-candidate.html` | `2198cde482ec1ab1d2285cdea218492b410bb071bb8916e470f40d4e629d3e4d` | Map from approved J12 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 11 | J01 — Enter ChopDot v1 | `journeys/01-enter-chopdot/v1-candidate.html` | `383170c06d4e6bc4d6b658664fff6ae0f2eb003cf202ca5e8f8617fb06ae8f46` | Email-code default entry; optional wallet; retain Home/invite intent; verified auth only; signing in never joins or authorizes payment | `src/components/Welcome.tsx`; entry routing/product-account composition in `src/App.tsx` | Current Product Account dependency and local app identity; no email-code auth provider implementation mapped | IMPLEMENTED | Existing product-account/guest entry is executable, but it is not the approved authentication experience | Existing app/runtime checks only; Golden auth/replay/destination-permission evidence absent | Current account-connect failure has retry/alternate entry; Golden code expiry/wrong identity/wallet cancellation semantics not implemented here | Requires a real verification/provider boundary; cannot fake Golden email-code semantics in client code | BLOCKED |
| 12 | J09 — Manage People v1 | `journeys/09-manage-people/v1-candidate.html` | `715077633a17cf37ef587988c0aee7f4906403a030d8e0d17d1b0c46aa6cb37d` | Map from approved J09 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 13 | J13 — Request Money v1 | `journeys/13-request-money/v1-candidate.html` | `a22664499c4056d95a6cdeb45df85d43fd2055713e80ae8f69020469aa9bb707` | Map from approved J13 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 14 | J14 — Receive / Share Payment Details v1 | `journeys/14-receive-money/v1-candidate.html` | `5ce877d89157a4203a2e4a2c5fad795a4ecfabf5388dbaecb00bbf28f2f31e1d` | Map from approved J14 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 15 | J15 — Settlement History v1 | `journeys/15-settlement-history/v1-recovered.html` | `0915e060314e06471d5039e735dca4f2e708940f3a33f2a5890b8758671584e0` | Map from approved J15 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 16 | J16 — Savings Group v1.2 | `journeys/16-savings-group/v1.2-review-candidate.html` | `dc920000fc4120accab588413ee79095093f8e4223066d7d3a94fb524e5cd0de` | Map from approved J16 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 17 | J17 — Contribute / Withdraw Savings v1.4 | `journeys/17-savings-contribute-withdraw/v1.4-review-candidate.html` | `a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915` | Map from approved J17 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 18 | J18 — Activity & Notifications v1.1 | `journeys/18-activity-notifications/v1.1-continuity-candidate.html` | `d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e` | Map from approved J18 spec before implementation | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Map from approved edge cases | TO VERIFY | NOT STARTED |
| 19 | J19 — Insights v1.1 | `journeys/19-insights/review-v1.1/v1.1-candidate.html` | `c67973e0efc1068d006d57c4d5690b6c49218bd63f24cb62ab587fbf5b9862da` | Read-only insight patterns over authorized evidence; exact implementation mapping pending | UNMAPPED | UNMAPPED | UNMAPPED | TO VERIFY | Golden approval + checksum; production proof pending | Preserve incomplete/offline/evidence-threshold behavior from approved J19 contract | TO VERIFY | NOT STARTED |
| 20 | J20 — Payment Methods v1 | `journeys/20-payment-methods/review-v1/v1-candidate.html` | `02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab` | Owner-managed bank/TWINT/PayPal/crypto receiving destinations; masked overview; compatibility-scoped preference; saved destination never becomes transfer/signing authority; exact-version edit/remove semantics | No equivalent Payment Methods UI exists on the `codex/chopdot-v1-launch` integration target. A legacy `src/components/screens/PaymentMethods.tsx` exists on protected `main`, but it is not present on this release baseline and is not copied as authority | Release data shape currently exposes `PaymentMethod {id,userId,type,details}`, `AppState.paymentMethods`, and one global `preferredPaymentMethod` in `src/types.ts`; no versioned destination/provider interface is mapped | UNMAPPED | A production owner-only destination service/store with versioning, compatibility-scoped preference and authorized disclosure handoffs must replace the prototype fixture; wallet signing remains J21/downstream | Golden approval/checksum proven from canonical manifest/spec. No implementation evidence on target release branch yet | Preserve save/remove pending/unknown/failure recovery-before-retry; stale old-share invalidation; offline write block; access/session change; never store wallet/provider secrets | Current release model is too weak for typed/versioned destinations and scoped preference. Legacy `main` screen edits raw fields directly, uses one global preference, and says details are shown to pot members, conflicting with J20 privacy/authority. Issue #38 also records a post-freeze empty-state defect in the immutable Golden; do not copy that missing Journey-local Add action as product behavior | NOT STARTED |

## Mapping pass 1 — foundational conflicts

Release baseline inspected: protected `codex/chopdot-v1-launch` at `dd2a1b16913f2524e81e58e585139d457deac1dc`.

Five P0/entry surfaces were compared against their exact approved contracts before any runtime rewrite:

- **J02 Home:** production `Home.tsx` is groups-first and does not implement the approved overall-position + compact-wallet hierarchy. A partial visual patch would risk producing a hybrid contract.
- **J03 Create Group:** production `CreateGroup.tsx` asks for group mode/type; the Golden requires visible preselected currency and explicit post-create success. This needs a deliberate model/UI reconciliation, not a copy-only patch.
- **J04 Invite / Join:** the Golden explicitly keeps expense details private until membership. `buildGroupInviteUrl()` currently serializes expense descriptions, amounts and split records into the pre-join URL packet, and `src/groupInvite.test.ts` asserts that round trip. This is a hard privacy/product-contract conflict. Removing those fields without a post-consent retrieval path would break the current cross-device bootstrap, so do not hot-fix it locally.
- **J05 Add Expense:** production `CaptureSpend.tsx` is receipt-first and proceeds into a review route. Golden J05 makes amount + description the common path and explicitly excludes a separate common-path review page.
- **J01 Enter ChopDot:** production Welcome/Product Account/guest entry does not implement the approved email-code default or its verified-provider/replay/intent-retention semantics. Those semantics belong behind a real auth/provider boundary, not a simulated client patch.

## Integration pass 2 — J02 first-use Home action

The highest-priority bounded unblocked increment found inside the already mapped J02/P-022 Home surface was the first-use action rule: the approved Home contract centers one useful next action when no groups exist, while production rendered both `New group` and a separate receipt-capture shortcut.

Implementation commit `db09f8eb8853b3a7ed4ec55b9a3e89e8fc09978d` advances only that slice:

- `Home.tsx` now renders the receipt shortcut only for a returning Home presentation.
- Empty Home retains the existing `New group` primary action and therefore exposes one intentional first-use path.
- `homePresentation.ts` owns the deterministic gating rule via `shouldShowHomeReceiptShortcut()`.
- `homePresentation.test.ts` covers both empty and returning behavior.

This does **not** claim full J02 Golden conformance or P-022 acceptance. Overall-position, compact-wallet, full attention/caught-up/offline/loading behavior and broader hierarchy remain open. The slice does not change money authority, chain execution, privacy boundaries, persistence, Golden HTML, or protected branches.

## J20 authority sync

Canonical UX now contains 20 Goldens. J20 is included only because explicit human approval and the locked checksum are present in the generated Golden manifest/spec. The canonical Golden bytes remain immutable. The known post-freeze empty-state Add-method defect is tracked as an implementation exception in issue #38; it is not permission to mutate the Golden or to invent a broader J20 redesign.
