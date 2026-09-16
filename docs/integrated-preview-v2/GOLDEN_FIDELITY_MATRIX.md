# ChopDot Integrated Preview V2 — Golden Fidelity Matrix

This file is the pre-code integration contract. A journey must be represented here before it is integrated into V2.

Canonical base: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`

Legend:
- **Golden source** = canonical approved artifact path/version.
- **Must preserve** = user-visible or semantic properties integration may not silently replace.
- **Shared-state obligations** = state that must survive into adjacent journeys.
- **Gate** = current V2 stage.

## Stage 1 — Entry and orientation

### J01 — Enter ChopDot

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/01-enter-chopdot/v1-candidate.html`
- Spec: `prototypes/experience-workbench/journeys/01-enter-chopdot/spec.md`
- Registry status: v1 / Golden #11 / design-approved

**Must preserve**
- Welcome entry state.
- Email + short sign-in code is the default proposed/approved entry experience.
- New person path: Welcome → Email → Code → Name → Signed in → Home.
- Returning person path: Email → Code → Signed in → Home.
- Invite context survives sign-in and joining remains a separate action.
- Wallet sign-in remains an optional alternate path with waiting/rejected/expired/unknown distinctions.
- Expired session and wrong-identity recovery remain explicit.
- Sign-in never authorizes payment or automatically joins a group.

**Shared-state obligations**
- Stable Participant identity after entry.
- Session state separate from Participant/history identity.
- Pending invite destination survives the entry flow.

**V1 regression to forbid**
- Replacing the journey with a single `Continue as guest` shortcut.

### J02 — Home / Orientation

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/02-home-orientation/v1.4-golden.html`
- Spec: `prototypes/experience-workbench/journeys/02-home-orientation/spec.md`
- Registry status: v1.4 / Golden #1 / design-approved

**Must preserve**
- Hierarchy: shared-money headline → attention → overall position → compact wallet context → groups → contextual add action → bottom navigation.
- Attention-first and group-first; not wallet-first or finance-dashboard-first.
- Semantic line/Lucide iconography; no Unicode/emoji placeholders.
- Fixed header/footer with scrolling center content on mobile.
- Group cards expose human-readable state + meaningful next action.
- First-use, caught-up and offline/stale states remain representable.

**Shared-state obligations**
- Attention derived from actual shared fixture state.
- Group cards link to the same group objects consumed by J08/J05.
- Overall position links to the same read model consumed by J10.

**V1 regression to forbid**
- Generic simplified cards/icons that only approximate the Golden hierarchy.

## Stage 2 — Core expense loop

### J08 — Group Home

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/08-group-home/v1-golden.html`
- Spec: `prototypes/experience-workbench/journeys/08-group-home/spec.md`
- Registry status: v1 / Golden #4 / design-approved

**Must preserve**
- Overview-first, not tab-first.
- Hierarchy: group identity → what needs you → your position → recent activity → People/Settle handoffs → global navigation.
- Invite/settings available from header without becoming primary content.
- Total spend is context, not hero.
- Center Add Expense action remains visible when allowed.
- Empty, nothing-needs-you, settlement-in-progress, everyone-square and offline states remain possible.

**Shared-state obligations**
- Same group/member/expense objects as J05/J06/J07/J10/J11.
- Recent activity is derived from the same objects, not a separate fake fixture.

### J05 — Add an Expense

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/05-add-expense/v1-golden.html`
- Spec: `prototypes/experience-workbench/journeys/05-add-expense/spec.md`
- Registry status: v1 / Golden #5 / design-approved

**Must preserve**
- Common case leads with amount + description.
- Visible editable defaults: payer You; participants Everyone; split Equal; date Today; receipt None.
- Equal / Exact / Shares split paths.
- Payer, participants, date and receipt remain editable.
- Possible duplicate warns without trapping the user.
- Failure states preserve entered details.
- Success shows amount, payer and personal share.
- No separate common-path review page.
- Focused transaction flow does not show global tabs.
- No placeholder icons.

**Shared-state obligations**
- Successful add creates an expense consumed immediately by J08/J06/J07/J10/J18.
- Draft survives allowed recovery/failure paths.

**V1 regression to forbid**
- Title + amount only.
- Automatically routing successful Add Expense into an invented generic review step.

### J06 — Review / Correct an Expense

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/06-review-correct-expense/v1.1-golden.html`
- Spec: `prototypes/experience-workbench/journeys/06-review-correct-expense/spec.md`
- Registry status: v1.1 / Golden #6 / design-approved

**Must preserve**
- Detail readable before editable.
- Hierarchy: amount → name → review/change status → payer/share/date → split → receipt/history → contextual actions.
- Owner/authorized role alone gets Edit/Delete.
- Edit reuses J05 controls with values prefilled.
- Delete is separately confirmed and explains balance impact.
- Other members route to J07 review instead of seeing fake edit controls.
- Sync/conflict states use semantic compare/person/device/check icon treatment.

**Shared-state obligations**
- Edits mutate the same expense created by J05 and shown by J08/J10/J18.
- Delete/review-state changes propagate through the shared read model.

### J07 — Review / Agree / Raise an Issue

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/07-review-agree/v1.1-golden.html`
- Spec: `prototypes/experience-workbench/journeys/07-review-agree/spec.md`
- Registry status: v1.1 / Golden #7 / design-approved

**Must preserve**
- Core language: `Does this look right?`, `Looks right`, `Something's off`, `Not now`.
- Review queue → expense → decision → next/caught-up flow.
- Issue path: reason → optional note → Send → waiting on owner.
- Owner correction belongs to J06; reviewer can reassess update/reply.
- Dispute blocks only dependent payment items, not unrelated balances.

**Shared-state obligations**
- Review/agreement/issue status lives on the same expense lineage used by J06/J10/J11/J18.

