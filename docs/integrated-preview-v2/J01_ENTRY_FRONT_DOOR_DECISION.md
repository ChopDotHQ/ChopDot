# J01 Entry Front Door — Human Gate A decision

Status: **SELECTED FOR BOUNDED PROTOTYPE ITERATION — Gate A remains unaccepted**

Date: 2026-09-17

Scope: J01 front-door and entry-mode product decision. This does **not** authorize production authentication, real funds/signing, Product Integrator, provider/rail selection, or Gate B.

## Why this note exists

During the Gate A human walkthrough, the prior J01 welcome surface was judged functional but not the right ChopDot front door. It behaved like a small marketing page, with feature rows and explanatory copy, rather than a simple product entry surface.

A second product decision followed: people should be able to enter and explore ChopDot locally as a guest before being asked to create an account. Account creation should happen when the person crosses into shared/collaborative use, such as inviting another person to split together.

Per the V2 stop rule, these decisions are recorded explicitly before changing the preview.

## Selected front door

Use this copy and hierarchy as the next bounded J01 prototype target:

**ChopDot**

*Share & chop.*

**[ Try as guest ]**

**[ Create account ]**

Already have an account? **Sign in**

### Product rule

> **The J01 front door is an entry surface, not a landing page.**

It should orient the person, express ChopDot in one short line, and let them choose how to enter.

## Entry modes

### 1. Try as guest

`Try as guest` enters a real local ChopDot experience without requiring authentication first.

Guest exploration should be able to support, at minimum, a bounded local-first experience such as:
- entering Home / orientation;
- creating local draft group state;
- adding and editing local draft expenses;
- trying split mechanics and seeing resulting local balances;
- understanding how ChopDot works before supplying an account identity.

Guest exploration must not pretend that local-only state is already shared, synced, recovered across devices, or authorized for money movement.

### 2. Create account

`Create account` begins the account-creation path.

The current J01 email-code and wallet verification work remains useful underneath this path, but the front door no longer exposes authentication mechanisms as the primary product choices.

The exact account-creation UX beyond the front door still requires a bounded design pass. The previous J01 new-person sequence (email → code → name → signed in) is an input, not automatically the final account-creation presentation.

### 3. Sign in

`Sign in` is for an existing account and should preserve the existing verified-session, subject-binding, destination, restart/freshness and recovery protections already established in J01.

Email and wallet may appear as sign-in/account methods one level down rather than on the product front door.

## Account boundary for a local guest

A local guest should not be forced to create an account merely to inspect the product or create local draft data.

The account requirement should appear when an action actually needs a durable shared identity/capability. The first intended boundary is:

> **Invite someone / begin sharing a locally created group with another person.**

At that boundary ChopDot should explain the immediate reason for the account and preserve the person's local work through the transition.

Conceptually:

`Try as guest → explore locally → create draft group/expenses → Invite someone → Create account → preserve local state → share/invite`

No locally created work should disappear merely because the guest creates an account.

## Guest distinction

There are two different guest situations internally and they must not be conflated:

1. **Local explorer guest** — has not entered a shared group; state may remain local/draft-only.
2. **Guest participant from an invite** — explicitly joins another person's group through the invite flow and receives the stable Participant/MemberIdentity semantics already established by GUEST-01.

If an invite guest later creates/links an account, the same participant/history must survive; account linkage must not manufacture a new person or rewrite prior group history.

The UI does not need to expose these internal labels.

## Preserve underneath the new entry model

The following established semantics remain in force unless separately reviewed:

- Signing in never automatically joins a group or authorizes payment.
- Invite context survives the relevant entry/account flow.
- Stable Participant identity is preserved when a guest participant later links an account.
- Session state remains separate from durable Participant/history identity.
- Subject/provenance/freshness protections remain unchanged for authenticated paths.
- Failure/recovery states remain explicit.
- Wallet/payment authority is not implied by account creation or sign-in.

## Remove from the default welcome surface

- `Bring your people.` feature row
- `Keep things clear.` feature row
- `Start with an email. No wallet needed.` explanatory line
- email/wallet as first-level product choices
- `Demo` / reviewer controls in normal product mode
- general product-marketing explanation

## Contextual entry exception

When ChopDot is opened from meaningful context such as a group invitation, a small amount of context-specific information may appear because it changes the person's immediate decision.

The invitation path must continue to support reviewing/continuing without requiring a full account first, consistent with the approved guest-participant direction.

## Visual questions still intentionally open

The copy/hierarchy above is selected. A bounded visual prototype may still compare:
- vertical positioning and whitespace;
- centered versus top-aligned wordmark;
- visual weight of `Try as guest` versus `Create account`;
- exact treatment of the tertiary `Sign in` action;
- invite-context presentation.

These are presentation questions only and must not silently alter the entry/account authority model.

## Acceptance condition

Gate A remains unaccepted until:

1. the selected minimal front door is prototyped;
2. the guest entry path reaches a believable local ChopDot experience without fake shared/account authority;
3. `Create account` and `Sign in` are distinguishable and coherent;
4. existing J01 identity/security semantics remain intact for authenticated paths;
5. screenshots are re-captured at the canonical mobile viewports;
6. the front door and guest/account transition are re-checked against the UX Laws;
7. Devinson confirms the resulting entry experience feels like the right ChopDot front door.
