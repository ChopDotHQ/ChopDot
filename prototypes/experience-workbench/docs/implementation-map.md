# Prototype → Production Implementation Map

This map keeps approved product intent separate from the current implementation while showing where future engineering work belongs.

| Journey | Current GitHub target | State |
|---|---|---|
| 01 Enter ChopDot | `src/components/screens/AuthScreen.tsx`, auth/context modules | Existing; UX review needed |
| 02 Home / Orientation | `src/components/screens/PotsHome.tsx` | Golden V1.4 approved; production redesign not implemented |
| 03 Create a Group | `src/components/screens/CreatePot.tsx`, `src/routing/screen-props/misc-screens.tsx`, `src/hooks/useBusinessActions.ts` | Existing screen; simplify UX while retaining useful create service |
| 04 Join / Invite | Invite service/flow, acceptance modal, member add | Mechanics exist; UX not approved |
| 05 Add Expense | add-expense route/components | Existing; UX not approved |
| 06 Review / Correct Expense | expense detail/edit flows | Existing; UX not approved |
| 07 Confirm / Agree | checkpoint/attestation/confirmation areas | Partial; coherent journey needed |
| 08 Understand a Group | `PotHome` + Expenses/Savings/Members/Settings | Existing; UX not approved |
| 09 Manage People | `PeopleHome`, people/member-detail components | Existing |
| 10 Overall Position | Home + People balance summaries | Existing; mixed-currency product rule open |
| 11–12 Settlement | settlement selection/home/confirmation/history/transaction state | Existing/partial real-chain behavior; UX not approved |
| 13 Request Money | `RequestPayment` | Existing |
| 14 Receive Money | receive/QR/payment method components | Existing |
| 15 Settlement History | settlement history components | Existing |
| 16–17 Savings | savings tab/contribution/withdraw flows | Existing |
| 18 Activity & Notifications | `ActivityHome`, notification center | Existing |
| 19 Insights | insights screen | Existing |
| 20 Payment Methods | payment method screens | Existing |
| 21 Wallet & Crypto | wallet connection/account/Polkadot components | Existing |
| 22 QR | QR scan/show/receive components | Existing |
| 23 Import | import-pot flow | Existing |
| 24 Export | export/CSV utilities | Existing |
| 25 Storage / Recovery | Crust/IPFS/storage modules | Existing/experimental |
| 26 Group Lifecycle | settings/archive/leave/delete actions | Existing |
| 27 Account & Preferences | You/settings/security areas | Existing |
| 28 Recovery | error boundaries, offline/sync, transaction errors | Partial; design per journey |

## Implementation rule

Do not hand Codex a broad “redesign ChopDot” instruction. For each journey, provide the exact Design Approved prototype, journey spec, shared patterns, decisions, edge cases, and target production files. Preserve already-Golden journeys unless a deliberate dependency requires change.
