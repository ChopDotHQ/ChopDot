# Mobile Telegram Step Count

Date: 2026-07-07
Environment: Telegram mobile client
Bot: @ChopDotMiniAppBot
Mini App URL: https://portable-shell-trial.vercel.app
Validation source: user-reported manual phone run

## Result

PASS for mobile viability.

The app opened and the normal group-money journey worked in Telegram mobile.
The user reported that the journey is still redundant and not fully complete as
a finished product experience.

## Counting Rules

This document counts user-visible actions, not internal reducer events.

Counted as steps:

- taps;
- typing into a field;
- reviewing a confirmation screen when the user must decide to continue;
- closing/reopening the Mini App for persistence proof.

Not counted as steps:

- automatic state updates;
- animation/transitions;
- passive screen rendering.

## Current Validated Path: Finish With One Open Balance

This is the path already used in the proof scripts and Telegram Desktop/mobile
validation. It proves that a group can be finished even while Nina remains open.

Total: 28 user-visible steps.

| # | Person | Screen | Action | Required result |
|---:|---|---|---|---|
| 1 | Mina | Telegram chat | Open `@ChopDotMiniAppBot` | Bot chat is visible |
| 2 | Mina | Telegram chat | Tap `Open ChopDot` | Mini App opens in Telegram |
| 3 | Mina | Welcome | Tap `Continue as guest` | Guest setup opens |
| 4 | Mina | Guest setup | Accept or edit suggested name | Name field has Mina/user name |
| 5 | Mina | Guest setup | Tap `Continue as Mina` | Home opens |
| 6 | Mina | Home | Tap `Start with a group` or `New` | Create Group opens |
| 7 | Mina | Create Group | Type `Weekend Trip` | Group name is ready |
| 8 | Mina | Create Group | Type `Leo` | Friend input is ready |
| 9 | Mina | Create Group | Tap `Add` | Leo appears in members list |
| 10 | Mina | Create Group | Type `Nina` | Friend input is ready |
| 11 | Mina | Create Group | Tap `Add` | Nina appears in members list |
| 12 | Mina | Create Group | Tap `Create group` | Group detail opens |
| 13 | Mina | Group Detail | Tap `Add spend` | Add Spend opens |
| 14 | Mina | Add Spend | Type `120` | Amount is set |
| 15 | Mina | Add Spend | Type `Dinner at Gusto` | Spend title is set |
| 16 | Mina | Add Spend | Tap `Review split` | Review Split opens |
| 17 | Mina | Review Split | Review equal split | Mina/Leo/Nina show `$40.00` each |
| 18 | Mina | Review Split | Tap `Save spend` | Group Detail shows open balances |
| 19 | Mina | Group Detail | Tap `Settle up` | Settle Up opens |
| 20 | Mina | Settle Up | Tap `Send link to Leo` | Leo becomes `Request sent`; Mina net stays `+$80.00` |
| 21 | Mina | Settle Up | Tap back | Group Detail opens |
| 22 | Leo | Group Detail | Tap `View request` for Leo | Payment request opens |
| 23 | Leo | Payment request | Tap `I paid Mina` | Leo becomes `Needs confirm`; Mina net stays `+$80.00` |
| 24 | Mina | Group Detail | Tap `Confirm received from Leo` | Leo settles; Mina net becomes `+$40.00` |
| 25 | Mina | Group Detail | Tap `Finish group` | Finish Group opens with `$40.00` still open warning |
| 26 | Mina | Finish Group | Tap `Finish and save summary` | Group Summary opens |
| 27 | Mina | Group Summary | Review summary | Total `$120.00`; open `$40.00`; Leo settled; Nina owes |
| 28 | Mina | Group Summary | Tap `Done` | Home/History is reachable with persisted group summary |

## Complete Settled Path: Everyone Pays Before Finish

This is the path the product should support when the group is truly finished
with no open balances.

Total: 35 user-visible steps.

Steps 1-24 match the current validated path above.

| # | Person | Screen | Action | Required result |
|---:|---|---|---|---|
| 25 | Mina | Group Detail | Tap `Settle up` | Settle Up opens for Nina |
| 26 | Mina | Settle Up | Tap `Send link to Nina` | Nina becomes `Request sent`; Mina net stays `+$40.00` |
| 27 | Mina | Settle Up | Tap back | Group Detail opens |
| 28 | Nina | Group Detail | Tap `View request` for Nina | Payment request opens |
| 29 | Nina | Payment request | Tap `I paid Mina` | Nina becomes `Needs confirm`; Mina net stays `+$40.00` |
| 30 | Mina | Group Detail | Tap `Confirm received from Nina` | Nina settles; Mina net becomes `$0.00` |
| 31 | Mina | Group Detail | Tap `Finish group` | Finish Group opens as settled |
| 32 | Mina | Finish Group | Review closure | Screen should say everyone is settled |
| 33 | Mina | Finish Group | Tap `Finish and save summary` | Group Summary opens |
| 34 | Mina | Group Summary | Review summary | Total `$120.00`; still open `$0.00`; everyone settled |
| 35 | Mina | Group Summary | Tap `Done` | Home/History is reachable with settled summary |

## Persistence Proof Extension

Add these steps when validating host persistence:

| # | Person | Screen | Action | Required result |
|---:|---|---|---|---|
| +1 | Mina | Telegram Mini App | Close the Mini App | Telegram chat returns |
| +2 | Mina | Telegram chat | Tap `Open ChopDot` | Mini App reopens |
| +3 | Mina | Home/History | Confirm persisted state | Same user, group, balances, friends, and summary remain |

With persistence proof, the current open-balance path is 31 steps.
With persistence proof, the complete settled path is 38 steps.

## Redundancy / Friction Observed

1. Group creation asks Mina to manually type each friend even though Telegram can
   eventually provide chat or share context.
2. The current request flow makes Mina enter `Settle up`, send one link, go back,
   then use `View request` from the organizer device to simulate the payer.
3. `View request` is a prototype bridge. In a real product, Leo/Nina should open
   their own link/device state directly.
4. The organizer has to repeat the same send/request/paid/confirm sequence for
   each member.
5. Finish is allowed while money is still open, which is useful, but the product
   needs clearer separation between `finish with open items` and `finish fully
   settled`.
6. The app records a summary only at the end; users should not need to think
   about saving a record. The summary should feel automatic after finishing.

## Product Interpretation

The current shell proves the state spine works, but the journey is too long for
a real launch-quality product.

The next product improvement should reduce the open-balance path from about 28
steps to roughly 18-20 by:

- making group creation use contacts/invites more naturally;
- making `Settle up` send all required requests from one screen;
- removing organizer-device payer simulation from normal UI;
- making `Finish group` automatically produce the summary after a single clear
  review;
- showing a group status that distinguishes `open`, `waiting`, `needs confirm`,
  and `ready to finish` without forcing extra navigation.