## Stage 3 — Position and settlement

### J10 — Overall Position

**Golden source**
- Prototype: registry `journeys/10-overall-position/v1-golden.html` (historical spec also notes compressed source representation).
- Spec: `prototypes/experience-workbench/journeys/10-overall-position/spec.md`
- Registry status: v1 / Golden #8 / design-approved

**Must preserve**
- People is default; Groups is secondary.
- Show net plus gross `you owe` and `owed to you`.
- Person balance exposes group-level source offsets.
- Net only same two people + same currency.
- Different currencies never silently combine.
- Estimated home-currency view, if present, stays optional/labeled and never becomes settlement instruction.
- Unresolved issue marks only affected balance `May change`.
- Settle/Request remain explicit handoffs, not inline execution.

**Shared-state obligations**
- Read-only projection derived from shared expense/review/settlement state.

### J11 — Settle Up

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/11-settle-up/v1.1-golden-candidate.html`
- Spec: `prototypes/experience-workbench/journeys/11-settle-up/spec.md`
- Registry status: v1.1 / Golden #9 / design-approved

**Must preserve**
- Approved interaction model: Review → Method → Amount → Pay.
- Exact payer, recipient, amount, one currency, source groups/items, selected method and final human review.
- Full payment default; partial payment shows amount now + remaining balance.
- Human labels such as Open TWINT / I've sent it / Waiting for Jeanine.
- J11 prepares/authorizes exact scope; it never claims receipt/closure.
- Wallet approval request is not authorization.
- Duplicate/timeout behavior stays bound to original idempotent payment identity.

**Shared-state obligations**
- Create one exact settlement/payment-operation context that J12/J28 continue.

### J12 — Complete Settlement

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/12-complete-settlement/v1.1-continuity-candidate.html`
- Spec: `prototypes/experience-workbench/journeys/12-complete-settlement/spec.md`
- Registry status: v1.1 / Golden #10 / design-approved

**Must preserve**
- Started → Sent/submitted → Waiting → Received/cleared → Confirmed → Closed remain distinct.
- External/manual payer marking sent does not close payment.
- Recipient confirmation remains separate where required.
- Wallet path advances only on verified provider/integration result fixture.
- Partial payment closes only confirmed part and leaves visible remainder.
- Unknown timeout is not failure and blocks replacement execution retry until reconciliation.
- Refresh is a read, never receipt/confirmation.
- Duplicate taps reopen/reconcile the current payment.
- Resulting balances are recomputed from underlying state.
- Saved record remains distinct from internal event acceptance.

**Shared-state obligations**
- Preserve payment ID, exact scope, method, source items and accepted result across every exit/back/recovery path.

## Stage 4 — Shell, account, activity and recovery

### J18 — Activity & Notifications

**Golden source**
- Spec: `prototypes/experience-workbench/journeys/18-activity-notifications/spec.md`
- Registry status: V1.1 / Golden #18 / design-approved

**Must preserve**
- ChopDot-only meaningful milestones, not provider/chain noise.
- `Needs your attention` separate from chronology.
- Activity is read-only and routes to canonical owner journeys.
- Unread delivery state != unresolved domain state.
- Notification open re-checks current canonical state/access.
- Filters change presentation only.
- No dead search surface.
- Exact currencies/assets remain separate.

**Shared-state obligations**
- Activity is a projection of the same domain fixture events created by the other journeys.

### J27 — Account & Preferences

**Golden source**
- Spec: `prototypes/experience-workbench/journeys/27-account-preferences/spec.md`
- Registry status: v1 / Golden #27 / design-approved

**Must preserve**
- Domains: profile identity; notification preference; appearance; security/session; account deletion.
- Display-name change does not rewrite participant identity/history.
- App notification preference is separate from OS permission.
- Appearance preview != persisted preference until Save succeeds.
- Current-session sign-out exists.
- Sign-out is not deletion.
- Account deletion has explicit prerequisites and typed confirmation.
- Unknown mutation results reconcile before replacement retry.
- Back/tabs/reload cannot manufacture saved/signed-out/deleted results.

**Shared-state obligations**
- Sign-out ends session fixture but preserves durable Participant/history data.
- Sign-out returns to the real J01 entry experience.

**V1 regression to forbid**
- A generic `You` page with only account-link controls and no sign-out/security/preferences workflow.

### J28 — Things Go Wrong / Recovery

**Golden source**
- Prototype: `prototypes/experience-workbench/journeys/28-failure-recovery/v1-candidate.html`
- Spec: `prototypes/experience-workbench/journeys/28-failure-recovery/spec.md`
- Registry status: v1 / Golden #28 / design-approved

**Must preserve**
- J28 owns shared recovery interaction grammar, not underlying domain result.
- Preserve original operation identity.
- Reconcile before replacement retry.
- Pre-effect failure differs from possible-effect uncertainty.
- Stale/conflict refreshes rather than overwrites.
- Cancellation request is not cancellation result.
- Partial stays partial.
- Duplicates are idempotent.
- Explicit stop preserves truth and resumable context.
- Adjacent authorities stay explicit.

**Shared-state obligations**
- Recovery receives the owning journey + exact operation/context and returns to that owner after a verified outcome or explicit safe stop.

## Remaining journeys

J03, J04, J09, J13–J17, J19–J26 are not yet authorized for V2 implementation simply by virtue of this file existing. Their Golden fidelity rows must be extracted from their canonical specs/artifacts before their implementation stage begins.

## Stage completion rule

A row is not `integrated` until all three are true:
1. its primary user path works through visible UI from an adjacent integrated journey;
2. automated Golden-fidelity assertions + viewport/browser checks pass;
3. human walkthrough confirms the integrated journey still feels like the approved ChopDot experience.
