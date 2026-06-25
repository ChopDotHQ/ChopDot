# Competitor App Research Lane

Status: `active-research`
Date: 2026-06-23
Loop owner: `product-spine`
Supporting loops: `money-behavior`, `ux-shape`, `commitment-kernel`
Evidence level: `E1 public-source review`

## Plain-English Summary

ChopDot already had competitor fragments, especially around Splitwise and the pay-moment capture wedge. It did not have a current, systematic competitor lane.

This lane exists to prevent another build pass based only on our own assumptions.

Important correction: this is **baseline research**, not the product ceiling. The first versions of ChopDot already had these apps and null workflows in mind. The purpose of this lane is to establish what ChopDot must not lose to while the product thesis aims higher: a 10x group-money loop across Catch, Management, Payout, and History. See [chopdot-10x-experience-thesis-2026-06-23.md](./chopdot-10x-experience-thesis-2026-06-23.md).

The research question is:

```text
Where do existing splitting/payment apps make group money easier than ChopDot, and where does ChopDot have a real chance to be better?
```

The answer is not "build every feature competitors have" or "match Splitwise." The answer is to decide what ChopDot must copy, avoid, or beat so it can deliver the larger loop across:

```text
Catch -> Management -> Payout -> History
```

## Scope

This is an E1 review packet. It uses public product pages, app-store descriptions, and official support pages. It is not yet a hands-on app-install walkthrough.

Promotion to E2 requires at least one real-device walkthrough for the top competitors in the target scenario.

## Source Quality

| Source class | Used for | Boundary |
| --- | --- | --- |
| Official product site | Current positioning and stated features | Does not prove actual UX quality |
| App Store / Play Store listing | Platform feature claims and user-facing copy | Reviews are anecdotal unless separately sampled |
| Official help/support pages | Exact flow steps and status language | May vary by country or app version |
| Third-party articles | Discovery only | Not adoption proof |
| Reddit/forums | User pain discovery only | Not source-of-truth feature evidence |

## Competitor Set

| Competitor / null | Category | Publicly stated job | Strongest signal | ChopDot threat | ChopDot opportunity |
| --- | --- | --- | --- | --- | --- |
| Chat + calculator + payment app | Strongest null | Fast informal split and direct payment | Zero onboarding; already where friends coordinate | Beats any app that adds ceremony | ChopDot must reduce later chasing, confusion, or record loss enough to justify opening it |
| Spreadsheet / Notes | Strongest null | Shared manual accounting | Flexible and free | Beats ChopDot if groups need custom tables more than a guided product | ChopDot can win on mobile action, payment handoff, and closeout |
| Splitwise | Expense tracker | Track shared expenses, balances, groups, and settle up | Mature mental model for "who owes who" | It is the default comparison for trips and roommates | ChopDot must not be worse at basic group expense visibility |
| Tricount | Expense tracker | Split and settle group bills, especially trips | Lightweight travel/roommate positioning; free/unlimited claim | Could beat ChopDot on speed and simplicity | ChopDot can win on confirmation, closeout, and payment evidence |
| Settle Up | Expense tracker | Track group expenses and IOUs | Group sync, visibility, travellers/flatmates | Strong "simple enough" alternative | ChopDot must prove it adds trust, not admin |
| Splid | Offline/travel tracker | Enter expenses, multi-currency, offline or synced groups | 150+ currencies and offline travel posture | Very strong for Zurich-to-Italy style travel | ChopDot should not fight offline-first travel unless it adds pay/confirm/history value |
| Splittr | Travel/expense tracker | Add expenses as you go; know who is next to pay and who owes | Simple trip/household framing | Good at "keep it easy" | ChopDot can learn from "who is next to pay" language |
| Kittysplit | Web-first split tracker | No registration; link-based group expense splitting | Anonymous web link, no password, no app needed | Very strong against heavy onboarding | ChopDot must make no-account participation credible |
| Splyt | Restaurant receipt splitter | Upload receipt, friends pick items, reimburse via Venmo/Cash App | Checkout receipt capture, no app needed for friends | Directly attacks ChopDot's dinner split/pay-moment wedge | ChopDot should copy receipt-first friend picking where it reduces friction |
| Cino | Shared payment/card split | Split and pay at the same time | No one fronts the bill; bank/card link | Strongest attack on "front bill then chase" | ChopDot should treat pay-at-source as a future adapter pattern, not rebuild banking |
| Venmo Groups | Payment rail + group expenses | Add group expenses, split into payments due, pay or mark external payment | Payment and group ledger in one familiar rail | US users may not need ChopDot for simple reimbursements | ChopDot can win on cross-rail, non-US, receipts, privacy, and closeout |
| Revolut Group Bills | Bank/payment app | Split card transactions or custom bills; reminders | Native transaction selection + reminders | Bank-native split is lower friction for Revolut groups | ChopDot must win when the group is not all in one bank |
| TWINT Request/Split | Swiss payment rail | Request money and split payments from transaction/home flow | Switzerland-native, direct, trusted, reminders | For Swiss users, payment request may be enough | ChopDot should integrate with or complement TWINT-style request flows, not replace them |
| Wise bill split | Payment/account app | Split a paid bill with chosen amounts | Useful international account context | Good for cross-border money movement | ChopDot can layer group state and closeout over rail-specific split requests |

## Source Index

Primary source refs used in this E1 packet:

- Splitwise product site: https://www.splitwise.com/
- Splitwise Google Play listing: https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile
- Splitwise receipt scan support thread: https://feedback.splitwise.com/forums/162446-general/status/711916
- Tricount product site: https://tricount.com/en-us/
- Tricount Google Play listing: https://play.google.com/store/apps/details?id=com.tribab.tricount.android
- Settle Up product site: https://settleup.io/
- Settle Up App Store listing: https://apps.apple.com/us/app/settle-up-group-expenses/id737534985
- Splid product site: https://splid.app/
- Splid App Store listing: https://apps.apple.com/us/app/splid-split-group-bills/id991473495
- Splittr product site: https://splittr.io/
- Splittr App Store listing: https://apps.apple.com/us/app/splittr-expense-splitting/id588332804
- Kittysplit product site: https://kittysplit.com/
- Kittysplit app launch note: https://blog.kittysplit.com/mobile-app-release/
- Splyt product site: https://www.splyt.co/
- Splyt Google Play listing: https://play.google.com/store/apps/details?id=com.app.splytpay
- Venmo Groups expense support: https://help.venmo.com/cs/articles/managing-expenses-for-venmo-groups-vhel173
- Venmo purchase splitting support: https://help.venmo.com/cs/articles/splitting-sharing-purchases-vhel189
- Venmo settle-up support: https://help.venmo.com/cs/articles/settling-up-group-expenses-vhel192
- Revolut Group Bills support: https://help.revolut.com/en-US/help/transfers/internal-transfers/groups/
- Revolut Group Bills launch note: https://www.revolut.com/blog/post/save-friendships-with-group-bills/
- TWINT send/request/split page: https://www.twint.ch/en/private-customers/payment/send-and-request-money/
- TWINT restaurant bill split page: https://www.twint.ch/en/private-customers/payment/catering-trade/
- Wise bill split article: https://wise.com/ie/blog/how-to-split-bill-at-restaurant
- Cino product site: https://www.getcino.com/
- Cino App Store listing: https://apps.apple.com/de/app/cino-split-bills-instantly/id6443988744

2026-06-23 refresh refs used for the implementation pass:

- Splyt Google Play listing: https://play.google.com/store/apps/details?id=com.app.splytpay
- Splyt product site: https://www.splyt.co/
- Splitwise product site: https://www.splitwise.com/
- Splitwise Google Play listing: https://play.google.com/store/apps/details?id=com.Splitwise.SplitwiseMobile
- Tricount product site: https://tricount.com/en-us/
- Kittysplit product site: https://kittysplit.com/
- TWINT send/request/split page: https://www.twint.ch/en/private-customers/payment/send-and-request-money/

Refresh read:

- Splyt remains the direct pressure point for receipt-first capture and no-app payback.
- Kittysplit remains the clearest no-registration benchmark.
- Splitwise and Tricount remain the basic group ledger/trip floor.
- TWINT remains the Swiss rail null: ChopDot should help the group record, not fight the payment habit.

## What The Market Is Really Teaching

The market clusters into four patterns. These patterns define the floor:

| Pattern | Apps | What users get | Product warning for ChopDot |
| --- | --- | --- | --- |
| Post-hoc ledger | Splitwise, Tricount, Settle Up, Splid, Splittr, Kittysplit | Enter expenses, see who owes who, settle later | If ChopDot only tracks balances, it loses to maturity and habit |
| Receipt-at-checkout | Splyt, Splitwise Pro, itemized restaurant tools | Photo receipt, item selection, exact shares | If ChopDot cannot reduce receipt entry friction, dinner split is weak |
| Rail-native split | Venmo, Revolut, TWINT, Wise | Payment/request inside a payment app | If the group shares one rail, ChopDot must add more than a payment request |
| Pay-at-source | Cino, shared-card models | Split and pay at the same time | This is the cleanest user model, but also the highest regulatory/partner burden |

The 10x opportunity is the missing connective layer:

```text
pay/receipt/chat/rail event
-> group state
-> right next action
-> rail-specific payout evidence
-> confirmation
-> trusted closeout
```

If ChopDot only matches one column in the market, it loses. If it connects the whole loop with less friction and more trust, it has a reason to exist.

## ChopDot Spine Check

Spine check:

- Pillar(s): Catch, Management, Payout, History
- Friction reduced: prevents us from rebuilding known competitor flows blindly; identifies checkout capture and no-account participation as priority friction.
- Trust increased: forces direct comparison on status, confirmation, closeout, privacy, and return-to-record.
- Future optionality: lets payment rails and Polkadot-native adapters remain replaceable while product decisions stay user-led.
- Main risk / falsifier: if hands-on E2 walkthroughs show users prefer Splitwise/Tricount/Splyt/TWINT for the whole job, ChopDot must narrow.
- Verdict: keep lane active as the floor; use the 10x thesis as the build target.

## E2 Research Protocol

For each top competitor, run the same scenario:

1. Create the group or event.
2. Add or capture a real-looking expense.
3. Invite a friend who has not used the app.
4. Make the friend find their own action.
5. Mark, request, or perform payment.
6. Confirm or record what happened.
7. Return one week later and understand the final state.

Record:

- setup time;
- number of screens before first useful state;
- whether a no-app friend can participate;
- whether receipt capture works;
- whether payment and confirmation are distinct;
- whether late/missed payment is supported without social blame;
- whether closeout/export is clear;
- what ChopDot should copy, reject, or beat.
